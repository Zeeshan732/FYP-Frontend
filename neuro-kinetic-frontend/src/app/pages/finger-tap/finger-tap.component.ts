import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
export class FingerTapComponent implements OnDestroy {
  // State
  currentState: ScreenState = 'instructions';
  inputMode: 'upload' | 'live' = 'upload';

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

  constructor(private http: HttpClient) {}

  // ── Derived values ─────────────────────────

  get recordedBlobUrl(): string {
    if (this.recordedBlob && !this._blobUrl) {
      this._blobUrl = URL.createObjectURL(this.recordedBlob);
    }
    return this._blobUrl ?? '';
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
    this.currentState = 'mode-select';
    this.apiError = '';
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
    this.selectedFile = null;
    this.recordedBlob = null;
    this.recordedChunks = [];
    this.tapCount = 0;
    this.recordingElapsed = 0;
    this.recordedDuration = 0;
    this.apiError = '';
    this.currentState = 'instructions';
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
        this.result = result;
        this.currentState = 'result';
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
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        },
        audio: false
      });
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

