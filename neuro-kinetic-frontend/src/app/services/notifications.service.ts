import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, timer, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { NotificationItem, NotificationStatus } from '../models/api.models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService implements OnDestroy {
  private apiUrl = environment.apiUrl;
  private notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private pollingSubscription?: Subscription;
  private unreadPollSubscription?: Subscription;
  /** SignalR client — typed loosely due to TS `export as namespace` in @microsoft/signalr */
  private hubConnection: { start(): Promise<void>; stop(): Promise<void>; on(n: string, fn: (...a: unknown[]) => void): void } | null =
    null;
  private connecting = false;

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private statusToNumber(status?: NotificationStatus): number | undefined {
    if (status === 'Unread') return 0;
    if (status === 'Read') return 1;
    return undefined;
  }

  getStatusString(status: number): NotificationStatus {
    return status === 0 ? 'Unread' : 'Read';
  }

  isUnread(notification: NotificationItem): boolean {
    return notification.status === 0;
  }

  /**
   * Backend may send status as int, string enum name (global JSON enum converter), or mixed SignalR payloads.
   */
  private normalizeItem(raw: any): NotificationItem {
    let st: number;
    const s = raw?.status;
    if (typeof s === 'string') {
      const low = s.toLowerCase();
      st = low === 'unread' || low === '0' ? 0 : 1;
    } else if (typeof s === 'number' && !Number.isNaN(s)) {
      st = s === 1 ? 1 : 0;
    } else {
      st = 0;
    }

    const created =
      typeof raw?.createdAt === 'string'
        ? raw.createdAt
        : raw?.createdAt
          ? new Date(raw.createdAt).toISOString()
          : new Date().toISOString();

    return {
      id: Number(raw?.id),
      userId: raw?.userId,
      message: String(raw?.message ?? ''),
      status: st,
      relatedEntity: raw?.relatedEntity,
      relatedEntityId: raw?.relatedEntityId != null ? Number(raw.relatedEntityId) : undefined,
      createdAt: created,
      updatedAt: raw?.updatedAt
    };
  }

  private normalizeList(items: any[]): NotificationItem[] {
    return (items ?? []).map((x) => this.normalizeItem(x));
  }

  loadNotifications(status?: NotificationStatus): Observable<NotificationItem[]> {
    if (!this.authService.isAuthenticated()) {
      return of([]);
    }

    let params = new HttpParams();
    const statusNum = this.statusToNumber(status);
    if (statusNum !== undefined) {
      params = params.set('status', statusNum.toString());
    }

    return this.http.get<any[]>(`${this.apiUrl}/notifications`, { params }).pipe(
      catchError((error) => {
        if (error.status === 401) {
          return of([]);
        }
        throw error;
      }),
      tap((items) => {
        const norm = this.normalizeList(items);
        this.notificationsSubject.next(norm);
        this.updateUnreadCount(norm);
        this.refreshUnreadCountFromApi().subscribe({ error: () => {} });
      })
    );
  }

  /** Single source for badge count (matches server even if list filter differs). */
  refreshUnreadCountFromApi(): Observable<number> {
    if (!this.authService.isAuthenticated()) {
      this.unreadCountSubject.next(0);
      return of(0);
    }
    return this.http.get<number>(`${this.apiUrl}/notifications/unread-count`).pipe(
      catchError(() => of(0)),
      tap((n) => this.unreadCountSubject.next(n))
    );
  }

  loadAdminNotifications(status?: NotificationStatus): Observable<NotificationItem[]> {
    let params = new HttpParams();
    const statusNum = this.statusToNumber(status);
    if (statusNum !== undefined) {
      params = params.set('status', statusNum.toString());
    }
    return this.http.get<NotificationItem[]>(`${this.apiUrl}/admin/notifications`, { params });
  }

  markAsRead(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/notifications/${id}/read`, {}).pipe(
      tap(() => {
        const updated = this.notificationsSubject.value.map((n) =>
          n.id === id ? { ...n, status: 1, updatedAt: new Date().toISOString() } : n
        );
        this.notificationsSubject.next(updated);
        this.updateUnreadCount(updated);
        this.refreshUnreadCountFromApi().subscribe({ error: () => {} });
      })
    );
  }

  markManyRead(ids: number[]): Observable<void> {
    if (!ids.length) {
      return of(undefined);
    }
    return this.http.patch<void>(`${this.apiUrl}/notifications/mark-read`, { ids }).pipe(
      tap(() => {
        const set = new Set(ids);
        const updated = this.notificationsSubject.value.map((n) =>
          set.has(n.id) ? { ...n, status: 1, updatedAt: new Date().toISOString() } : n
        );
        this.notificationsSubject.next(updated);
        this.updateUnreadCount(updated);
        this.refreshUnreadCountFromApi().subscribe({ error: () => {} });
      })
    );
  }

  startPolling(intervalMs = 45000): void {
    this.stopPolling();

    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.pollingSubscription = timer(0, intervalMs)
      .pipe(
        switchMap(() => {
          if (!this.authService.isAuthenticated()) {
            this.stopPolling();
            return of([]);
          }
          return this.loadNotifications().pipe(
            catchError((err) => {
              if (err.status !== 401) {
                console.error('Notification polling failed', err);
              }
              return of([]);
            })
          );
        })
      )
      .subscribe();
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  private startUnreadPolling(intervalMs = 60000): void {
    this.stopUnreadPolling();
    if (!this.authService.isAuthenticated()) {
      return;
    }
    this.unreadPollSubscription = timer(0, intervalMs)
      .pipe(
        switchMap(() =>
          this.authService.isAuthenticated()
            ? this.refreshUnreadCountFromApi()
            : of(0)
        )
      )
      .subscribe();
  }

  private stopUnreadPolling(): void {
    if (this.unreadPollSubscription) {
      this.unreadPollSubscription.unsubscribe();
      this.unreadPollSubscription = undefined;
    }
  }

  startRealtime(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    if (this.hubConnection || this.connecting) {
      return;
    }

    const hubUrl = this.getHubUrl();
    const token = () => localStorage.getItem('token') || '';

    this.connecting = true;

    const conn = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: token,
        transport: HttpTransportType.LongPolling | HttpTransportType.WebSockets,
        skipNegotiation: false
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext: { previousRetryCount: number }) => {
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          if (retryContext.previousRetryCount === 3) return 30000;
          return null;
        }
      })
      .build();

    this.hubConnection = conn;

    this.registerHubHandlers();

    conn
      .start()
      .then(() => {
        this.connecting = false;
        this.stopPolling();
        this.loadNotifications().subscribe({
          error: (err) => {
            if (err.status !== 401) {
              console.error('Failed to load initial notifications', err);
            }
          }
        });
        this.refreshUnreadCountFromApi().subscribe({ error: () => {} });
        this.startUnreadPolling(90000);
      })
      .catch((err: unknown) => {
        this.connecting = false;
        console.warn('SignalR connection failed, falling back to polling:', err);
        if (this.hubConnection) {
          this.hubConnection.stop().catch(() => {});
          this.hubConnection = null;
        }
        if (this.authService.isAuthenticated()) {
          this.startPolling(45000);
          this.startUnreadPolling(60000);
        }
      });
  }

  stopRealtime(): void {
    if (this.hubConnection) {
      this.hubConnection.stop().catch(() => {});
      this.hubConnection = null;
    }
    this.stopPolling();
    this.stopUnreadPolling();
  }

  ngOnDestroy(): void {
    this.stopRealtime();
  }

  private updateUnreadCount(items: NotificationItem[]) {
    const unread = items.filter((n) => n.status === 0).length;
    this.unreadCountSubject.next(unread);
  }

  private registerHubHandlers() {
    if (!this.hubConnection) return;

    this.hubConnection.on('NewNotification', (payload: any) => {
      const notification = this.normalizeItem(payload);
      const current = this.notificationsSubject.value;
      const exists = current.find((n) => n.id === notification.id);
      const next = exists
        ? current.map((n) => (n.id === notification.id ? { ...notification, status: 0 } : n))
        : [notification, ...current];
      this.notificationsSubject.next(next);
      this.updateUnreadCount(next);
      this.refreshUnreadCountFromApi().subscribe({ error: () => {} });
    });
  }

  private getHubUrl(): string {
    if (environment.signalRUrl) {
      return environment.signalRUrl;
    }
    return this.apiUrl.replace(/\/api\/?$/, '') + '/hubs/notifications';
  }
}
