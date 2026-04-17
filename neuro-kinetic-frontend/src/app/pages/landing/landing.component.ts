import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private modalService: ModalService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    // If user is authenticated (with valid token), redirect to appropriate page
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      this.authService.navigateForAuthenticatedUser(user);
      return;
    }

    this.route.queryParams
      .pipe(
        filter((p) => !!p['reason']),
        take(1)
      )
      .subscribe((params) => {
        const reason = params['reason'];
        if (reason === 'clinician_pending') {
          this.messageService.add({
            severity: 'warn',
            summary: 'Account under review',
            detail:
              'Your clinician account is awaiting admin approval. You will be able to sign in once it is approved.',
            life: 6000
          });
        } else if (reason === 'clinician_rejected') {
          this.messageService.add({
            severity: 'error',
            summary: 'Account not approved',
            detail:
              'Your clinician account request has been rejected. Please contact support if you need help.',
            life: 8000
          });
        }
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { reason: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      });

    if (this.route.snapshot.data['openLoginModal']) {
      this.modalService.openLoginModal();
    }
    
    this.observeElements();
  }

  @HostListener('window:scroll')
  onScroll() {
    this.observeElements();
  }

  private observeElements() {
    const elements = document.querySelectorAll('.scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-up');
    
    elements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      const elementVisible = 150;
      
      if (elementTop < window.innerHeight - elementVisible) {
        element.classList.add('animate');
      }
    });
  }
}
