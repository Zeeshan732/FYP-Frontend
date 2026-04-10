import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { User, AuthResponse, ValidationResponse } from '../models/api.models';

/** Session (JWT) expiry is set by the backend when issuing the token. Frontend expects 10–15 minutes; backend must match. */
export const SESSION_EXPIRY_MINUTES = 15;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private justLoggedIn = false; // Flag to track if we just logged in

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Load token and user from localStorage on service init
    this.loadUserFromStorage();
  }

  // ========== AUTHENTICATION ==========

  login(email: string, password: string): Observable<AuthResponse> {
    const url = `${this.apiUrl}/auth/login`;
    console.log('Login request to:', url);
    return this.http.post<AuthResponse>(url, { email, password })
      .pipe(
        tap((response: AuthResponse) => {
          console.log('Login response:', response);
          if (response.token && response.user && (response.status === 'Approved' || response.status === 'Activated' || !response.status)) {
            // Set auth data synchronously before any redirects
            console.log('About to call setAuthData with token length:', response.token?.length);
            this.setAuthData(response.token, response.user);
            
            // Wait a tick to ensure localStorage operations complete
            setTimeout(() => {
              console.log('After setAuthData - Token stored:', !!localStorage.getItem('token'));
              console.log('After setAuthData - User stored:', !!localStorage.getItem('user'));
              console.log('After setAuthData - isAuthenticated check:', this.isAuthenticated());
              console.log('After setAuthData - Current user subject value:', this.currentUserSubject.value);
            }, 0);
          } else {
            // Ensure we do not persist tokens for pending/rejected users
            this.clearAuthData();
          }
        })
      );
  }

  register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    institution?: string;
    clinicName?: string;
    licenseNumber?: string;
    licenseDocumentUrl?: string;
    researchFocus?: string;
    role?: 'Public' | 'MedicalProfessional';
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data)
      .pipe(
        tap((response: AuthResponse) => {
          // Admin accounts are approved but NOT automatically logged in
          // They need to manually log in after signup
          const isAdminAccount = response.user?.role === 'Admin';
          
          if (isAdminAccount) {
            // Clear auth data for admin accounts - they must log in manually
            this.clearAuthData();
          } else if (response.token && response.user && (response.status === 'Approved' || response.status === 'Activated' || !response.status)) {
            // Other approved accounts can be auto-logged in
            this.setAuthData(response.token, response.user);
          } else {
            // Pending accounts - no auto-login
            this.clearAuthData();
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  validateToken(): Observable<ValidationResponse> {
    return this.http.get<ValidationResponse>(`${this.apiUrl}/auth/validate`);
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`);
  }

  updateProfile(data: {
    firstName: string;
    lastName: string;
    institution?: string;
    researchFocus?: string;
  }): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/auth/profile`, data).pipe(
      tap((user) => {
        const token = localStorage.getItem('token');
        if (token) {
          localStorage.setItem('user', JSON.stringify(user));
        }
        this.currentUserSubject.next(user);
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/change-password`, {
      currentPassword,
      newPassword
    });
  }

  // ========== OAUTH AUTHENTICATION ==========

  /**
   * Initiate Google OAuth login
   * Redirects user to Google OAuth page
   */
  loginWithGoogle(): void {
    const url = `${this.apiUrl}/auth/google`;
    console.log('Redirecting to Google OAuth:', url);
    window.location.href = url;
  }

  /**
   * Initiate Facebook OAuth login
   * Redirects user to Facebook OAuth page
   */
  loginWithFacebook(): void {
    const url = `${this.apiUrl}/auth/facebook`;
    console.log('Redirecting to Facebook OAuth:', url);
    window.location.href = url;
  }

  /**
   * Handle OAuth callback
   * Called when user returns from OAuth provider
   * @param token JWT token from backend
   * @param provider OAuth provider name (google, facebook)
   */
  handleOAuthCallback(token: string, provider: string): void {
    console.log('OAuth callback received:', { provider, tokenLength: token?.length });
    
    if (!token) {
      console.error('No token received from OAuth callback');
      this.router.navigate(['/login'], { queryParams: { error: 'oauth_failed' } });
      return;
    }

    // Decode token to extract user info
    try {
      const user = this.decodeTokenUser(token);
      if (user) {
        // Handle account status before storing token
        const status = user.status;
        if (status === 'Pending') {
          console.warn('OAuth login: account is pending review');
          this.clearAuthData();
          this.router.navigate(['/login'], { queryParams: { error: 'pending' } });
          return;
        }
        if (status === 'Rejected') {
          console.warn('OAuth login: account request was rejected');
          this.clearAuthData();
          this.router.navigate(['/login'], { queryParams: { error: 'rejected' } });
          return;
        }
        if (status === 'Inactive') {
          console.warn('OAuth login: account is inactive');
          this.clearAuthData();
          this.router.navigate(['/login'], { queryParams: { error: 'inactive' } });
          return;
        }

        // Set auth data with token and user
        this.setAuthData(token, user);
        
        setTimeout(() => this.navigateForAuthenticatedUser(user), 100);
      } else {
        console.error('Failed to decode user from token');
        this.router.navigate(['/login'], { queryParams: { error: 'oauth_failed' } });
      }
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      // Try to validate token with backend as fallback
      this.validateToken().subscribe({
        next: (response) => {
          if (response.valid) {
            // Token is valid, try to get user from localStorage or make API call
            // For now, redirect to login with error
            this.router.navigate(['/login'], { queryParams: { error: 'oauth_decode_failed' } });
          } else {
            this.router.navigate(['/login'], { queryParams: { error: 'oauth_validation_failed' } });
          }
        },
        error: (error) => {
          console.error('Error validating token:', error);
          this.router.navigate(['/login'], { queryParams: { error: 'oauth_failed' } });
        }
      });
    }
  }

  /**
   * Decode user info from JWT token
   * @param token JWT token
   * @returns User object or null
   */
  private decodeTokenUser(token: string): User | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      
      // Extract user info from token claims
      // Adjust these based on your JWT token structure
      const user: User = {
        id: payload.sub || payload.userId || payload.id || 0,
        email: payload.email || '',
        firstName: payload.firstName || payload.given_name || '',
        lastName: payload.lastName || payload.family_name || '',
        role: payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 'Public',
        status: payload.status || 'Approved',
        provider: payload.provider,
        providerId: payload.providerId
      };
      
      return user;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // ========== USER MANAGEMENT ==========

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    // If no token or user data, not authenticated
    if (!token || !userStr) {
      return false;
    }
    
    // Check if token is expired
    // BUT: If we just logged in (justLoggedIn flag), skip expiration check
    // This prevents the token from being cleared immediately after login
    if (!this.justLoggedIn) {
      const isExpired = this.isTokenExpired(token);
      if (isExpired) {
        // Token expired, clear auth data
        this.clearAuthData();
        return false;
      }
    }
    
    // Check if user data exists in both localStorage and BehaviorSubject
    // If user exists in localStorage but not in BehaviorSubject, load it
    if (!this.currentUserSubject.value) {
      try {
        const user = JSON.parse(userStr) as User;
        this.currentUserSubject.next(user);
        return true;
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.clearAuthData();
        return false;
      }
    }
    
    // User data exists in both places, authenticated
    return true;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === role;
  }

  isResearcherOrAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'Researcher' || user?.role === 'Admin';
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'Admin';
  }

  /**
   * Default route after login or when an authenticated user hits a generic entry (e.g. /home, /landing).
   */
  navigateForAuthenticatedUser(user: User | null | undefined): void {
    if (!user) {
      this.router.navigate(['/landing']);
      return;
    }
    if (user.role === 'Admin') {
      this.router.navigate(['/admin-dashboard']);
      return;
    }
    if (user.role === 'MedicalProfessional') {
      this.router.navigate(['/clinician']);
      return;
    }
    this.router.navigate(['/home']);
  }

  // ========== PRIVATE METHODS ==========

  private setAuthData(token: string, user: User): void {
    try {
      console.log('setAuthData called with token length:', token?.length, 'user:', user);
      
      // Check if localStorage is available
      if (typeof(Storage) === "undefined") {
        console.error('localStorage is not available');
        return;
      }
      
      // Store token (both legacy key 'token' and explicit 'authToken')
      localStorage.setItem('token', token);
      localStorage.setItem('authToken', token);
      const verifyToken = localStorage.getItem('token');
      console.log('Token setItem result - stored:', !!verifyToken, 'matches:', verifyToken === token);
      
      // Store user
      const userStr = JSON.stringify(user);
      localStorage.setItem('user', userStr);
      const verifyUser = localStorage.getItem('user');
      console.log('User setItem result - stored:', !!verifyUser, 'matches:', verifyUser === userStr);
      
      // Verify both are stored
      const finalToken = localStorage.getItem('token');
      const finalUser = localStorage.getItem('user');
      console.log('Final verification - token:', !!finalToken, 'user:', !!finalUser);
      
      if (!finalToken || !finalUser) {
        console.error('CRITICAL: localStorage.setItem failed! Token:', !!finalToken, 'User:', !!finalUser);
        throw new Error('Failed to store auth data in localStorage');
      }
      
      this.currentUserSubject.next(user);
      this.justLoggedIn = true;
      
      // Clear the flag after a short delay to allow redirect to complete
      setTimeout(() => {
        this.justLoggedIn = false;
      }, 2000);
      
      console.log('setAuthData completed successfully, currentUserSubject:', this.currentUserSubject.value);
    } catch (error) {
      console.error('CRITICAL ERROR in setAuthData:', error);
      throw error;
    }
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      // Check if token is expired before loading user
      if (this.isTokenExpired(token)) {
        console.log('Token expired, clearing auth data');
        this.clearAuthData();
        return;
      }
      
      try {
        const user = JSON.parse(userStr) as User;
        this.currentUserSubject.next(user);
        
        // Validate token with backend on app startup (but don't block)
        // Only validate if we're not in the middle of a login flow
        // Delay validation by 2 seconds to allow login redirect to complete
        setTimeout(() => {
          // Only validate if we haven't just logged in
          if (!this.justLoggedIn) {
            this.validateTokenOnStartup();
          }
        }, 2000);
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        this.clearAuthData();
      }
    }
  }

  /**
   * Check if JWT token is expired by decoding the token
   * JWT tokens have 3 parts: header.payload.signature
   * The payload contains the expiration time (exp) claim
   */
  private isTokenExpired(token: string): boolean {
    try {
      // Decode the token (we only need the payload, no verification needed for expiration check)
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Invalid token format - expected 3 parts, got:', parts.length);
        return true;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      console.log('Token payload:', payload);
      
      // Check if token has expiration claim
      if (!payload.exp) {
        // No expiration claim - consider it expired for security
        console.log('Token has no exp claim, considering expired');
        return true;
      }
      
      // exp is in seconds, Date.now() is in milliseconds
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      
      // Add 1 minute buffer to account for clock skew (reduced from 5 minutes)
      // This prevents tokens from being marked as expired when they still have time left
      const bufferTime = 1 * 60 * 1000; // 1 minute
      
      const isExpired = currentTime >= (expirationTime - bufferTime);
      
      console.log('Token expiration check:', {
        expirationTime: new Date(expirationTime).toISOString(),
        currentTime: new Date(currentTime).toISOString(),
        timeUntilExpiry: Math.round(timeUntilExpiry / 1000) + ' seconds',
        bufferTime: Math.round(bufferTime / 1000) + ' seconds',
        isExpired: isExpired
      });
      
      return isExpired;
    } catch (error) {
      console.error('Error decoding token:', error);
      // If we can't decode the token, consider it expired
      return true;
    }
  }

  /**
   * Validate token with backend on app startup
   * This ensures the token is still valid on the server side
   */
  private validateTokenOnStartup(): void {
    // Don't validate if we just logged in (token is fresh)
    if (this.justLoggedIn) {
      console.log('Skipping token validation - user just logged in');
      return;
    }
    
    this.validateToken().subscribe({
      next: (response) => {
        if (!response.valid) {
          console.log('Token validation failed, clearing auth data');
          this.clearAuthData();
        }
        // If valid, user data is already loaded, no action needed
      },
      error: (error) => {
        console.error('Token validation error:', error);
        // Only clear if it's not a fresh login
        if (!this.justLoggedIn) {
          this.clearAuthData();
        }
      }
    });
  }

  private clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }
}
