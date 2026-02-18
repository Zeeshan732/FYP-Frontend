import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VoiceStreamingService, LiveRiskUpdate, ConnectionState } from '../../services/voice-streaming.service';
import { MessageService } from 'primeng/api';
import { Chart } from 'chart.js';

const TARGET_SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;
const CHUNK_INTERVAL_MS = 600;
const MAX_CHART_POINTS = 30;

export type RiskTrend = 'up' | 'down' | 'stable';

@Component({
  selector: 'app-live-voice-monitor',
  templateUrl: './live-voice-monitor.component.html',
  styleUrls: ['./live-voice-monitor.component.scss']
})
export class LiveVoiceMonitorComponent implements OnInit, OnDestroy {
  @ViewChild('riskChart') riskChartRef!: ElementRef<HTMLCanvasElement>;

  isRecording = false;
  connectionState: ConnectionState = 'Disconnected';
  currentRisk: LiveRiskUpdate | null = null;
  riskHistory: number[] = [];
  timestamps: string[] = [];
  trend: RiskTrend = 'stable';
  errorMessage = '';

  private chart: Chart | null = null;
  private destroy$ = new Subject<void>();
  private riskSub?: Subscription;
  private stateSub?: Subscription;
  private errorSub?: Subscription;

  private audioContext: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private floatBuffer: number[] = [];
  private chunkIntervalId: ReturnType<typeof setInterval> | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  constructor(
    private voiceStreaming: VoiceStreamingService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.stateSub = this.voiceStreaming.connectionState$.pipe(takeUntil(this.destroy$)).subscribe((s) => {
      this.connectionState = s;
      this.cdr.markForCheck();
    });
    this.errorSub = this.voiceStreaming.errors$.pipe(takeUntil(this.destroy$)).subscribe((msg) => {
      this.errorMessage = msg;
      this.messageService.add({
        severity: 'warn',
        summary: 'Voice stream',
        detail: msg,
        life: 5000
      });
      this.cdr.markForCheck();
    });
    this.voiceStreaming.connect().catch((err: unknown) => {
      this.errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopRecording();
    this.voiceStreaming.disconnect();
    this.destroyChart();
    this.cdr.detectChanges();
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  get riskLevelSeverity(): 'success' | 'warning' | 'danger' | 'info' {
    const p = this.currentRisk?.riskPercent ?? 0;
    if (p < 40) return 'success';
    if (p <= 70) return 'warning';
    return 'danger';
  }

  get riskLevelLabel(): string {
    const p = this.currentRisk?.riskPercent ?? 0;
    if (p < 40) return 'Low';
    if (p <= 70) return 'Moderate';
    return 'High';
  }

  get canStart(): boolean {
    return !this.isRecording && this.connectionState === 'Connected';
  }

  get canStop(): boolean {
    return this.isRecording;
  }

  async startSession(): Promise<void> {
    if (!this.canStart) return;
    try {
      this.errorMessage = '';
      this.riskHistory = [];
      this.timestamps = [];
      this.destroyChart();
      this.cdr.detectChanges();
      await this.voiceStreaming.startSession();
      this.subscribeToRisk();
      await this.startMicrophone();
      this.isRecording = true;
      this.cdr.markForCheck();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.errorMessage = msg;
      this.messageService.add({
        severity: 'error',
        summary: 'Start failed',
        detail: msg,
        life: 5000
      });
      this.cdr.markForCheck();
    }
  }

  async stopSession(): Promise<void> {
    if (!this.canStop) return;
    this.stopRecording();
    await this.voiceStreaming.stopSession();
    this.riskSub?.unsubscribe();
    this.riskSub = undefined;
    this.isRecording = false;
    this.currentRisk = null;
    this.cdr.markForCheck();
  }

  private subscribeToRisk(): void {
    this.riskSub = this.voiceStreaming.liveRisk$.pipe(takeUntil(this.destroy$)).subscribe((update: LiveRiskUpdate | null) => {
      this.ngZone.run(() => {
        this.currentRisk = update;
        if (update) {
          this.riskHistory.push(update.riskPercent);
          this.timestamps.push(new Date().toLocaleTimeString());
          if (this.riskHistory.length > MAX_CHART_POINTS) {
            this.riskHistory.shift();
            this.timestamps.shift();
          }
          this.updateTrend();
          this.updateChart();
        }
        this.cdr.markForCheck();
      });
    });
  }

  private updateTrend(): void {
    const len = this.riskHistory.length;
    if (len < 2) {
      this.trend = 'stable';
      return;
    }
    const prev = this.riskHistory[len - 2];
    const curr = this.riskHistory[len - 1];
    if (curr > prev) this.trend = 'up';
    else if (curr < prev) this.trend = 'down';
    else this.trend = 'stable';
  }

  private getRiskColor(percent: number): { border: string; fill: string } {
    if (percent < 40) return { border: 'rgb(34, 197, 94)', fill: 'rgba(34, 197, 94, 0.1)' };
    if (percent <= 70) return { border: 'rgb(234, 179, 8)', fill: 'rgba(234, 179, 8, 0.1)' };
    return { border: 'rgb(239, 68, 68)', fill: 'rgba(239, 68, 68, 0.1)' };
  }

  private updateChart(): void {
    if (!this.riskChartRef?.nativeElement) return;
    const ctx: CanvasRenderingContext2D | null = this.riskChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.timestamps.slice(-MAX_CHART_POINTS);
    const data = this.riskHistory.slice(-MAX_CHART_POINTS);
    const lastRisk = data.length > 0 ? data[data.length - 1] : 0;
    const colors = this.getRiskColor(lastRisk);

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      this.chart.data.datasets[0].borderColor = colors.border;
      this.chart.data.datasets[0].backgroundColor = colors.fill;
      this.chart.update('none');
      return;
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Risk %',
          data,
          borderColor: colors.border,
          backgroundColor: colors.fill,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
            title: { display: true, text: 'Risk %' }
          },
          x: {
            title: { display: true, text: 'Time' }
          }
        },
        plugins: {
          legend: { display: true }
        }
      }
    });
  }

  private async startMicrophone(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Microphone access denied',
        detail: 'Please allow microphone access to use live voice monitoring.',
        life: 8000
      });
      await this.voiceStreaming.stopSession();
      throw err;
    }

    const AudioContextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new (AudioContextCtor ?? AudioContext)();
    const context = this.audioContext;
    const inputRate = context.sampleRate;
    const source = context.createMediaStreamSource(this.stream);
    this.sourceNode = source;

    const bufferLength = BUFFER_SIZE;
    const processor = context.createScriptProcessor(bufferLength, 1, 1);
    this.scriptNode = processor;

    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      const input = event.inputBuffer.getChannelData(0);
      for (let i = 0; i < input.length; i++) {
        this.floatBuffer.push(input[i]);
      }
    };

    source.connect(processor);
    const silentDest = context.createMediaStreamDestination();
    processor.connect(silentDest);

    const ratio = inputRate / TARGET_SAMPLE_RATE;
    const samplesPerChunk = Math.floor((TARGET_SAMPLE_RATE * CHUNK_INTERVAL_MS) / 1000);

    this.chunkIntervalId = setInterval(() => {
      if (this.floatBuffer.length < samplesPerChunk * ratio) return;
      const toTake = Math.floor(samplesPerChunk * ratio);
      const floatChunk = this.floatBuffer.splice(0, toTake);
      const downsampled = ratio === 1 ? floatChunk : this.downsample(floatChunk, ratio);
      const int16 = this.float32ToInt16(downsampled);
      this.voiceStreaming.sendAudioChunk(int16);
    }, CHUNK_INTERVAL_MS);
  }

  private downsample(samples: number[], ratio: number): number[] {
    const newLength = Math.floor(samples.length / ratio);
    const result: number[] = new Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < newLength) {
      result[offsetResult] = samples[Math.floor(offsetBuffer)] ?? 0;
      offsetResult++;
      offsetBuffer += ratio;
    }

    return result;
  }

  private float32ToInt16(float32: number[]): Int16Array {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16;
  }

  private stopRecording(): void {
    if (this.chunkIntervalId != null) {
      clearInterval(this.chunkIntervalId);
      this.chunkIntervalId = null;
    }
    this.floatBuffer = [];
    if (this.scriptNode != null && this.sourceNode != null && this.audioContext != null) {
      try {
        this.sourceNode.disconnect(this.scriptNode);
      } catch {
        // ignore
      }
      try {
        this.scriptNode.disconnect();
      } catch {
        // ignore
      }
      this.scriptNode = null;
      this.sourceNode = null;
    }
    if (this.audioContext != null) {
      try {
        this.audioContext.close().catch(() => {});
      } catch {
        // ignore
      }
      this.audioContext = null;
    }
    if (this.stream != null) {
      this.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      this.stream = null;
    }
  }
}
