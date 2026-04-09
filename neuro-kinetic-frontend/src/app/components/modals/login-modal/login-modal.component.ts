import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ModalService } from '../../../services/modal.service';
import { AuthService } from '../../../services/auth.service';
import { PasswordResetService } from '../../../services/password-reset.service';

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss']
})
export class LoginModalComponent implements OnInit, OnDestroy {
  isOpen = false;
  email = '';
  password = '';
  resetEmail = '';
  sentResetEmail = '';
  error = '';
  info = '';
  loading = false;
  showContactAdmin = false;
  modalView: 'login' | 'signup' | 'forgot' | 'email-sent' = 'login';
  selectedRole: 'patient' | 'clinician' = 'patient';
  showPassword = false;
  showConfirmPassword = false;
  passwordStrength: 0 | 1 | 2 | 3 | 4 = 0;
  private subscription: Subscription = new Subscription();

  constructor(
    private modalService: ModalService,
    private authService: AuthService,
    private passwordResetService: PasswordResetService,
    private router: Router
  ) {}

  ngOnInit() {
    this.subscription.add(
      this.modalService.loginModal$.subscribe(isOpen => {
        this.isOpen = isOpen;
        // Reset form when modal opens
        if (isOpen) {
          this.email = '';
          this.password = '';
          this.resetEmail = '';
          this.sentResetEmail = '';
          this.error = '';
          this.info = '';
          this.loading = false;
          this.showContactAdmin = false;
          this.modalView = 'login';
          this.showPassword = false;
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  closeModal() {
    this.modalService.closeLoginModal();
  }

  close() {
    this.closeModal();
  }

  openSignupModal() {
    this.modalService.closeLoginModal();
    this.modalService.openSignupModal();
  }

  openForgotPassword() {
    this.switchTo('forgot');
  }

  openContactPage() {
    this.modalService.closeLoginModal();
    this.router.navigate(['/contact']);
  }

  loginWithGoogle() {
    console.log('Google login button clicked (modal)');
    try {
      this.authService.loginWithGoogle();
    } catch (error) {
      console.error('Error initiating Google login:', error);
      this.error = 'Failed to initiate Google login. Please try again.';
    }
  }

  loginWithFacebook() {
    console.log('Facebook login button clicked (modal)');
    try {
      this.authService.loginWithFacebook();
    } catch (error) {
      console.error('Error initiating Facebook login:', error);
      this.error = 'Failed to initiate Facebook login. Please try again.';
    }
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeOnOverlay(event: Event) {
    this.onBackdropClick(event);
  }

  switchTo(view: 'login' | 'signup' | 'forgot' | 'email-sent'): void {
    if (view === 'signup') {
      this.openSignupModal();
      return;
    }
    this.modalView = view;
    this.error = '';
    this.info = '';
    this.loading = false;
  }

  selectRole(role: 'patient' | 'clinician'): void {
    this.selectedRole = role;
  }

  checkPasswordStrength(value: string): void {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    this.passwordStrength = score as 0 | 1 | 2 | 3 | 4;
  }

  get strengthClass(): string {
    if (this.passwordStrength <= 1) return 'weak';
    if (this.passwordStrength <= 2) return 'medium';
    return 'strong';
  }

  get isLoggingIn(): boolean {
    return this.loading;
  }

  sendResetLink(): void {
    const email = this.resetEmail?.trim();
    if (!email) {
      this.error = 'Please enter your email address.';
      return;
    }
    this.error = '';
    this.info = '';
    this.loading = true;

    this.passwordResetService.requestOTP(email).subscribe({
      next: (response) => {
        this.loading = false;
        this.sentResetEmail = email;
        this.info = response?.message || `Reset link sent to ${email}`;
        this.switchTo('email-sent');
      },
      error: (error) => {
        this.loading = false;
        const apiMessage = (error?.error?.message || '').toString().toLowerCase();
        if (error?.status === 404 || apiMessage.includes('not found') || apiMessage.includes('does not exist')) {
          this.error = 'No account found with this email address.';
          return;
        }
        if (error?.status === 400 || apiMessage.includes('invalid')) {
          this.error = 'Please enter a valid email address.';
          return;
        }
        this.error = error?.error?.message || 'Failed to send reset link. Please try again.';
      }
    });
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.error = 'Please enter both email and password';
      return;
    }

    this.error = '';
    this.info = '';
    this.loading = true;

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.status && response.status !== 'Approved' && response.status !== 'Activated') {
          this.error = response.message || (response.status === 'Pending'
            ? 'Your account is under review.'
            : 'Your account request was rejected.');
          return;
        }

        if (!response.token || !response.user) {
          this.error = response.message || 'Login could not be completed. Please try again.';
          return;
        }

        this.closeModal();
        
        // Small delay to ensure auth data is fully set before redirect
        setTimeout(() => {
          // Double-check authentication before redirect
          if (this.authService.isAuthenticated()) {
            this.authService.navigateForAuthenticatedUser(response.user);
          } else {
            console.error('Authentication check failed after login');
            this.error = 'Login successful but authentication check failed. Please try again.';
            this.modalService.openLoginModal(); // Reopen modal to show error
          }
        }, 100);
      },
      error: (error) => {
        this.loading = false;
        console.error('Login error details:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        
        if (error.status === 0) {
          this.error = 'Unable to connect to the server. Please ensure the backend is running.';
        } else if (error.status === 401) {
          this.error = error.error?.message || 'Invalid email or password. Please try again.';
          if (this.error?.toLowerCase().includes('inactive')) {
            this.error = 'Your account is inactive. Please contact admin.';
            this.showContactAdmin = true;
          } else if (this.error?.toLowerCase().includes('pending')) {
            this.error = 'Your account is under review.';
          } else if (this.error?.toLowerCase().includes('rejected')) {
            this.error = 'Your account request was rejected.';
          }
        } else if (error.status === 404) {
          this.error = 'API endpoint not found. Please check the API configuration.';
        } else if (error.error?.message) {
          const message = error.error.message as string;
          if (message.toLowerCase().includes('inactive')) {
            this.error = 'Your account is inactive. Please contact admin.';
            this.showContactAdmin = true;
          } else if (message.toLowerCase().includes('pending')) {
            this.error = 'Your account is under review.';
          } else if (message.toLowerCase().includes('rejected')) {
            this.error = 'Your account request was rejected.';
          } else {
            this.error = message;
          }
        } else if (error.error?.errors) {
          const errors = Object.values(error.error.errors).flat();
          this.error = errors.join(', ');
        } else {
          this.error = `Login failed (${error.status || 'Unknown error'}). Please check your credentials and try again.`;
        }
      }
    });
  }
}
