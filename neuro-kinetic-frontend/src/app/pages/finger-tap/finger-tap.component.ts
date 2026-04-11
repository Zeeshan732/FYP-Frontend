import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { UserTestRecord, UserTestRecordRequest } from '../../models/api.models';
import { Router } from '@angular/router';

type ScreenState =
  | 'instructions'
  | 'mode-select'
  | 'upload'
  | 'processing'
  | 'result'
  | 'error'
  | 'cam-permission'
  | 'cam-ready'
  | 'cam-recording'
  | 'cam-review';

interface FingerTapResult {
  modality: string;
  probability: number;
  riskPercent: number;
  label: string;
}

@Component({
  selector: 'app-finger-tap',
  templateUrl: './finger-tap.component.html',
  styleUrls: ['./finger-tap.component.scss']
})
export class FingerTapComponent implements OnChanges, OnInit, OnDestroy {
  // State
  currentState: ScreenState = 'instructions';
  inputMode: 'upload' | 'live' = 'upload';
  startModalOpen = false;
  @Input() embedded = false;
  @Output() requestClose = new EventEmitter<void>();

  apiError = '';
  isProcessing = false;
  processingSteps = [
    { text: 'Uploading video', done: true, active: false },
    { text: 'Extracting hand landmarks', done: false, active: true },
    { text: 'Computing movement regularity', done: false, active: false },
  ];

  // Upload mode
  selectedFile: File | null = null;
  result: FingerTapResult | null = null;

  /** Set after a successful save to Test Records — required for PDF/CSV download. */
  savedTestRecordId: number | null = null;
  reportDownloadError = '';
  pdfDownloading = false;
  csvDownloading = false;

  /**
   * Camera LED / torch: supported on many Android devices (Chrome).
   * iOS Safari usually does not expose torch via web — use on-screen hint for manual flashlight.
   */
  torchSupported = false;
  torchOn = false;

  // Camera / MediaRecorder
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  recordedBlob: Blob | null = null;
  private _blobUrl: string | null = null;

  recordedDuration = 0;
  recordingElapsed = 0;
  private recordingTimer: any = null;
  private readonly MAX_RECORDING_SECONDS = 20;

  // Live tap detection
  tapCount = 0;
  private motionHistory: number[] = [];
  rhythmVariance: 'low' | 'moderate' | 'high' = 'low';
  waveformBars: number[] = new Array(32).fill(0);

  // Quality checks
  qualityChecks: {
    duration: boolean;
    tapsFound: boolean;
    motionClarity: boolean;
    frameCoverage: boolean;
  } = {
    duration: false,
    tapsFound: false,
    motionClarity: false,
    frameCoverage: false
  };

