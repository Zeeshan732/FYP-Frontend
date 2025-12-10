import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ModalService } from '../../services/modal.service';
import { AuthService } from '../../services/auth.service';
import { SidebarService } from '../../services/sidebar.service';

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
  
  // Sidebar state
  sidebarCollapsed = false;
  
  // User and role info
  currentUser: any = null;
  isAuthenticated = false;
  isAdmin = false;
  isResearcher = false;
  roleLabel = '';
  currentRoute: string = '';
  isLandingPage: boolean = false;
  private userSubscription?: Subscription;
  private routerSubscription?: Subscription;
  private sidebarSubscription?: Subscription;

  constructor(
    private modalService: ModalService,
    private authService: AuthService,
    private sidebarService: SidebarService,
    private router: Router
  ) {}

  ngOnInit() {
    this.lastScrollY = window.scrollY;
    
    // Subscribe to sidebar state
    this.sidebarSubscription = this.sidebarService.sidebarCollapsed$.subscribe(collapsed => {
      this.sidebarCollapsed = collapsed;
    });
    
    // Subscribe to user changes
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
      this.isAdmin = user?.role === 'Admin';
      this.isResearcher = user?.role === 'Researcher' || user?.role === 'MedicalProfessional';
      this.roleLabel = user?.role || '';
    });

    // Close mobile menu on route change and update route info
    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.currentRoute = event.urlAfterRedirects || event.url;
      this.isLandingPage = this.currentRoute === '/landing' || this.currentRoute === '/';
      this.closeMobileMenu();
    });
    
    // Initial route check
    this.currentRoute = this.router.url;
    this.isLandingPage = this.currentRoute === '/landing' || this.currentRoute === '/';
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
  }

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    // Hide/show navbar only when navbar is shown (not authenticated OR landing page)
    if (!this.isAuthenticated || this.isLandingPage) {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < this.lastScrollY || currentScrollY < 100) {
        this.isNavbarVisible = true;
      } else if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
        this.isNavbarVisible = false;
      }
      
      this.isScrolled = currentScrollY > 50;
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
  }

  openLoginModal() {
    this.modalService.openLoginModal();
    this.closeMobileMenu();
  }

  openSignupModal() {
    this.modalService.openSignupModal();
    this.closeMobileMenu();
  }

  logout() {
    this.authService.logout();
    this.sidebarService.setSidebarCollapsed(false);
    this.router.navigate(['/landing']);
    this.closeMobileMenu();
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
    this.closeMobileMenu();
  }
}
