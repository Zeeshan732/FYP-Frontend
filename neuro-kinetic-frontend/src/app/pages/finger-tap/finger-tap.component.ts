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
import {
  HttpClient,
  HttpErrorResponse,
  HttpEventType,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { filter, map, tap, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { UserTestRecord, UserTestRecordRequest } from '../../models/api.models';
import { Router } from '@angular/router';
import { FingerTapVideoPrepService } from '../../services/finger-tap-video-prep.service';
import { jsPDF } from 'jspdf';

type ScreenState =
  | 'instructions'
  | 'mode-select'
  | 'upload'
  | 'compressing'
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

  /** Shown on the loader only while the video is uploading (not during ML analysis) */
  readonly fingerTapUploadCareHints = [
    'Stay seated and keep the phone steady until the upload bar reaches 100%.',
    'Avoid switching apps or locking the screen — that can interrupt the upload.',
    'Use Wi‑Fi if possible; if upload fails, wait a moment and try analyzing again.',
  ];

  // Upload mode
  selectedFile: File | null = null;
  /** Populated after metadata load — used to decide FFmpeg pre-upload compression */
  selectedVideoDurationSec: number | null = null;
  uploadValidationError = '';
  /** 0–100 while uploading multipart */
  uploadProgressPercent = 0;
  /** Client-side transcode (FFmpeg.wasm) before API — avoids IIS ~28MB 413s */
  compressionProgress = 0;
  compressionPhase = '';
  compressionOriginalMb = '';
  compressionResultMb = '';
  /** File actually sent to API (may differ from selectedFile after optimization) */
  private preparedUploadFile: File | null = null;

  result: FingerTapResult | null = null;

  /** Set after a successful save to Test Records (server-side reports). Client PDF/CSV use `result` directly. */
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
  /** From MediaStream track (when exposed); sent with upload to override bogus container FPS */
  private recordingVideoFrameRate: number | null = null;
  /** Optional multipart hints for live recordings — forwarded to ML for FPS resolution */
  private fingerTapUploadHints: { fps?: string; duration?: string; tap_count?: string } | null = null;
  /** Live capture: at least 10s; auto-stop allows up to 40s for ~30s-style clips. */
  readonly MIN_RECORDING_SECONDS = 10;
  readonly MAX_RECORDING_SECONDS = 40;

  // Live tap detection & preview metrics (portrait ROI — same idea as ML service)
  tapCount = 0;
  /** Rolling window of per-frame motion norms (after calibration) for smoothed UI feedback */
  private motionNormHistory: number[] = [];
  rhythmVariance: 'low' | 'moderate' | 'high' = 'low';
  waveformBars: number[] = new Array(32).fill(0);

  /** Mean luminance 0–255 of the portrait ROI (for user guidance). */
  liveBrightness = 0;
  /** True when ROI is darker than the ML brightness gate (~50 on 0–255). */
  brightnessLow = false;
  /** Normalized motion 0+ (for waveform); based on mean absdiff in ROI vs baseline. */
  private lastMotionNorm = 0;
  /** User-facing: motion clearly above baseline (tapping likely). */
  tappingActive = false;
  private previewRaf: number | null = null;
  private metricsCanvas: HTMLCanvasElement | null = null;
  private metricsCtx: CanvasRenderingContext2D | null = null;
  private prevGrayBuf: Uint8Array | null = null;
  private grayBuf: Uint8Array | null = null;
  private calibrationFrameIndex = 0;
  private readonly CALIBRATION_FRAMES = 45;
  private readonly MOTION_NORM_HISTORY_LEN = 25;
  /** Hysteresis: turn "tapping" UI on above this rolling average; off below the lower threshold */
  private readonly TAPPING_HYST_ON = 1.1;
  private readonly TAPPING_HYST_OFF = 0.7;
  private baselineMotion = 1e-6;
  private lastTapCrossTime = 0;

  /** Recording overlay: debounced copy for the tapping status flag (max ~1 update / 2s) */
  debouncedTapFlagText = '';
  debouncedTapFlagVariant: 'calibrating' | 'ok' | 'warn' = 'calibrating';
  private lastDebouncedTapFlagAt = 0;

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
    private cdr: ChangeDetectorRef,
    private fingerTapVideoPrep: FingerTapVideoPrepService
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

  /** 0–100 fill for the recording progress track (auto-stop at MAX_RECORDING_SECONDS) */
  get recordingProgressPercent(): number {
    return Math.min(100, (this.recordingElapsed / this.MAX_RECORDING_SECONDS) * 100);
  }

  /** Replaces the old “motion peaks + countdown” line with calmer, phase-based copy */
  get recordingFooterText(): string {
    if (this.currentState !== 'cam-recording') {
      return '';
    }
    if (this.tapCount < 5) {
      return 'Calibrating... tap index finger to thumb';
    }
    if (this.recordingElapsed >= this.MAX_RECORDING_SECONDS - 5) {
      return `Almost done — ${this.tapCount} taps recorded`;
    }
    return `${this.tapCount} taps recorded so far`;
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
    this.preparedUploadFile = null;
    this.selectedVideoDurationSec = null;
    this.uploadValidationError = '';
    this.uploadProgressPercent = 0;
    this.compressionProgress = 0;
    this.compressionPhase = '';
    this.compressionOriginalMb = '';
    this.compressionResultMb = '';
    this.recordedBlob = null;
    this.recordedChunks = [];
    this.tapCount = 0;
    this.recordingElapsed = 0;
    this.recordedDuration = 0;
    this.fingerTapUploadHints = null;
    this.recordingVideoFrameRate = null;
    this.apiError = '';
    this.currentState = this.embedded ? 'mode-select' : 'instructions';
  }

  // ── Upload mode ─────────────────────────────

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    this.uploadValidationError = '';
    this.selectedVideoDurationSec = null;
    this.preparedUploadFile = null;
    this.apiError = '';

    const v = this.fingerTapVideoPrep.validateExtension(file);
    if (!v.ok) {
      this.uploadValidationError = v.errors.join(' ');
      this.selectedFile = null;
      input.value = '';
      this.cdr.markForCheck();
      return;
    }
    try {
      const d = await this.fingerTapVideoPrep.getVideoDurationSec(file);
      this.selectedVideoDurationSec = d;
    } catch {
      this.selectedVideoDurationSec = null;
    }

    this.selectedFile = file;
    this.cdr.markForCheck();
  }

  clearFile(): void {
    this.selectedFile = null;
    this.preparedUploadFile = null;
    this.selectedVideoDurationSec = null;
    this.uploadValidationError = '';
    this.apiError = '';
  }

  get canSubmitUpload(): boolean {
    return !!this.selectedFile && !this.uploadValidationError && !this.isProcessing;
  }

  private extractHttpErrorMessage(err: HttpErrorResponse): string {
    const e = err.error;
    if (typeof e === 'string' && e.trim()) {
      return e.trim();
    }
    if (e && typeof e === 'object' && 'message' in e && (e as { message?: unknown }).message != null) {
      return String((e as { message: unknown }).message);
    }
    return err.message || 'Analysis failed.';
  }

  /** Map ML/API strings to clear, actionable copy (upload + live). */
  private mapFingerTapError(raw: string): string {
    const t = raw.trim();
    if (
      t.includes('Too dark') ||
      t.includes('No clear tapping') ||
      t.includes('Almost no movement') ||
      t.includes('Could not analyze this video')
    ) {
      return t;
    }
    if (t.includes('Invalid video') || t.includes('Required activity not detected')) {
      return (
        'No clear tapping pattern was found. Film in portrait with good light, keep your hand centered, ' +
        'and tap index finger to thumb steadily for the full recording.'
      );
    }
    if (t.includes('taps_per_second') || t.toLowerCase().includes('fps')) {
      return (
        'Video timing could not be read reliably. Please tap Analyze again, or re-record. ' +
        'If this keeps happening, try uploading a short MP4 from your gallery instead of live capture.'
      );
    }
    return t;
  }

  async analyzeVideo(): Promise<void> {
    if (!this.selectedFile || this.uploadValidationError) {
      return;
    }
    this.apiError = '';
    this.isProcessing = true;
    this.uploadProgressPercent = 0;
    this.preparedUploadFile = null;

    let file = this.selectedFile;
    const duration = this.selectedVideoDurationSec;

    try {
      if (this.fingerTapVideoPrep.shouldCompressApprox(file, duration)) {
        this.currentState = 'compressing';
        this.compressionProgress = 0;
        this.compressionPhase = 'Video is large — optimizing for upload…';
        this.compressionOriginalMb = this.fingerTapVideoPrep.fmtMb(file.size);
        this.compressionResultMb = '';
        this.cdr.markForCheck();

        try {
          file = await this.fingerTapVideoPrep.compressForUpload(file, (ratio, label) => {
            this.compressionProgress = Math.round(ratio * 100);
            this.compressionPhase = label;
            this.cdr.markForCheck();
          });
          this.compressionResultMb = this.fingerTapVideoPrep.fmtMb(file.size);
        } catch (encErr) {
          console.error('Finger-tap FFmpeg compression failed — uploading original file', encErr);
          // `file` stays as selectedFile; browser-side encoding often fails on mobile despite valid clips.
        }
      }
      this.preparedUploadFile = file;

      this.currentState = 'processing';
      this.processingSteps = [
        { text: 'Uploading video', done: false, active: true },
        { text: 'Extracting hand landmarks', done: false, active: false },
        { text: 'Computing movement regularity', done: false, active: false }
      ];
      this.cdr.markForCheck();

      const result = await this.uploadFingerTapWithRetries(file);

      if (result) {
        this.processingSteps = [
          { text: 'Uploading video', done: true, active: false },
          { text: 'Extracting hand landmarks', done: true, active: false },
          { text: 'Computing movement regularity', done: true, active: false }
        ];
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
      this.apiError = this.mapUploadFailure(err);
      this.currentState = 'error';
    } finally {
      this.isProcessing = false;
      this.uploadProgressPercent = 0;
      this.fingerTapUploadHints = null;
    }
  }

  /** Upload with progress + retries (transient network only — not 413/400). */
  private async uploadFingerTapWithRetries(file: File): Promise<FingerTapResult | null> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await this.postFingerTapMultipart(file);
      } catch (err) {
        lastErr = err;
        const httpErr = err as HttpErrorResponse;
        if (httpErr.status === 413 && attempt === 0 && this.selectedFile) {
          this.currentState = 'compressing';
          this.compressionPhase = 'Video file too large — applying stronger compression…';
          this.cdr.markForCheck();
          try {
            const compressed = await this.fingerTapVideoPrep.compressForUpload(
              file,
              (r, l) => {
                this.compressionProgress = Math.round(r * 100);
                this.compressionPhase = l;
                this.cdr.markForCheck();
              },
              { aggressive: true }
            );
            file = compressed;
            this.preparedUploadFile = compressed;
            this.currentState = 'processing';
            continue;
          } catch {
            throw err;
          }
        }
        if (httpErr.status === 413) {
          throw err;
        }
        if (httpErr.status === 400 || httpErr.status === 401 || httpErr.status === 403) {
          throw err;
        }
        if ((err as Error)?.name === 'TimeoutError') {
          if (attempt >= 3) {
            throw err;
          }
        } else if (httpErr.status >= 400 && httpErr.status < 500 && httpErr.status !== 408) {
          throw err;
        }
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 2000 * 2 ** attempt));
        }
      }
    }
    throw lastErr;
  }

  private async postFingerTapMultipart(file: File): Promise<FingerTapResult> {
    const formData = new FormData();
    const lower = file.name.toLowerCase();
    const name =
      lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')
        ? file.name
        : file.type.includes('mp4')
          ? 'finger-tap-upload.mp4'
          : 'finger-tap-upload.webm';
    formData.append('video', file, name);
    const h = this.fingerTapUploadHints;
    if (h?.duration) {
      formData.append('duration', h.duration);
    }
    if (h?.fps) {
      formData.append('fps', h.fps);
    }
    if (h?.tap_count) {
      formData.append('tap_count', h.tap_count);
    }

    const req = new HttpRequest('POST', `${this.apiUrl}/FingerTap/predict`, formData, {
      reportProgress: true,
      responseType: 'json'
    });

    return firstValueFrom(
      this.http.request<FingerTapResult>(req).pipe(
        tap(event => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadProgressPercent = Math.round((100 * event.loaded) / event.total);
            this.cdr.markForCheck();
          }
        }),
        timeout(120000),
        filter((e): e is HttpResponse<FingerTapResult> => e.type === HttpEventType.Response),
        map(e => {
          const b = e.body;
          if (!b) {
            throw new Error('No result returned from analysis.');
          }
          return b;
        })
      )
    );
  }

  private mapUploadFailure(err: unknown): string {
    if ((err as Error)?.name === 'TimeoutError') {
      return 'Upload timed out. Check your connection and try again.';
    }
    const httpErr = err as HttpErrorResponse;
    if (httpErr.status === 0) {
      return 'Upload failed. Check your connection and try again.';
    }
    if (httpErr.status === 413) {
      return (
        'Video file too large for the server even after optimization. Please record a shorter clip ' +
        '(under 15 seconds) or lower camera quality, then try again.'
      );
    }
    return this.mapFingerTapError(this.extractHttpErrorMessage(httpErr));
  }

  // ── Camera / live recording ─────────────────

  async requestCameraAccess(): Promise<void> {
    try {
      this.stopPreviewLoop();
      this.torchSupported = false;
      this.torchOn = false;
      this.resetLiveMetrics();

      /** Rear-facing camera films the hand from phone placement; front camera is wrong for this test. */
      const portraitConstraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 720, min: 480 },
          height: { ideal: 1280, min: 720 },
          aspectRatio: { ideal: 9 / 16 }
        },
        audio: false
      };

      try {
        this.stream = await navigator.mediaDevices.getUserMedia(portraitConstraints);
      } catch {
        try {
          this.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false
          });
        } catch {
          this.stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 720 },
              height: { ideal: 1280 }
            },
            audio: false
          });
        }
      }

      const track = this.stream.getVideoTracks()[0];
      if (track?.applyConstraints) {
        try {
          await track.applyConstraints({
            aspectRatio: { ideal: 9 / 16 },
            width: { ideal: 720 },
            height: { ideal: 1280 }
          });
        } catch {
          /* device may ignore — backend still crops portrait ROI */
        }
      }

      await this.initTorchFromStream();
      this.currentState = 'cam-ready';

      setTimeout(() => {
        const el = this.videoPreviewRef?.nativeElement;
        if (el && this.stream) {
          el.srcObject = this.stream;
          el.playsInline = true;
          el.muted = true;
          const onReady = () => {
            this.resetLiveMetrics();
            void el.play().then(() => this.startPreviewLoop());
          };
          if (el.readyState >= 1) {
            onReady();
          } else {
            el.onloadedmetadata = () => onReady();
          }
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

  /** Center 9:16 crop in pixel space (matches ML portrait ROI for landscape streams). */
  private getPortraitCropRect(videoWidth: number, videoHeight: number): { x: number; y: number; w: number; h: number } {
    const w = videoWidth;
    const h = videoHeight;
    if (w > h) {
      const tw = Math.round((h * 9) / 16);
      if (tw >= w) {
        const th = Math.round((w * 16) / 9);
        const y0 = Math.max(0, Math.floor((h - th) / 2));
        return { x: 0, y: y0, w, h: th };
      }
      const x0 = Math.max(0, Math.floor((w - tw) / 2));
      return { x: x0, y: 0, w: tw, h: h };
    }
    return { x: 0, y: 0, w, h };
  }

  private resetLiveMetrics(): void {
    this.liveBrightness = 0;
    this.brightnessLow = false;
    this.lastMotionNorm = 0;
    this.tappingActive = false;
    this.motionNormHistory = [];
    this.calibrationFrameIndex = 0;
    this.baselineMotion = 1e-6;
    this.lastTapCrossTime = 0;
    this.prevGrayBuf = null;
    this.grayBuf = null;
    this.debouncedTapFlagText = '';
    this.debouncedTapFlagVariant = 'calibrating';
    this.lastDebouncedTapFlagAt = 0;
  }

  private startPreviewLoop(): void {
    this.stopPreviewLoop();
    const tick = (): void => {
      this.previewRaf = requestAnimationFrame(tick);
      this.sampleVideoFrame();
    };
    this.previewRaf = requestAnimationFrame(tick);
  }

  private stopPreviewLoop(): void {
    if (this.previewRaf != null) {
      cancelAnimationFrame(this.previewRaf);
      this.previewRaf = null;
    }
  }

  private sampleVideoFrame(): void {
    if (!this.stream) {
      return;
    }
    const v = this.videoPreviewRef?.nativeElement;
    if (!v || v.readyState < 2) {
      return;
    }
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    if (vw < 32 || vh < 32) {
      return;
    }

    if (!this.metricsCanvas) {
      this.metricsCanvas = document.createElement('canvas');
      this.metricsCtx = this.metricsCanvas.getContext('2d', { willReadFrequently: true });
    }
    const ctx = this.metricsCtx;
    if (!ctx) {
      return;
    }

    const crop = this.getPortraitCropRect(vw, vh);
    const cw = 160;
    const ch = Math.round((cw * 16) / 9);
    this.metricsCanvas.width = cw;
    this.metricsCanvas.height = ch;
    ctx.drawImage(v, crop.x, crop.y, crop.w, crop.h, 0, 0, cw, ch);

    const img = ctx.getImageData(0, 0, cw, ch);
    const data = img.data;
    const n = cw * ch;
    if (!this.grayBuf || this.grayBuf.length !== n) {
      this.grayBuf = new Uint8Array(n);
      this.prevGrayBuf = new Uint8Array(n);
    }

    let lum = 0;
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const g = Math.round(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
      this.grayBuf[i] = g;
      lum += g;
    }
    this.liveBrightness = lum / n;
    this.brightnessLow = this.liveBrightness < 50;

    let motion = 0;
    this.calibrationFrameIndex++;
    if (this.calibrationFrameIndex === 1) {
      this.prevGrayBuf!.set(this.grayBuf);
      this.lastMotionNorm = 0;
      this.tappingActive = false;
      this.cdr.markForCheck();
      return;
    }

    for (let i = 0; i < n; i++) {
      motion += Math.abs(this.grayBuf[i] - this.prevGrayBuf![i]);
    }
    motion /= n;
    this.prevGrayBuf!.set(this.grayBuf);

    if (this.calibrationFrameIndex <= this.CALIBRATION_FRAMES) {
      this.baselineMotion += motion;
      if (this.calibrationFrameIndex === this.CALIBRATION_FRAMES) {
        this.baselineMotion /= this.CALIBRATION_FRAMES - 1;
        this.baselineMotion = Math.max(this.baselineMotion, 0.15);
      }
      this.lastMotionNorm = 0;
      this.tappingActive = false;
      this.cdr.markForCheck();
      return;
    }

    this.lastMotionNorm = motion / (this.baselineMotion + 0.01);

    this.motionNormHistory.push(this.lastMotionNorm);
    if (this.motionNormHistory.length > this.MOTION_NORM_HISTORY_LEN) {
      this.motionNormHistory.shift();
    }
    const avgMotionNorm =
      this.motionNormHistory.length > 0
        ? this.motionNormHistory.reduce((a, b) => a + b, 0) / this.motionNormHistory.length
        : this.lastMotionNorm;

    if (!this.tappingActive && avgMotionNorm > this.TAPPING_HYST_ON && !this.brightnessLow) {
      this.tappingActive = true;
    } else if (this.tappingActive && (avgMotionNorm < this.TAPPING_HYST_OFF || this.brightnessLow)) {
      this.tappingActive = false;
    }

    if (this.currentState === 'cam-recording') {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const crossed =
        this.lastMotionNorm > 1.25 &&
        motion > this.baselineMotion * 1.8 &&
        now - this.lastTapCrossTime > 180;
      if (crossed) {
        this.tapCount++;
        this.lastTapCrossTime = now;
      }
      this.refreshDebouncedRecordingTapFlag(now);
    }

    this.cdr.markForCheck();
  }

  private refreshDebouncedRecordingTapFlag(nowMs: number): void {
    let desiredText: string;
    let desiredVariant: 'calibrating' | 'ok' | 'warn';
    if (this.recordingElapsed < 2) {
      desiredText = 'Calibrating baseline...';
      desiredVariant = 'calibrating';
    } else if (this.tappingActive) {
      desiredText = 'Tapping detected ✓';
      desiredVariant = 'ok';
    } else {
      desiredText = 'Tap steadily to begin';
      desiredVariant = 'warn';
    }

    if (nowMs - this.lastDebouncedTapFlagAt >= 2000) {
      this.debouncedTapFlagText = desiredText;
      this.debouncedTapFlagVariant = desiredVariant;
      this.lastDebouncedTapFlagAt = nowMs;
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

    this.recordingVideoFrameRate = null;
    const vtrack = this.stream.getVideoTracks()[0];
    if (vtrack?.getSettings) {
      const s = vtrack.getSettings() as MediaTrackSettings & { frameRate?: number };
      if (typeof s.frameRate === 'number' && s.frameRate > 0 && s.frameRate <= 120) {
        this.recordingVideoFrameRate = s.frameRate;
      }
    }

    this.recordedChunks = [];
    this.tapCount = 0;
    this.recordingElapsed = 0;
    this.waveformBars = new Array(32).fill(0);
    this.resetLiveMetrics();
    this.debouncedTapFlagText = 'Calibrating baseline...';
    this.debouncedTapFlagVariant = 'calibrating';
    this.lastDebouncedTapFlagAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const mimeType = this.getSupportedVideoMimeType();
    const options: MediaRecorderOptions = mimeType
      ? { mimeType, videoBitsPerSecond: 1_000_000 }
      : {};
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

      if (
        this.recordingElapsed >= this.MAX_RECORDING_SECONDS &&
        this.recordingElapsed >= this.MIN_RECORDING_SECONDS
      ) {
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
    const h = Math.min(100, Math.max(6, this.lastMotionNorm * 38));
    this.waveformBars = [...this.waveformBars.slice(1), h];
  }

  private evaluateQuality(): void {
    this.qualityChecks = {
      duration: this.recordedDuration >= this.MIN_RECORDING_SECONDS,
      tapsFound: this.tapCount >= 3,
      motionClarity: true,
      frameCoverage: true
    };

    const avg = this.tapCount / (this.recordedDuration || 1);
    this.rhythmVariance = avg > 0.8 ? 'low' : avg > 0.5 ? 'moderate' : 'high';
  }

  stopCamera(): void {
    this.stopPreviewLoop();
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
    if (this.recordedDuration < this.MIN_RECORDING_SECONDS) {
      this.apiError = `Recording too short — please record for at least ${this.MIN_RECORDING_SECONDS} seconds of tapping.`;
      this.currentState = 'error';
      return;
    }
    const mime = this.recordedBlob.type || 'video/webm';
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([this.recordedBlob], `live-recording.${ext}`, {
      type: mime
    });
    this.selectedFile = file;
    this.selectedVideoDurationSec = this.recordedDuration;
    this.uploadValidationError = '';
    this.fingerTapUploadHints = {
      duration: String(this.recordedDuration),
      tap_count: String(this.tapCount)
    };
    if (this.recordingVideoFrameRate != null) {
      this.fingerTapUploadHints.fps = String(this.recordingVideoFrameRate);
    }
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
    if (!this.result) {
      return;
    }
    this.pdfDownloading = true;
    try {
      const result = this.result;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageW = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('NeuroSync — Finger Tapping Test Report', margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
      y += 15;

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 10;

      const p = result.probability;
      doc.setFontSize(48);
      doc.setTextColor(
        p > 0.6 ? 230 : p > 0.4 ? 200 : 60,
        p > 0.6 ? 100 : p > 0.4 ? 160 : 180,
        40
      );
      doc.text(`${(p * 100).toFixed(1)}%`, margin, y + 15);
      y += 25;

      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.text("Parkinson's Risk Score", margin, y);
      y += 15;

      const details: [string, string][] = [
        ['Test Type', 'Finger Tapping'],
        ['Modality', result.modality ?? 'finger_tap'],
        ['Probability', result.probability.toFixed(3)],
        ['Risk Level', this.riskLabel],
        ['Classification', result.label ?? '']
      ];

      doc.setFontSize(11);
      details.forEach(([label, value]) => {
        doc.setTextColor(120, 120, 120);
        doc.text(`${label}:`, margin, y);
        doc.setTextColor(40, 40, 40);
        doc.text(String(value), margin + 50, y);
        y += 8;
      });

      y += 10;

      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      const disclaimer =
        'This report is for informational purposes only and does not constitute a medical diagnosis. ' +
        'Please consult a qualified neurologist for clinical evaluation.';
      const lines = doc.splitTextToSize(disclaimer, pageW - margin * 2);
      doc.text(lines, margin, y);

      doc.save(`neurosync_fingertap_${Date.now()}.pdf`);
      this.showToast('Report downloaded ✅');
    } catch (e) {
      console.error('PDF export failed', e);
      this.reportDownloadError = 'Could not generate PDF. Please try again.';
    } finally {
      this.pdfDownloading = false;
      this.cdr.markForCheck();
    }
  }

  downloadCsvReport(): void {
    this.reportDownloadError = '';
    if (!this.result) {
      return;
    }
    this.csvDownloading = true;
    try {
      const result = this.result;
      const headers = [
        'Date',
        'Test',
        'Modality',
        'Risk Score (%)',
        'Probability',
        'Risk Level',
        'Label'
      ];
      const row = [
        new Date().toISOString(),
        'Finger Tapping',
        result.modality ?? 'finger_tap',
        (result.probability * 100).toFixed(1),
        result.probability.toFixed(3),
        this.riskLabel,
        result.label ?? ''
      ];
      const csvContent = [headers.join(','), row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')].join(
        '\n'
      );

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const filename = `neurosync_result_${Date.now()}.csv`;

      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;

      if (isIOS) {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.showToast('Report downloaded ✅');
    } catch (e) {
      console.error('CSV export failed', e);
      this.reportDownloadError = 'Could not download CSV. Please try again.';
    } finally {
      this.csvDownloading = false;
      this.cdr.markForCheck();
    }
  }

  private showToast(message: string, durationMs = 3000): void {
    if (typeof document === 'undefined') {
      return;
    }
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.style.cssText = [
      'position:fixed',
      'bottom:32px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:#1a6b3c',
      'color:#fff',
      'padding:10px 20px',
      'border-radius:24px',
      'font-size:14px',
      'font-weight:600',
      'z-index:99999',
      'box-shadow:0 4px 12px rgba(0,0,0,0.3)',
      'pointer-events:none',
      'max-width:min(90vw,360px)',
      'text-align:center'
    ].join(';');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), durationMs);
  }

  private getSupportedVideoMimeType(): string {
    const candidates = [
      'video/mp4',
      'video/mp4;codecs=avc1',
      'video/mp4;codecs=avc1.42E01E',
      'video/webm;codecs=vp8',
      'video/webm;codecs=vp9',
      'video/webm'
    ];

    for (const type of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  }

  /** After an API error in live mode, return to the camera permission step without a full reset. */
  retryLiveFromError(): void {
    this.apiError = '';
    this.inputMode = 'live';
    this.currentState = 'cam-permission';
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

