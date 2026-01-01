import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, timer, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import * as signalR from '@microsoft/signalr';
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
  private hubConnection: any;
  private connecting = false;

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

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
    // Only load notifications if user is authenticated
    if (!this.authService.isAuthenticated()) {
      console.log('Not authenticated, skipping notification load');
      return of([]);
    }

    let params = new HttpParams();
    const statusNum = this.statusToNumber(status);
    if (statusNum !== undefined) {
      params = params.set('status', statusNum.toString());
    }

    return this.http.get<NotificationItem[]>(`${this.apiUrl}/notifications`, { params }).pipe(
      catchError((error) => {
        // Silently handle 401 errors - user might not be authenticated yet
        if (error.status === 401) {
          console.log('Unauthorized notification request, user not authenticated');
          return of([]);
        }
        throw error;
      }),
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
    
    // Only start polling if authenticated
    if (!this.authService.isAuthenticated()) {
      console.log('Not authenticated, skipping notification polling');
      return;
    }
    
    this.pollingSubscription = timer(0, intervalMs)
      .pipe(
        switchMap(() => {
          // Check authentication before each poll
          if (!this.authService.isAuthenticated()) {
            this.stopPolling();
            return of([]);
          }
          return this.loadNotifications().pipe(
            catchError((err) => {
              // Don't log 401 errors as they're expected when not authenticated
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

  startRealtime(): void {
    // Only start realtime if authenticated
    if (!this.authService.isAuthenticated()) {
      console.log('Not authenticated, skipping SignalR connection');
      return;
    }

    if (this.hubConnection || this.connecting) {
      return;
    }

    const hubUrl = this.getHubUrl();
    const token = () => localStorage.getItem('token') || '';

    console.log('Attempting SignalR connection to:', hubUrl);

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: token,
        // Try LongPolling first, then WebSockets as fallback
        transport: signalR.HttpTransportType.LongPolling | signalR.HttpTransportType.WebSockets,
        skipNegotiation: false
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext: any) => {
          // Exponential backoff: 0s, 2s, 10s, 30s, then stop
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          if (retryContext.previousRetryCount === 3) return 30000;
          return null; // Stop retrying after 4 attempts
        }
      })
      .build();

    this.registerHubHandlers();
    this.connecting = true;

    this.hubConnection
      .start()
      .then(() => {
        this.connecting = false;
        console.log('SignalR connected successfully');
        // Stop polling if it was running as fallback
        this.stopPolling();
        
        // Load initial notifications
        this.loadNotifications().subscribe({
          next: () => {
            console.log('Initial notifications loaded');
          },
          error: (err) => {
            // Don't log 401 errors as they're expected when not authenticated
            if (err.status !== 401) {
              console.error('Failed to load initial notifications', err);
            }
          }
        });
      })
      .catch((err: any) => {
        this.connecting = false;
        const errorMsg = err.message || err.toString();
        console.warn('SignalR connection failed, falling back to polling:', errorMsg);
        
        // Clean up failed connection
        if (this.hubConnection) {
          this.hubConnection.stop().catch(() => {});
          this.hubConnection = undefined;
        }
        
        // Always fallback to polling if SignalR fails (only if authenticated)
        if (this.authService.isAuthenticated()) {
          console.log('Starting polling as fallback (30 second interval)');
          // Start polling immediately as fallback
          this.startPolling(30000);
        }
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
    console.log('Updating unread count:', unread, 'from', items.length, 'notifications');
    this.unreadCountSubject.next(unread);
  }

  private registerHubHandlers() {
    if (!this.hubConnection) return;

    this.hubConnection.on('NewNotification', (notification: NotificationItem) => {
      console.log('NewNotification received via SignalR:', notification);
      const current = this.notificationsSubject.value;
      const exists = current.find(n => n.id === notification.id);
      
      // Ensure notification has status 0 (unread) if not specified
      // New notifications from backend should always be unread
      if (notification.status === undefined || notification.status === null) {
        notification.status = 0;
      }
      
      // If notification already exists, update it; otherwise add it to the beginning
      const next = exists 
        ? current.map(n => n.id === notification.id ? { ...notification, status: 0 } : n)
        : [{ ...notification, status: 0 }, ...current];
      
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

