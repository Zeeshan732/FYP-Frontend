import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface PasswordResetResponse {
  message: string;
  valid?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Step 1: Request password reset OTP
   */
  requestOTP(email: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(
      `${this.apiUrl}/auth/forgot-password`,
      { email } as ForgotPasswordRequest
    );
  }

  /**
   * Step 2: Verify OTP
   */
  verifyOTP(email: string, otp: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(
      `${this.apiUrl}/auth/verify-otp`,
      { email, otp } as VerifyOTPRequest
    );
  }

  /**
   * Step 3: Reset password
   */
  resetPassword(email: string, otp: string, newPassword: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(
      `${this.apiUrl}/auth/reset-password`,
      { email, otp, newPassword } as ResetPasswordRequest
    );
  }
}

