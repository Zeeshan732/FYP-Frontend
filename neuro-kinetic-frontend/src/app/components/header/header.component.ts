import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { SidebarService } from '../../services/sidebar.service';
import { NotificationsService } from '../../services/notifications.service';

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
  
  private routerSubscription?: Subscription;
  private userSubscription?: Subscription;
  private sidebarSubscription?: Subscription;
  private unreadSubscription?: Subscription;

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
    'collaboration': 'Collaboration',
    'voice-analysis': 'Voice Analysis',
    'gait-analysis': 'Gait Analysis',
    'login': 'Login',
    'signup': 'Sign Up'
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private sidebarService: SidebarService,
    private notificationsService: NotificationsService
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
    this.notificationsService.stopRealtime();
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

  navigateToProfile() {
    // Can navigate to profile page if exists
    // this.router.navigate(['/profile']);
  }

  goToNotifications() {
    this.router.navigate(['/notifications']);
  }
}
