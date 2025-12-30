import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ModalService } from '../../../services/modal.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss']
})
export class LoginModalComponent implements OnInit, OnDestroy {
  isOpen = false;
  email = '';
  password = '';
  error = '';
  info = '';
  loading = false;
  private subscription: Subscription = new Subscription();

  constructor(
    private modalService: ModalService,
    private authService: AuthService,
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
    this.modalService.closeLoginModal();
  }

  openSignupModal() {
    this.modalService.closeLoginModal();
    this.modalService.openSignupModal();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
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
        // Redirect based on user role
        if (response.user?.role === 'Admin') {
          this.router.navigate(['/admin-dashboard']);
        } else {
          this.router.navigate(['/home']);
        }
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
          if (this.error?.toLowerCase().includes('pending')) {
            this.error = 'Your account is under review.';
          } else if (this.error?.toLowerCase().includes('rejected')) {
            this.error = 'Your account request was rejected.';
          }
        } else if (error.status === 404) {
          this.error = 'API endpoint not found. Please check the API configuration.';
        } else if (error.error?.message) {
          const message = error.error.message as string;
          if (message.toLowerCase().includes('pending')) {
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
