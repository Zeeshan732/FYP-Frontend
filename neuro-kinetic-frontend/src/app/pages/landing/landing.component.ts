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
  isRoleDropdownOpen = false;
  isInterestDropdownOpen = false;
  selectedRole = '';
  selectedInterest = '';
  selectedRoleText = 'Select your role';
  selectedInterestText = 'Select your interest';

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
      if (user?.role === 'Admin') {
        this.router.navigate(['/admin-dashboard']);
      } else {
        this.router.navigate(['/patient-test']);
      }
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.isRoleDropdownOpen = false;
      this.isInterestDropdownOpen = false;
    }
  }

  toggleDropdown(type: string) {
    if (type === 'role') {
      this.isRoleDropdownOpen = !this.isRoleDropdownOpen;
      this.isInterestDropdownOpen = false;
    } else if (type === 'interest') {
      this.isInterestDropdownOpen = !this.isInterestDropdownOpen;
      this.isRoleDropdownOpen = false;
    }
  }

  selectOption(type: string, value: string, text: string) {
    if (type === 'role') {
      this.selectedRole = value;
      this.selectedRoleText = text;
      this.isRoleDropdownOpen = false;
    } else if (type === 'interest') {
      this.selectedInterest = value;
      this.selectedInterestText = text;
      this.isInterestDropdownOpen = false;
    }
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
