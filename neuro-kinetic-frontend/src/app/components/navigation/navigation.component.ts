import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ModalService } from '../../services/modal.service';
import { AuthService } from '../../services/auth.service';
import { SidebarService } from '../../services/sidebar.service';
import { NotificationsService } from '../../services/notifications.service';
import { NotificationItem } from '../../models/api.models';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
  mobileMenuOpen = false;
  isScrolled = false;
  lastScrollY = 0;
  isNavbarVisible = true;
  mobileSidebarOpen = false;
  isMobile = false;
  
  // Sidebar state
  sidebarCollapsed = false;
  
  // User and role info
  currentUser: any = null;
  isAuthenticated = false;
  isAdmin = false;
  isClinician = false;
  isPatient = false;
  roleLabel = '';
  userRole = '';
  currentRoute: string = '';
  isLandingPage: boolean = false;
  showNotifications = false;
  notifications: NotificationItem[] = [];
  unreadCount = 0;
  
  private userSubscription?: Subscription;
  private routerSubscription?: Subscription;
  private sidebarSubscription?: Subscription;
  private notificationsSubscription?: Subscription;
  private unreadSubscription?: Subscription;

  constructor(
    private modalService: ModalService,
    private authService: AuthService,
    private sidebarService: SidebarService,
    private router: Router,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit() {
    this.lastScrollY = window.scrollY;
    this.syncSidebarForViewport();
    
    // Subscribe to sidebar state
    this.sidebarSubscription = this.sidebarService.sidebarCollapsed$.subscribe(collapsed => {
      this.sidebarCollapsed = collapsed;
    });
    
    // Subscribe to user changes
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
      const rawRole = user?.role ?? '';
      const normalizedRole = String(rawRole).toLowerCase();
      this.userRole = normalizedRole;
      this.isAdmin = normalizedRole === 'admin';
      this.isClinician = normalizedRole === 'clinician' || normalizedRole === 'medicalprofessional';
      this.isPatient = !!user && !this.isAdmin && !this.isClinician;
      this.roleLabel = rawRole || '';
      if (user && this.authService.isAuthenticated()) {
        this.showNotifications = true;
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
        this.showNotifications = false;
        this.notifications = [];
        this.unreadCount = 0;
        this.notificationsService.stopRealtime();
      }
    });

    // Close mobile menu on route change and update route info
    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.currentRoute = event.urlAfterRedirects || event.url;
      this.isLandingPage = this.currentRoute === '/landing' || this.currentRoute === '/' || this.currentRoute === '/login' || this.currentRoute === '/signup';
      this.closeMobileMenu();
      if (this.isMobile && this.mobileSidebarOpen) {
        this.closeMobileSidebar();
      }
    });
    
    this.notificationsSubscription = this.notificationsService.notifications$.subscribe((items) => {
      this.notifications = items;
    });
    this.unreadSubscription = this.notificationsService.unreadCount$.subscribe((count) => {
      this.unreadCount = count;
    });
    // Initial route check
    this.currentRoute = this.router.url;
    this.isLandingPage = this.currentRoute === '/landing' || this.currentRoute === '/' || this.currentRoute === '/login' || this.currentRoute === '/signup';
  }

  @HostListener('window:resize')
  onResize() {
    this.syncSidebarForViewport();
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.sidebarSubscription) {
      this.sidebarSubscription.unsubscribe();
    }
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
    if (this.unreadSubscription) {
      this.unreadSubscription.unsubscribe();
    }
    this.notificationsService.stopRealtime();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    // Hide/show navbar only when navbar is shown (not authenticated OR landing page)
    if (!this.isAuthenticated || this.isLandingPage) {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < this.lastScrollY || currentScrollY < 100) {
        this.isNavbarVisible = true;
      } else if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
        this.isNavbarVisible = false;
      }
      
      this.isScrolled = currentScrollY > 20;
      this.lastScrollY = currentScrollY;
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  toggleSidebar() {
    this.sidebarService.toggleSidebar();
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar() {
    if (this.mobileSidebarOpen) {
      this.mobileSidebarOpen = false;
    }
  }

  private syncSidebarForViewport() {
    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) {
      this.mobileSidebarOpen = false;
      this.sidebarService.setSidebarCollapsed(true);
    } else {
      this.mobileSidebarOpen = false;
      // keep existing collapsed state from service for desktop
    }
  }

  openLoginModal() {
    this.modalService.openLoginModal();
    this.closeMobileMenu();
  }

  openSignupModal() {
    this.modalService.openSignupModal();
    this.closeMobileMenu();
  }

  openAskResultsDialog(): void {
    this.modalService.openAskResultsDialog(null, 'voice');
    if (this.mobileSidebarOpen) {
      this.closeMobileSidebar();
    }
  }

  logout() {
    this.authService.logout();
    this.sidebarService.setSidebarCollapsed(false);
    this.router.navigate(['/landing']);
    this.closeMobileMenu();
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.notificationsService.loadNotifications().subscribe();
    }
  }

  markNotificationRead(note: NotificationItem) {
    if (note.status === 1) return; // Already read
    this.notificationsService.markAsRead(note.id).subscribe();
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
    this.closeMobileMenu();
  }
}
