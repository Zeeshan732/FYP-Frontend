import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';

/** Payload sent by backend via ReceiveLiveRisk */
export interface LiveRiskUpdate {
  riskPercent: number;
  confidence?: number;
  riskLevel?: string;
}

export type ConnectionState = 'Disconnected' | 'Connecting' | 'Connected' | 'Reconnecting';

/** Minimal type for SignalR hub instance (avoids namespace type issues). */
interface VoiceStreamHubConnection {
  readonly state: number;
  start(): Promise<void>;
  stop(): Promise<void>;
  on(method: string, handler: (data: LiveRiskUpdate | number) => void): void;
  onreconnected(callback: () => void): void;
  onclose(callback: (err?: Error) => void): void;
  invoke(method: string, ...args: unknown[]): Promise<void>;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceStreamingService implements OnDestroy {
  private hubConnection: VoiceStreamHubConnection | null = null;
  private readonly hubPath = '/hubs/voice-stream';
  private readonly maxReconnectAttempts = 5;

  private liveRiskSubject = new BehaviorSubject<LiveRiskUpdate | null>(null);
  private connectionStateSubject = new BehaviorSubject<ConnectionState>('Disconnected');
  private errorSubject = new Subject<string>();

  /** Latest risk update from backend (null when no update yet or session stopped). */
  liveRisk$: Observable<LiveRiskUpdate | null> = this.liveRiskSubject.asObservable();
  connectionState$: Observable<ConnectionState> = this.connectionStateSubject.asObservable();
  errors$: Observable<string> = this.errorSubject.asObservable();

  private sessionActive = false;

  ngOnDestroy(): void {
    this.disconnect();
  }

  /** Build hub URL from API base (e.g. http://localhost:5000/hubs/voice-stream). */
  private getHubUrl(): string {
    const base = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${base}${this.hubPath}`;
  }

  /** Connect to SignalR hub with JWT. Idempotent. */
  async connect(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }
    if (this.hubConnection?.state === signalR.HubConnectionState.Connecting) {
      return;
    }

    this.stopConnection();

    const token = () => localStorage.getItem('token') || '';
    const hubUrl = this.getHubUrl();

    this.connectionStateSubject.next('Connecting');
    const hub: VoiceStreamHubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: token,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (ctx: { previousRetryCount: number }) => {
          if (ctx.previousRetryCount >= this.maxReconnectAttempts) return null;
          this.connectionStateSubject.next('Reconnecting');
          return Math.min(1000 * Math.pow(2, ctx.previousRetryCount), 30000);
        }
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build() as VoiceStreamHubConnection;

    hub.on('ReceiveLiveRisk', (data: LiveRiskUpdate | number) => {
      const update: LiveRiskUpdate = typeof data === 'number'
        ? { riskPercent: data }
        : { riskPercent: data.riskPercent, confidence: data.confidence, riskLevel: data.riskLevel };
      this.liveRiskSubject.next(update);
    });

    hub.onreconnected(() => {
      this.connectionStateSubject.next('Connected');
    });

    hub.onclose((err: Error | undefined) => {
      this.connectionStateSubject.next('Disconnected');
      if (err) {
        this.errorSubject.next(err.message || 'Connection closed');
      }
    });

    this.hubConnection = hub;
    try {
      await hub.start();
      this.connectionStateSubject.next('Connected');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.connectionStateSubject.next('Disconnected');
      this.errorSubject.next(msg);
      this.stopConnection();
      throw err;
    }
  }

  /** Disconnect and clear state. Safe to call multiple times. */
  disconnect(): void {
    this.sessionActive = false;
    this.liveRiskSubject.next(null);
    this.stopConnection();
    this.connectionStateSubject.next('Disconnected');
  }

  private stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop().catch(() => {});
      this.hubConnection = null;
    }
  }

  /** Start a live session. Call after connect(). */
  async startSession(): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Not connected to voice stream hub');
    }
    this.liveRiskSubject.next(null);
    this.sessionActive = true;
    await this.hubConnection.invoke('StartSession');
  }

  /** Send one audio chunk (Int16 PCM). Backend may expect base64 or byte array. */
  sendAudioChunk(int16Array: Int16Array): void {
    if (!this.sessionActive || !this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      return;
    }
    // Send as array of numbers for SignalR compatibility
    const payload = Array.from(int16Array);
    this.hubConnection.invoke('SendAudioChunk', payload).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.errorSubject.next(msg);
    });
  }

  /** Stop the current session and optionally clear risk. */
  async stopSession(): Promise<void> {
    this.sessionActive = false;
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('StopSession');
      } catch {
        // ignore
      }
    }
    this.liveRiskSubject.next(null);
  }

  isSessionActive(): boolean {
    return this.sessionActive;
  }

  getConnectionState(): ConnectionState {
    return this.connectionStateSubject.value;
  }
}