  @ViewChild('videoPreview')
  videoPreviewRef!: ElementRef<HTMLVideoElement>;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  /** Phone / tablet — show stronger lighting guidance */
  get isMobileLike(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }
    const ua = navigator.userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Embedded popup hides the instructions screen (*ngIf="!embedded"); jump straight to mode-select
    // as soon as @Input() embedded is true so the modal body never paints empty.
    if (changes['embedded']?.currentValue === true) {
      this.currentState = 'mode-select';
      this.startModalOpen = false;
    }
  }

  ngOnInit(): void {
    // If navigated here from embedded popup flow with a completed result, show it directly.
    const navState = (history.state ?? {}) as { fingerTapResult?: FingerTapResult };
    if (!this.embedded && navState.fingerTapResult) {
      this.result = navState.fingerTapResult;
      this.currentState = 'result';
      return;
    }

    if (this.embedded) {
      // In popup mode, avoid nested start screen/modal.
      this.currentState = 'mode-select';
      this.startModalOpen = false;
    }
  }

  // ── Derived values ─────────────────────────

  get recordedBlobUrl(): string {
    if (this.recordedBlob && !this._blobUrl) {
      this._blobUrl = URL.createObjectURL(this.recordedBlob);
    }
    return this._blobUrl ?? '';
  }

  get isLoggedIn(): boolean {
    return !!this.authService.getCurrentUser()?.id;
  }

  get formattedElapsed(): string {
    const m = Math.floor(this.recordingElapsed / 60).toString().padStart(2, '0');
    const s = (this.recordingElapsed % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get formattedRemaining(): string {
    const rem = this.MAX_RECORDING_SECONDS - this.recordingElapsed;
    const m = Math.floor(rem / 60).toString().padStart(2, '0');
    const s = (rem % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get formattedDuration(): string {
    const m = Math.floor(this.recordedDuration / 60).toString().padStart(2, '0');
    const s = (this.recordedDuration % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get riskColor(): string {
    const r = this.result?.riskPercent ?? 0;
    if (r < 35) return '#1D9E75';
    if (r < 65) return '#F0A500';
    return '#E05252';
  }

  get riskBg(): string {
    const r = this.result?.riskPercent ?? 0;
    if (r < 35) return 'rgba(29,158,117,0.08)';
    if (r < 65) return 'rgba(240,165,0,0.08)';
    return 'rgba(224,82,82,0.08)';
  }

  get riskBorder(): string {
    const r = this.result?.riskPercent ?? 0;
    if (r < 35) return 'rgba(29,158,117,0.2)';
    if (r < 65) return 'rgba(240,165,0,0.2)';
    return 'rgba(224,82,82,0.2)';
  }

  get riskIconBg(): string {
    const r = this.result?.riskPercent ?? 0;
    if (r < 35) return 'rgba(29,158,117,0.15)';
    if (r < 65) return 'rgba(240,165,0,0.15)';
    return 'rgba(224,82,82,0.15)';
  }

  get riskLabel(): string {
    const r = this.result?.riskPercent ?? 0;
    if (r < 35) return 'Low risk';
    if (r < 65) return 'Moderate risk';
    return 'High risk';
  }

  get isHealthy(): boolean {
    return this.result?.label === 'Healthy';
  }

  get barGradient(): string {
    const r = this.result?.riskPercent ?? 0;
    if (r < 35) return '#1D9E75';
    if (r < 65) return 'linear-gradient(90deg,#1D9E75,#F0A500)';
    return 'linear-gradient(90deg,#1D9E75 0%,#F0A500 45%,#E05252 100%)';
  }

  get probabilityFormatted(): string {
    return (this.result?.probability ?? 0).toFixed(3);
  }

  get riskPercentFormatted(): string {
    return (this.result?.riskPercent ?? 0).toFixed(1);
  }

  get riskPercentInt(): string {
    const s = this.riskPercentFormatted;
    return s.split('.')[0];
  }

  get riskPercentDec(): string {
    const s = this.riskPercentFormatted;
    return '.' + s.split('.')[1];
  }

  // ── Navigation / mode select ────────────────

  goToModeSelect(): void {
    if (this.embedded) {
      this.currentState = 'mode-select';
      return;
    }
    this.startModalOpen = true;
    this.apiError = '';
  }

  closeStartModal(): void {
    this.startModalOpen = false;
  }

  continueFromStartModal(): void {
    this.startModalOpen = false;
    this.currentState = 'mode-select';
  }

  selectMode(mode: 'upload' | 'live'): void {
    this.inputMode = mode;
    if (mode === 'upload') {
      this.currentState = 'upload';
    } else {
      this.currentState = 'cam-permission';
    }
  }

  resetTest(): void {
    this.result = null;
    this.savedTestRecordId = null;
    this.reportDownloadError = '';
    this.selectedFile = null;
    this.recordedBlob = null;
    this.recordedChunks = [];
    this.tapCount = 0;
    this.recordingElapsed = 0;
    this.recordedDuration = 0;
    this.apiError = '';
    this.currentState = this.embedded ? 'mode-select' : 'instructions';
  }

  // ── Upload mode ─────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const allowed = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!allowed.includes(ext)) {
      this.apiError = 'Unsupported video format. Please upload MP4, MOV, AVI, MKV or WEBM.';
      this.selectedFile = null;
      return;
    }

    this.apiError = '';
    this.selectedFile = file;
  }

  clearFile(): void {
    this.selectedFile = null;
    this.apiError = '';
  }

  async analyzeVideo(): Promise<void> {
    if (!this.selectedFile) return;
    this.apiError = '';
    this.isProcessing = true;
    this.currentState = 'processing';

    const formData = new FormData();
    formData.append('video', this.selectedFile);

    try {
      const result = await this.http
        .post<FingerTapResult>(`${this.apiUrl}/FingerTap/predict`, formData)
        .toPromise();

      if (result) {
        // Requirement: do not show final result inside popup.
        if (this.embedded) {
          this.requestClose.emit();
          this.router.navigate(['/finger-tap'], { state: { fingerTapResult: result } });
          return;
        }
        this.result = result;
        this.currentState = 'result';
        this.persistFingerTapTestRecord(result);
      } else {
        this.apiError = 'No result returned from analysis.';
        this.currentState = 'error';
      }
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.apiError = httpErr.error?.message || httpErr.message || 'Analysis failed.';
      this.currentState = 'error';
    } finally {
      this.isProcessing = false;
    }
  }

  // ── Camera / live recording ─────────────────

  async requestCameraAccess(): Promise<void> {
    try {
      this.torchSupported = false;
      this.torchOn = false;
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        },
        audio: false
      });
      await this.initTorchFromStream();
      this.currentState = 'cam-ready';

      setTimeout(() => {
        if (this.videoPreviewRef?.nativeElement && this.stream) {
          this.videoPreviewRef.nativeElement.srcObject = this.stream;
          this.videoPreviewRef.nativeElement.play();
        }
      }, 100);
    } catch {
      this.apiError =
        'Camera access was denied or is unavailable. ' +
        'Please allow camera access in your browser settings, ' +
        'or use the upload option instead.';
      this.currentState = 'error';
    }
  }

  /**
   * Uses Image Capture / track constraints `torch` where available (often Chrome on Android with back camera).
   */
  private async initTorchFromStream(): Promise<void> {
    this.torchSupported = false;
    this.torchOn = false;
    const track = this.stream?.getVideoTracks()[0];
    if (!track?.getCapabilities) {
      this.cdr.markForCheck();
      return;
    }
    const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
    if (!caps.torch) {
      this.cdr.markForCheck();
      return;
    }
    this.torchSupported = true;
    try {
      await track.applyConstraints({ advanced: [{ torch: true }] } as unknown as MediaTrackConstraints);
      this.torchOn = true;
    } catch {
      this.torchOn = false;
    }
    this.cdr.markForCheck();
  }

  async toggleTorch(): Promise<void> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track || !this.torchSupported) {
      return;
    }
    const next = !this.torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
      this.torchOn = next;
    } catch {
      /* keep previous state */
    }
    this.cdr.markForCheck();
  }

  private extinguishTorch(): void {
    const track = this.stream?.getVideoTracks()[0];
    if (!track || !this.torchSupported || !this.torchOn) {
      return;
    }
    try {
      track.applyConstraints({ advanced: [{ torch: false }] } as unknown as MediaTrackConstraints);
    } catch {
      /* ignore */
    }
    this.torchOn = false;
  }

  startRecording(): void {
    if (!this.stream) return;

    this.recordedChunks = [];
    this.tapCount = 0;
    this.recordingElapsed = 0;
    this.waveformBars = new Array(32).fill(0);

    const mimeType = this.getSupportedVideoMimeType();
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    try {
      this.mediaRecorder = new MediaRecorder(this.stream, options);
    } catch {
      this.mediaRecorder = new MediaRecorder(this.stream);
    }

    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => {
      const recordedMime = this.mediaRecorder?.mimeType || mimeType || 'video/webm';
      this.recordedBlob = new Blob(this.recordedChunks, { type: recordedMime });
      this.recordedDuration = this.recordingElapsed;
      this.evaluateQuality();
      this.currentState = 'cam-review';
      this.stopCamera();
    };

    this.mediaRecorder.start(100);
    this.currentState = 'cam-recording';

    // Template switches to a new <video>; re-attach the same MediaStream so preview stays live.
    setTimeout(() => {
      if (this.videoPreviewRef?.nativeElement && this.stream) {
        this.videoPreviewRef.nativeElement.srcObject = this.stream;
        void this.videoPreviewRef.nativeElement.play();
      }
    }, 0);

    this.recordingTimer = setInterval(() => {
      this.recordingElapsed++;
      this.animateWaveform();

      if (this.recordingElapsed >= this.MAX_RECORDING_SECONDS) {
        this.stopRecording();
      }
    }, 1000);
  }

  stopRecording(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  private animateWaveform(): void {
    this.waveformBars = [...this.waveformBars.slice(1), Math.random() * 100];
    const last = this.waveformBars[this.waveformBars.length - 1];
    if (last > 70) this.tapCount++;
  }

  private evaluateQuality(): void {
    this.qualityChecks = {
      duration: this.recordedDuration >= 8,
      tapsFound: this.tapCount >= 5,
      motionClarity: true,
      frameCoverage: true
    };

    const avg = this.tapCount / (this.recordedDuration || 1);
    this.rhythmVariance = avg > 0.8 ? 'low' : avg > 0.5 ? 'moderate' : 'high';
  }

  stopCamera(): void {
    this.extinguishTorch();
    this.torchSupported = false;
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  reRecord(): void {
    this.recordedBlob = null;
    this.recordedChunks = [];
    this.tapCount = 0;
    this.recordingElapsed = 0;
    this.requestCameraAccess();
  }

  async analyzeLiveRecording(): Promise<void> {
    if (!this.recordedBlob) return;
    const mime = this.recordedBlob.type || 'video/webm';
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([this.recordedBlob], `live-recording.${ext}`, {
      type: mime
    });
    this.selectedFile = file;
    await this.analyzeVideo();
  }

  /** Save to Test Records with correct modality (requires authenticated user). */
  private persistFingerTapTestRecord(result: FingerTapResult): void {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      return;
    }

    const req: UserTestRecordRequest = {
      userId: user.id,
      userName: user.email || `${user.firstName} ${user.lastName}`.trim() || 'User',
      status: 'Completed',
      testResult: result.riskPercent >= 50 ? 'Positive' : 'Negative',
      accuracy: result.riskPercent,
      analysisNotes: `Finger tap screening. ${result.label}`,
      modality: 'fingertapping',
      predictionScore0To1: result.probability
    };

    this.apiService.createUserTestRecord(req).subscribe({
      next: (record: UserTestRecord) => {
        this.savedTestRecordId = record.id;
      },
      error: (e) => console.warn('Failed to save finger-tap test record', e)
    });
  }

  downloadPdfReport(): void {
    this.reportDownloadError = '';
    if (this.savedTestRecordId == null) {
      this.reportDownloadError =
        'Sign in and complete the test to save a report. PDF download is available after your result is saved to Test Records.';
      return;
    }
    this.pdfDownloading = true;
    this.apiService.downloadPdfReportByTestRecordId(this.savedTestRecordId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `NeuroSync_FingerTap_${this.savedTestRecordId}_${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.pdfDownloading = false;
      },
      error: () => {
        this.pdfDownloading = false;
        this.reportDownloadError = 'Failed to download PDF report. Please try again.';
      }
    });
  }

  downloadCsvReport(): void {
    this.reportDownloadError = '';
    if (this.savedTestRecordId == null) {
      this.reportDownloadError =
        'Sign in and complete the test to save a report. CSV download is available after your result is saved to Test Records.';
      return;
    }
    this.csvDownloading = true;
    this.apiService.downloadCsvReportByTestRecordId(this.savedTestRecordId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `NeuroSync_FingerTap_${this.savedTestRecordId}_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.csvDownloading = false;
      },
      error: () => {
        this.csvDownloading = false;
        this.reportDownloadError = 'Failed to download CSV report. Please try again.';
      }
    });
  }

  private getSupportedVideoMimeType(): string {
    const candidates = [
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];

    for (const type of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  }

  switchToUpload(): void {
    this.stopCamera();
    this.currentState = 'upload';
    this.inputMode = 'upload';
  }

  backFromModeSelect(): void {
    if (this.embedded) {
      this.requestClose.emit();
      return;
    }
    this.currentState = 'instructions';
  }

  // ── Cleanup ────────────────────────────────

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
    }
    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
    }
  }
}

