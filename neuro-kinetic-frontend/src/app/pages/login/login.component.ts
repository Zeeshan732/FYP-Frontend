import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;
  info = '';

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

  onSubmit() {
    if (!this.email || !this.password) {
      this.error = 'Please enter both email and password';
      return;
    }

    this.error = '';
    this.loading = true;

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.loading = false;
    
        this.router.navigate(['/patient-test']);
      },
      error: (error) => {
        this.loading = false;
        console.error('Login error details:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        
        if (error.status === 0) {
          this.error = 'Unable to connect to the server. Please ensure the backend is running.';
        } else if (error.status === 401) {
          this.error = 'Invalid email or password. Please try again.';
        } else if (error.status === 404) {
          this.error = 'API endpoint not found. Please check the API configuration.';
        } else if (error.error?.message) {
          this.error = error.error.message;
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
