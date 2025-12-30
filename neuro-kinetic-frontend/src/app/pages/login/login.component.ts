import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  error = '';
  loading = false;
  info = '';
  success = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.route.queryParamMap.subscribe(params => {
      if (params.get('redirect') === 'true') {
        this.info = 'Please sign in to access that page.';
      }
    });
  }

  ngOnInit() {
    // If user is already authenticated, redirect to appropriate dashboard
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      if (user?.role === 'Admin') {
        this.router.navigate(['/admin-dashboard']);
      } else {
        this.router.navigate(['/patient-test']);
      }
    }
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.error = 'Please enter both email and password';
      return;
    }

    this.error = '';
    this.success = '';
    this.loading = true;

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.loading = false;
        // Respect account status responses from backend
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

        this.success = 'Login successful.';
        
        // Redirect based on user role
        if (response.user?.role === 'Admin') {
          this.router.navigate(['/admin-dashboard']);
        } else {
          this.router.navigate(['/patient-test']);
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
          // Use backend-provided message when available
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
