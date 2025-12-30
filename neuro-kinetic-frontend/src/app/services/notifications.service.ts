import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, timer, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { NotificationItem, NotificationStatus } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService implements OnDestroy {
  private apiUrl = environment.apiUrl;
  private notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private pollingSubscription?: Subscription;
  private hubConnection: any;
  private connecting = false;

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Helper: Convert status string to number (backend format)
  private statusToNumber(status?: NotificationStatus): number | undefined {
    if (status === 'Unread') return 0;
    if (status === 'Read') return 1;
    return undefined;
  }

  // Helper: Convert status number to string (frontend display)
  getStatusString(status: number): NotificationStatus {
    return status === 0 ? 'Unread' : 'Read';
  }

  // Helper: Check if notification is unread
  isUnread(notification: NotificationItem): boolean {
    return notification.status === 0;
  }

  loadNotifications(status?: NotificationStatus): Observable<NotificationItem[]> {
    let params = new HttpParams();
    const statusNum = this.statusToNumber(status);
    if (statusNum !== undefined) {
      params = params.set('status', statusNum.toString());
    }

    return this.http.get<NotificationItem[]>(`${this.apiUrl}/notifications`, { params }).pipe(
      tap((items) => {
        this.notificationsSubject.next(items);
        this.updateUnreadCount(items);
      })
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
      })
    );
  }

  startPolling(intervalMs = 30000): void {
    this.stopPolling();
    this.pollingSubscription = timer(0, intervalMs)
      .pipe(
        switchMap(() =>
          this.loadNotifications().pipe(
            catchError((err) => {
              console.error('Notification polling failed', err);
              return of([]);
            })
          )
        )
      )
      .subscribe();
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  startRealtime(): void {
    if (this.hubConnection || this.connecting) {
      return;
    }

    const hubUrl = this.getHubUrl();
    const token = () => localStorage.getItem('token') || '';

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: token,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect()
      .build();

    this.registerHubHandlers();
    this.connecting = true;

    this.hubConnection
      .start()
      .then(() => {
        this.connecting = false;
        this.loadNotifications().subscribe({
          error: () => {
            /* ignore */
          }
        });
      })
      .catch((err: any) => {
        this.connecting = false;
        console.error('SignalR connection failed', err);
        // Fallback to polling if SignalR fails
        this.startPolling(30000);
      });
  }

  stopRealtime(): void {
    if (this.hubConnection) {
      this.hubConnection.stop().catch(() => {});
      this.hubConnection = undefined;
    }
    this.stopPolling();
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

    this.hubConnection.on('NewNotification', (notification: NotificationItem) => {
      const current = this.notificationsSubject.value;
      const exists = current.find(n => n.id === notification.id);
      const next = exists ? current : [notification, ...current];
      this.notificationsSubject.next(next);
      this.updateUnreadCount(next);
    });
  }

  private getHubUrl(): string {
    // Use environment.signalRUrl if available, otherwise construct from apiUrl
    if (environment.signalRUrl) {
      return environment.signalRUrl;
    }
    // Fallback: Convert https://host:port/api -> https://host:port/hubs/notifications
    return this.apiUrl.replace(/\/api\/?$/, '') + '/hubs/notifications';
  }
}

