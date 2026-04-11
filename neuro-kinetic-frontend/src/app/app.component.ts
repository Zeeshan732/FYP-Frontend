import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { SidebarService } from './services/sidebar.service';
import { ModalService, AskResultsDialogState, GlobalNoticeState } from './services/modal.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = "NeuroSync-frontend";
  isAuthenticated = false;
  sidebarCollapsed = false;
  isCompactViewport = false;
  currentRoute: string = '';
  askResultsDialogState: AskResultsDialogState = { visible: false, riskPercent: null, mode: 'voice' };
  globalNotice: GlobalNoticeState = { visible: false, title: '', message: '' };
  private authSubscription?: Subscription;
  private sidebarSubscription?: Subscription;
  private routerSubscription?: Subscription;
  private askResultsDialogSubscription?: Subscription;
  private globalNoticeSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private sidebarService: SidebarService,
    private modalService: ModalService,
    private router: Router
  ) {}

  ngOnInit() {
    this.syncViewportState();

    // Subscribe to authentication state
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.toggleChatbaseVisibility(!!user);
    });
    // Set initial Chatbase visibility from current auth state
    this.toggleChatbaseVisibility(this.authService.isAuthenticated());

    // Subscribe to sidebar state
    this.sidebarSubscription = this.sidebarService.sidebarCollapsed$.subscribe(collapsed => {
      this.sidebarCollapsed = collapsed;
    });

    // Subscribe to router events to track current route
    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.currentRoute = event.urlAfterRedirects || event.url;
    });

    // Initial route check
    this.currentRoute = this.router.url;

    this.askResultsDialogSubscription = this.modalService.askResultsDialog$.subscribe(state => {
      this.askResultsDialogState = state;
    });

    this.globalNoticeSubscription = this.modalService.globalNotice$.subscribe(state => {
      this.globalNotice = state;
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.syncViewportState();
  }

  private syncViewportState(): void {
    this.isCompactViewport = window.innerWidth <= 1024;
  }

  onAskResultsDialogClose(): void {
    this.modalService.closeAskResultsDialog();
  }

  onGlobalNoticeVisible(visible: boolean): void {
    if (!visible) {
      this.modalService.closeGlobalNotice();
    }
  }

  closeGlobalNotice(): void {
    this.modalService.closeGlobalNotice();
  }

  private toggleChatbaseVisibility(show: boolean): void {
    if (typeof document !== 'undefined' && document.body) {
      if (show) {
        document.body.classList.add('user-logged-in');
      } else {
        document.body.classList.remove('user-logged-in');
      }
    }
  }

  ngOnDestroy() {
    this.toggleChatbaseVisibility(false);
    this.askResultsDialogSubscription?.unsubscribe();
    this.globalNoticeSubscription?.unsubscribe();
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.sidebarSubscription) {
      this.sidebarSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}
