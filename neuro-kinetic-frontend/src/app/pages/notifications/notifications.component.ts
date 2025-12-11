import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationsService } from '../../services/notifications.service';
import { NotificationItem, NotificationStatus } from '../../models/api.models';

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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.notificationsService.notifications$.subscribe((items) => {
        this.notifications = items;
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
    const status: NotificationStatus | undefined = this.filter === 'All' ? undefined : this.filter;
    this.notificationsService.loadNotifications(status).subscribe({
      next: () => (this.loading = false),
      error: () => (this.loading = false)
    });
  }

  markRead(item: NotificationItem) {
    if (item.status === 1) return; // Already read
    this.notificationsService.markAsRead(item.id).subscribe();
  }

  isAccountRequest(note: NotificationItem): boolean {
    return note.relatedEntity === 'User' && note.relatedEntityId !== undefined;
  }

  viewUserDetails(note: NotificationItem) {
    if (!note.relatedEntityId) return;
    this.router.navigate(['/account-requests'], {
      queryParams: { userId: note.relatedEntityId }
    });
  }
}

