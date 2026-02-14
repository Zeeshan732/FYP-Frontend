import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  templateUrl: './oauth-callback.component.html',
  styleUrls: ['./oauth-callback.component.scss']
})
export class OAuthCallbackComponent implements OnInit {
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Get token and provider from query parameters
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const provider = params['provider'] || 'unknown';
      const error = params['error'];

      if (error) {
        this.error = `OAuth authentication failed: ${error}`;
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/login'], { queryParams: { error: 'oauth_failed' } });
        }, 3000);
        return;
      }

      if (!token) {
        this.error = 'No authentication token received. Please try again.';
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/login'], { queryParams: { error: 'no_token' } });
        }, 3000);
        return;
      }

      // Handle OAuth callback
      console.log('Processing OAuth callback:', { provider, tokenLength: token.length });
      this.authService.handleOAuthCallback(token, provider);
    });
  }
}
