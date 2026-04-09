import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
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
    private modalService: ModalService
  ) {}

  ngOnInit() {
    // If user is authenticated (with valid token), redirect to appropriate page
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      this.authService.navigateForAuthenticatedUser(user);
      return;
    }

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
