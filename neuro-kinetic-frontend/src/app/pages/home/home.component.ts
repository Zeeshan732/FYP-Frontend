import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if user is authenticated
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      
      // Redirect admins to admin dashboard
      if (user?.role === 'Admin') {
        this.router.navigate(['/admin-dashboard']);
      } else {
        // For other users, redirect to patient-test
        this.router.navigate(['/patient-test']);
      }
    } else {
      // Not authenticated, redirect to landing page
      this.router.navigate(['/landing']);
    }
  }
}
