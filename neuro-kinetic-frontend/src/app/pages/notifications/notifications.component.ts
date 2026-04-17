import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { NotificationsService } from '../../services/notifications.service';
import {
  NotificationItem,
  PatientClinicianTestRequestItem
} from '../../models/api.models';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: NotificationItem[] = [];
  filter: 'All' | 'Unread' | 'Read' = 'All';
  loading = false;
  private sub = new Subscription();

  constructor(
    public notificationsService: NotificationsService,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.notificationsService.notifications$.subscribe((items) => {
        this.notifications = [...(items ?? [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
    );
    this.notificationsService.startRealtime();
    this.refresh();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.notificationsService.stopRealtime();
  }

  refresh(): void {
    this.loading = true;
    const status =
      this.filter === 'All' ? undefined : this.filter === 'Unread' ? 'Unread' : 'Read';
    this.notificationsService.loadNotifications(status).subscribe({
      next: () => (this.loading = false),
      error: () => (this.loading = false)
    });
  }

  formatRelativeTime(iso: string): string {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'Just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
    const day = Math.floor(hr / 24);
    if (day === 1) return 'Yesterday';
    if (day < 7) return `${day} days ago`;
    return d.toLocaleDateString();
  }

  markRead(item: NotificationItem) {
    if (item.status === 1) return;
    this.notificationsService.markAsRead(item.id).subscribe();
  }

  isAccountRequest(note: NotificationItem): boolean {
    return note.relatedEntity === 'User' && note.relatedEntityId !== undefined;
  }

  isTestRequest(note: NotificationItem): boolean {
    return note.relatedEntity === 'ClinicianTestRequest' && note.relatedEntityId != null;
  }

  viewUserDetails(note: NotificationItem) {
    if (!note.relatedEntityId) return;
    this.notificationsService.markAsRead(note.id).subscribe();
    this.router.navigate(['/account-requests'], {
      queryParams: { userId: note.relatedEntityId }
    });
  }

  openNotification(note: NotificationItem): void {
    if (this.isTestRequest(note)) {
      this.notificationsService.markAsRead(note.id).subscribe({ error: () => {} });
      this.apiService
        .getPatientClinicianTestRequests()
        .pipe(take(1))
        .subscribe({
          next: (list) => {
            const req = list.find((r) => r.id === note.relatedEntityId);
            if (req) {
              this.navigateToPatientRequest(req);
            } else {
              this.router.navigate(['/home']);
            }
          },
          error: () => this.router.navigate(['/home'])
        });
      return;
    }

    if (this.isAccountRequest(note)) {
      this.viewUserDetails(note);
      return;
    }

    this.markRead(note);
  }

  private navigateToPatientRequest(item: PatientClinicianTestRequestItem): void {
    const t = (item.testType || 'voice').toLowerCase();
    if (t === 'gait') {
      this.router.navigate(['/gait-analysis'], { queryParams: { fromRequest: item.id } });
      return;
    }
    if (t === 'fingertap') {
      this.router.navigate(['/finger-tap'], { queryParams: { fromRequest: item.id } });
      return;
    }
    this.router.navigate(['/patient-test'], {
      queryParams: { requested: 'voice', fromRequest: item.id }
    });
  }
}
