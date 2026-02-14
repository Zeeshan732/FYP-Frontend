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
  showContactAdmin = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.route.queryParamMap.subscribe(params => {
      if (params.get('redirect') === 'true') {
        this.info = 'Please sign in to access that page.';
      }

      const errorParam = params.get('error');
      if (errorParam) {
        this.handleErrorParam(errorParam);
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

  loginWithGoogle() {
    console.log('Google login button clicked');
    try {
      this.authService.loginWithGoogle();
    } catch (error) {
      console.error('Error initiating Google login:', error);
      this.error = 'Failed to initiate Google login. Please try again.';
    }
  }

  loginWithFacebook() {
    console.log('Facebook login button clicked');
    try {
      this.authService.loginWithFacebook();
    } catch (error) {
      console.error('Error initiating Facebook login:', error);
      this.error = 'Failed to initiate Facebook login. Please try again.';
    }
  }

  /**
   * Handle error query param from OAuth/login redirects
   */
  private handleErrorParam(error: string) {
    switch (error) {
      case 'pending':
        this.error = 'Your account is under review.';
        break;
      case 'rejected':
        this.error = 'Your account request was rejected.';
        break;
      case 'inactive':
        this.error = 'Your account is inactive. Please contact admin.';
        this.showContactAdmin = true;
        break;
      case 'oauth_failed':
        this.error = 'OAuth login failed. Please try again or use email/password.';
        break;
      case 'no_token':
        this.error = 'Authentication token was not provided. Please try logging in again.';
        break;
      case 'oauth_decode_failed':
      case 'oauth_validation_failed':
        this.error = 'We could not verify your login. Please try again.';
        break;
      default:
        // Do not override existing error if backend set one
        if (!this.error) {
          this.error = 'Login could not be completed. Please try again.';
        }
        break;
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
        
        // Small delay to ensure auth data is fully set before redirect
        setTimeout(() => {
          // Double-check authentication before redirect
          const isAuth = this.authService.isAuthenticated();
          console.log('Post-login auth check:', isAuth);
          console.log('Current user:', this.authService.getCurrentUser());
          
          if (isAuth) {
            // Redirect based on user role
            if (response.user?.role === 'Admin') {
              this.router.navigate(['/admin-dashboard']);
            } else {
              this.router.navigate(['/patient-test']);
            }
          } else {
            console.error('Authentication check failed after login');
            this.error = 'Login successful but authentication check failed. Please try again.';
          }
        }, 50);
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
