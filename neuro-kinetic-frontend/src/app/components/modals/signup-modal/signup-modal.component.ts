import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ModalService } from '../../../services/modal.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-signup-modal',
  templateUrl: './signup-modal.component.html',
  styleUrls: ['./signup-modal.component.scss']
})
export class SignupModalComponent implements OnInit, OnDestroy {
  isOpen = false;
  firstName = '';
  lastName = '';
  email = '';
  institution = '';
  role: 'Public' | 'Researcher' | 'MedicalProfessional' = 'Public';
  password = '';
  confirmPassword = '';
  error = '';
  info = '';
  loading = false;
  private subscription: Subscription = new Subscription();

  // Available roles for signup (Admin cannot be self-selected)
  roleOptions = [
    { label: 'Public User', value: 'Public' },
    { label: 'Researcher', value: 'Researcher' },
    { label: 'Medical Professional', value: 'MedicalProfessional' }
  ];

  constructor(
    private modalService: ModalService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.subscription.add(
      this.modalService.signupModal$.subscribe(isOpen => {
        this.isOpen = isOpen;
        // Reset form when modal opens
        if (isOpen) {
          this.firstName = '';
          this.lastName = '';
          this.email = '';
          this.institution = '';
          this.role = 'Public';
          this.password = '';
          this.confirmPassword = '';
          this.error = '';
          this.info = '';
          this.loading = false;
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  closeModal() {
    this.modalService.closeSignupModal();
  }

  openLoginModal() {
    this.modalService.closeSignupModal();
    this.modalService.openLoginModal();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  onSubmit() {
    // Validation
    if (!this.firstName || !this.lastName || !this.email || !this.password) {
      this.error = 'Please fill in all required fields';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters long';
      return;
    }

    this.error = '';
    this.info = '';
    this.loading = true;

    this.authService.register({
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      institution: this.institution || undefined,
      researchFocus: undefined,
      role: this.role
    }).subscribe({
      next: (response) => {
        this.loading = false;
        // Registration now returns a pending status and message without JWT
        this.info = response.message || 'Registration submitted. Your account is under review.';
        // Do not navigate or auto-login
      },
      error: (error) => {
        this.loading = false;
        if (error.error?.message) {
          this.error = error.error.message;
        } else if (error.error?.errors) {
          const errors = Object.values(error.error.errors).flat();
          this.error = errors.join(', ');
        } else {
          this.error = 'Registration failed. Please try again.';
        }
        console.error('Registration error:', error);
      }
    });
  }
}
