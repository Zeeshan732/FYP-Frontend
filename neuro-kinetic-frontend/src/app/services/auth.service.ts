import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { User, AuthResponse, ValidationResponse } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

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
            this.setAuthData(response.token, response.user);
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
    researchFocus?: string;
    role?: 'Public' | 'Researcher' | 'MedicalProfessional' | 'Admin';
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

  // ========== USER MANAGEMENT ==========

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token') && !!this.currentUserSubject.value;
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

  // ========== PRIVATE METHODS ==========

  private setAuthData(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        this.clearAuthData();
      }
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }
}
