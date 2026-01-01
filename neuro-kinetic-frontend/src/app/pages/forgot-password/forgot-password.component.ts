import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PasswordResetService } from '../../services/password-reset.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  // OTP expiration time in milliseconds (1 minute = 60 seconds)
  private readonly OTP_EXPIRATION_MS = 1 * 60 * 1000; // 1 minute
  
  // Step 1: Request OTP
  email = '';
  step1Loading = false;
  step1Success = false;

  // Step 2: Verify OTP
  otp = '';
  step2Loading = false;
  step2Verified = false;
  otpExpiresAt: Date | null = null;
  resendCooldown = 0;
  private resendCooldownInterval: any;
  private otpTimerInterval: any;
  otpTimeRemaining: string = '';

  // Step 3: Reset Password
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  step3Loading = false;
  step3Success = false;

  // Current step (1, 2, or 3)
  currentStep = 1;

  // Errors
  errors: {
    email?: string;
    otp?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  } = {};

  constructor(
    private passwordResetService: PasswordResetService,
    private router: Router
  ) {}

  ngOnInit() {
    // Start resend cooldown timer if needed
    this.startResendCooldownTimer();
  }

  ngOnDestroy() {
    if (this.resendCooldownInterval) {
      clearInterval(this.resendCooldownInterval);
    }
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
    }
  }

  // ========== STEP 1: REQUEST OTP ==========

  validateEmail(): boolean {
    this.errors.email = '';
    if (!this.email) {
      this.errors.email = 'Email is required';
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errors.email = 'Please enter a valid email address';
      return false;
    }
    return true;
  }

  onRequestOTP() {
    if (!this.validateEmail()) {
      return;
    }

    this.step1Loading = true;
    this.errors.general = '';

    this.passwordResetService.requestOTP(this.email).subscribe({
      next: (response) => {
        this.step1Loading = false;
        this.step1Success = true;
        // Set OTP expiration (1 minute from now - matches backend setting)
        this.otpExpiresAt = new Date(Date.now() + this.OTP_EXPIRATION_MS);
        // Start OTP countdown timer
        this.startOTPTimer();
        // Auto-advance to step 2
        setTimeout(() => {
          this.currentStep = 2;
        }, 1500);
      },
      error: (error) => {
        this.step1Loading = false;
        // Always show success message (security best practice - don't reveal if email exists)
        this.step1Success = true;
        this.otpExpiresAt = new Date(Date.now() + this.OTP_EXPIRATION_MS);
        // Start OTP countdown timer
        this.startOTPTimer();
        setTimeout(() => {
          this.currentStep = 2;
        }, 1500);
      }
    });
  }

  // ========== STEP 2: VERIFY OTP ==========

  validateOTP(): boolean {
    this.errors.otp = '';
    if (!this.otp) {
      this.errors.otp = 'OTP is required';
      return false;
    }
    if (!/^\d{6}$/.test(this.otp)) {
      this.errors.otp = 'OTP must be 6 digits';
      return false;
    }
    return true;
  }

  onOTPInput(event: any) {
    // Only allow numeric input
    const value = event.target.value.replace(/\D/g, '');
    // Limit to 6 digits
    this.otp = value.slice(0, 6);
    
    // Auto-submit when 6 digits entered
    if (this.otp.length === 6) {
      this.onVerifyOTP();
    }
  }

  onVerifyOTP() {
    if (!this.validateOTP()) {
      return;
    }

    // Check if OTP is expired
    if (this.otpExpiresAt && new Date() > this.otpExpiresAt) {
      this.errors.otp = 'OTP has expired. Please request a new one.';
      return;
    }

    this.step2Loading = true;
    this.errors.general = '';

    this.passwordResetService.verifyOTP(this.email, this.otp).subscribe({
      next: (response) => {
        this.step2Loading = false;
        if (response.valid) {
          this.step2Verified = true;
          // Stop OTP timer since OTP is verified
          this.stopOTPTimer();
          // Auto-advance to step 3
          setTimeout(() => {
            this.currentStep = 3;
          }, 1000);
        } else {
          this.errors.otp = 'Invalid or expired OTP';
        }
      },
      error: (error) => {
        this.step2Loading = false;
        this.errors.otp = error.error?.message || 'Invalid or expired OTP';
      }
    });
  }

  onResendOTP() {
    if (this.resendCooldown > 0) {
      return;
    }

    this.resendCooldown = 60;
    this.startResendCooldownTimer();
    this.otp = '';
    this.errors.otp = '';
    this.step2Verified = false;

    this.passwordResetService.requestOTP(this.email).subscribe({
      next: () => {
        this.otpExpiresAt = new Date(Date.now() + this.OTP_EXPIRATION_MS);
        // Restart OTP timer
        this.startOTPTimer();
        // Show success message (optional - can be added to template)
      },
      error: () => {
        // Still reset expiration (security best practice)
        this.otpExpiresAt = new Date(Date.now() + this.OTP_EXPIRATION_MS);
        // Restart OTP timer
        this.startOTPTimer();
      }
    });
  }

  startResendCooldownTimer() {
    if (this.resendCooldownInterval) {
      clearInterval(this.resendCooldownInterval);
    }
    this.resendCooldownInterval = setInterval(() => {
      if (this.resendCooldown > 0) {
        this.resendCooldown--;
      } else {
        clearInterval(this.resendCooldownInterval);
      }
    }, 1000);
  }

  startOTPTimer() {
    // Clear existing timer if any
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
    }
    
    // Update immediately
    this.updateOTPTimeRemaining();
    
    // Update every second
    this.otpTimerInterval = setInterval(() => {
      this.updateOTPTimeRemaining();
      
      // Stop timer if expired
      if (this.isOTPExpired()) {
        clearInterval(this.otpTimerInterval);
      }
    }, 1000);
  }

  stopOTPTimer() {
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
      this.otpTimerInterval = null;
    }
  }

  updateOTPTimeRemaining() {
    if (!this.otpExpiresAt) {
      this.otpTimeRemaining = '';
      return;
    }
    
    const now = new Date();
    const diff = this.otpExpiresAt.getTime() - now.getTime();
    
    if (diff <= 0) {
      this.otpTimeRemaining = 'Expired';
      this.stopOTPTimer();
      return;
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    this.otpTimeRemaining = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getOTPTimeRemaining(): string {
    return this.otpTimeRemaining;
  }

  isOTPExpired(): boolean {
    if (!this.otpExpiresAt) {
      return false;
    }
    return new Date() > this.otpExpiresAt;
  }

  // ========== STEP 3: RESET PASSWORD ==========

  validatePassword(): boolean {
    this.errors.password = '';
    this.errors.confirmPassword = '';

    if (!this.newPassword) {
      this.errors.password = 'Password is required';
      return false;
    }

    if (this.newPassword.length < 6) {
      this.errors.password = 'Password must be at least 6 characters';
      return false;
    }

    if (!this.confirmPassword) {
      this.errors.confirmPassword = 'Please confirm your password';
      return false;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errors.confirmPassword = 'Passwords do not match';
      return false;
    }

    return true;
  }

  onResetPassword() {
    if (!this.validatePassword()) {
      return;
    }

    // Check if OTP is expired
    if (this.isOTPExpired()) {
      this.errors.general = 'OTP has expired. Please request a new one.';
      this.currentStep = 1;
      this.step1Success = false;
      return;
    }

    this.step3Loading = true;
    this.errors.general = '';

    this.passwordResetService.resetPassword(this.email, this.otp, this.newPassword).subscribe({
      next: (response) => {
        this.step3Loading = false;
        this.step3Success = true;
        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.step3Loading = false;
        this.errors.general = error.error?.message || 'Failed to reset password. Please try again.';
      }
    });
  }

  // ========== NAVIGATION ==========

  goToStep(step: number) {
    if (step === 1) {
      this.currentStep = 1;
      this.step1Success = false;
      this.email = '';
      this.errors = {};
      // Stop OTP timer when going back to step 1
      this.stopOTPTimer();
      this.otpExpiresAt = null;
      this.otpTimeRemaining = '';
    } else if (step === 2 && this.step1Success) {
      this.currentStep = 2;
      this.otp = '';
      this.errors.otp = '';
      // Restart timer if OTP expiration is set
      if (this.otpExpiresAt && !this.isOTPExpired()) {
        this.startOTPTimer();
      }
    } else if (step === 3 && this.step2Verified) {
      this.currentStep = 3;
      this.errors.password = '';
      this.errors.confirmPassword = '';
      // Stop OTP timer when moving to step 3
      this.stopOTPTimer();
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}

