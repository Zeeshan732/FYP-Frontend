import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { SidebarService } from '../../services/sidebar.service';
import { NotificationsService } from '../../services/notifications.service';
import { ApiService } from '../../services/api.service';
import { NotificationItem, PatientClinicianTestRequestItem } from '../../models/api.models';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  breadcrumbPath: string = '';
  currentRoute: string = '';
  currentUser: any = null;
  sidebarCollapsed = false;
  isCompactViewport = false;
  isLandingPage: boolean = false;
  unreadCount = 0;
  notificationsDropdownOpen = false;
  notificationPreview: NotificationItem[] = [];

  @ViewChild('notifDropdownHost') notifDropdownHost?: ElementRef<HTMLElement>;

  private routerSubscription?: Subscription;
  private userSubscription?: Subscription;
  private sidebarSubscription?: Subscription;
  private unreadSubscription?: Subscription;
  private notificationsListSubscription?: Subscription;

  // Route to label mapping
  routeLabels: { [key: string]: string } = {
    'landing': 'Home',
    'home': 'Home',
    'contact': 'Contact',
    'consultation': 'Consultation',
    'patient-test': 'Take Test',
    'test-records': 'Test Records',
    'admin-dashboard': 'Admin Dashboard',
    'clinical-use': 'Clinical Use',
    'voice-analysis': 'Voice Analysis',
    'gait-analysis': 'Gait Analysis',
    'login': 'Login',
    'signup': 'Sign Up',
    'profile-settings': 'Profile Settings',
    'clinician': 'Dashboard',
    'patients': 'Patient'
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private sidebarService: SidebarService,
    public notificationsService: NotificationsService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.syncViewportState();

    // Subscribe to router events
    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const route = event.urlAfterRedirects || event.url;
      this.isLandingPage = route === '/landing' || route === '/';
      this.updateBreadcrumb();
    });

    // Initial route check
    const initialRoute = this.router.url;
    this.isLandingPage = initialRoute === '/landing' || initialRoute === '/';
    
    // Initial breadcrumb update
    this.updateBreadcrumb();

    // Subscribe to user changes
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user && this.authService.isAuthenticated()) {
        this.notificationsService.startRealtime();
        this.notificationsService.loadNotifications().subscribe({
          error: (err) => {
            // Silently handle errors - notifications will retry
            if (err.status !== 401) {
              console.error('Failed to load notifications', err);
            }
          }
        });
      } else {
        this.unreadCount = 0;
        this.notificationsService.stopRealtime();
      }
    });

    this.unreadSubscription = this.notificationsService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });

    this.notificationsListSubscription = this.notificationsService.notifications$.subscribe(
      (items) => {
        this.notificationPreview = [...(items ?? [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 8);
      }
    );

    // Subscribe to sidebar state
    this.sidebarSubscription = this.sidebarService.sidebarCollapsed$.subscribe(collapsed => {
      this.sidebarCollapsed = collapsed;
    });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.sidebarSubscription) {
      this.sidebarSubscription.unsubscribe();
    }
    if (this.unreadSubscription) {
      this.unreadSubscription.unsubscribe();
    }
    if (this.notificationsListSubscription) {
      this.notificationsListSubscription.unsubscribe();
    }
    this.notificationsService.stopRealtime();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    const el = this.notifDropdownHost?.nativeElement;
    if (el && ev.target instanceof Node && el.contains(ev.target)) {
      return;
    }
    this.notificationsDropdownOpen = false;
  }

  toggleNotificationsDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationsDropdownOpen = !this.notificationsDropdownOpen;
    if (this.notificationsDropdownOpen && this.currentUser && this.authService.isAuthenticated()) {
      this.notificationsService.loadNotifications().subscribe({ error: () => {} });
    }
  }

  formatRelativeTime(iso: string): string {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'Just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day === 1) return 'Yesterday';
    if (day < 7) return `${day}d ago`;
    return d.toLocaleDateString();
  }

  onPreviewItemClick(note: NotificationItem, event: Event): void {
    event.stopPropagation();
    this.notificationsDropdownOpen = false;
    this.openNotification(note);
  }

  private openNotification(note: NotificationItem): void {
    if (note.relatedEntity === 'ClinicianTestRequest' && note.relatedEntityId != null) {
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

    if (note.relatedEntity === 'User' && note.relatedEntityId != null) {
      this.notificationsService.markAsRead(note.id).subscribe({ error: () => {} });
      this.router.navigate(['/account-requests'], {
        queryParams: { userId: note.relatedEntityId }
      });
      return;
    }

    if (this.notificationsService.isUnread(note)) {
      this.notificationsService.markAsRead(note.id).subscribe();
    }
    this.router.navigate(['/notifications']);
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

  markAllPreviewRead(): void {
    const ids = this.notificationPreview
      .filter((n) => this.notificationsService.isUnread(n))
      .map((n) => n.id);
    if (!ids.length) return;
    this.notificationsService.markManyRead(ids).subscribe({ error: () => {} });
  }

  goToNotificationsPage(): void {
    this.notificationsDropdownOpen = false;
    this.router.navigate(['/notifications']);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.syncViewportState();
  }

  private syncViewportState(): void {
    this.isCompactViewport = window.innerWidth <= 1024;
  }

  updateBreadcrumb() {
    let route = this.activatedRoute;
    const breadcrumbs: string[] = [];

    // Always start with Home
    breadcrumbs.push('Home');

    // Build breadcrumb path
    while (route.firstChild) {
      route = route.firstChild;
      const routePath = route.snapshot.url.map(segment => segment.path).join('/');
      
      if (routePath) {
        // Check if it's a detail route (with ID)
        const segments = routePath.split('/');
        const baseRoute = segments[0];
        
        if (this.routeLabels[baseRoute]) {
          if (segments.length > 1 && segments[1]) {
            // Detail view (e.g., publications/:id)
            breadcrumbs.push(this.routeLabels[baseRoute]);
            breadcrumbs.push('Details');
          } else {
            breadcrumbs.push(this.routeLabels[baseRoute]);
          }
        }
      }
    }

    // Get the final route path (strip query string for display)
    const urlWithoutQuery = this.router.url.split('?')[0];
    const urlSegments = urlWithoutQuery.split('/').filter(segment => segment);
    
    if (urlSegments.length > 0) {
      const currentPath = urlSegments[urlSegments.length - 1];
      this.currentRoute = this.routeLabels[currentPath] || this.formatRouteName(currentPath);
      
      // Build breadcrumb from URL (no query params in labels)
      const breadcrumbParts: string[] = ['Home'];
      urlSegments.forEach((segment) => {
        const label = this.routeLabels[segment] || this.formatRouteName(segment);
        if (label && label !== 'Details') {
          breadcrumbParts.push(label);
        }
      });
      
      this.breadcrumbPath = breadcrumbParts.join(' / ');
    } else {
      this.currentRoute = 'Home';
      this.breadcrumbPath = 'Home';
    }
  }

  formatRouteName(route: string): string {
    // Convert route name to readable format
    return route
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getUserInitials(): string {
    if (this.currentUser?.firstName && this.currentUser?.lastName) {
      return `${this.currentUser.firstName[0]}${this.currentUser.lastName[0]}`.toUpperCase();
    } else if (this.currentUser?.firstName) {
      return this.currentUser.firstName[0].toUpperCase();
    } else if (this.currentUser?.email) {
      return this.currentUser.email[0].toUpperCase();
    }
    return 'U';
  }

  getUserDisplayName(): string {
    if (this.currentUser?.firstName && this.currentUser?.lastName) {
      return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    } else if (this.currentUser?.firstName) {
      return this.currentUser.firstName;
    } else if (this.currentUser?.email) {
      return this.currentUser.email;
    }
    return 'User';
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'Admin';
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile-settings']);
  }

}
