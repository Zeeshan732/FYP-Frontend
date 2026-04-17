import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { ModalService } from '../../../services/modal.service';
import { AuthService } from '../../../services/auth.service';
import { PasswordResetService } from '../../../services/password-reset.service';

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss']
})
export class LoginModalComponent implements OnInit, OnDestroy {
  isOpen = false;
  email = '';
  password = '';
  resetEmail = '';
  sentResetEmail = '';
  /** Step after email: OTP + new password (API: POST /auth/reset-password) */
  resetOtp = '';
  newPasswordReset = '';
  confirmNewPasswordReset = '';
  error = '';
  info = '';
  loading = false;
  showContactAdmin = false;
  modalView: 'login' | 'signup' | 'forgot' | 'email-sent' | 'otp-reset' = 'login';
  selectedRole: 'patient' | 'clinician' = 'patient';
  showPassword = false;
  showConfirmPassword = false;
  passwordStrength: 0 | 1 | 2 | 3 | 4 = 0;
  private subscription: Subscription = new Subscription();

  /** Must match API `RequestPasswordResetOTPAsync` expiry */
  readonly OTP_VALID_SECONDS = 60;
  /** Seconds remaining after code is sent; null = no active window */
  otpCountdownSec: number | null = null;
  otpExpired = false;
  private otpIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private modalService: ModalService,
    private authService: AuthService,
    private passwordResetService: PasswordResetService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService
  ) {}

  private toastOk(summary: string, detail: string): void {
    this.messageService.add({ severity: 'success', summary, detail, life: 2000 });
  }

  private toastErr(summary: string, detail: string): void {
    this.messageService.add({ severity: 'error', summary, detail, life: 2000 });
  }

  private toastWarn(summary: string, detail: string): void {
    this.messageService.add({ severity: 'warn', summary, detail, life: 2000 });
  }

  ngOnInit() {
    this.subscription.add(
      this.modalService.loginModal$.subscribe(isOpen => {
        this.isOpen = isOpen;
        if (!isOpen) {
          this.clearOtpTimer();
        }
        // Reset form when modal opens
        if (isOpen) {
          this.email = '';
          this.password = '';
          this.resetEmail = '';
          this.sentResetEmail = '';
          this.resetOtp = '';
          this.newPasswordReset = '';
          this.confirmNewPasswordReset = '';
          this.error = '';
          this.info = '';
          this.loading = false;
          this.showContactAdmin = false;
          this.modalView = 'login';
          this.showPassword = false;
          this.otpCountdownSec = null;
          this.otpExpired = false;
          this.clearOtpTimer();
        }
      })
    );
  }

  ngOnDestroy() {
    this.clearOtpTimer();
    this.subscription.unsubscribe();
  }

  /** Display MM:SS for the active OTP window */
  get otpCountdownMmSs(): string {
    if (this.otpCountdownSec == null || this.otpCountdownSec < 0) {
      return '00:00';
    }
    const m = Math.floor(this.otpCountdownSec / 60);
    const s = this.otpCountdownSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private clearOtpTimer(): void {
    if (this.otpIntervalId != null) {
      clearInterval(this.otpIntervalId);
      this.otpIntervalId = null;
    }
  }

  private startOtpCountdown(): void {
    this.clearOtpTimer();
    this.otpExpired = false;
    this.otpCountdownSec = this.OTP_VALID_SECONDS;
    this.otpIntervalId = setInterval(() => {
      if (this.otpCountdownSec == null) {
        return;
      }
      if (this.otpCountdownSec <= 1) {
        this.clearOtpTimer();
        this.otpCountdownSec = 0;
        this.onOtpWindowExpired();
        this.cdr.markForCheck();
        return;
      }
      this.otpCountdownSec--;
      this.cdr.markForCheck();
    }, 1000);
  }

  private onOtpWindowExpired(): void {
    this.otpExpired = true;
    this.otpCountdownSec = 0;
    this.modalService.openGlobalNotice(
      'Verification code expired',
      'Your one-time password is no longer valid. Please request a new verification code and try again.'
    );
    this.switchTo('forgot');
  }

  closeModal() {
    this.modalService.closeLoginModal();
  }

  close() {
    this.closeModal();
  }

  openSignupModal() {
    this.modalService.closeLoginModal();
    this.modalService.openSignupModal();
  }

  openForgotPassword() {
    this.switchTo('forgot');
  }

  openContactPage() {
    this.modalService.closeLoginModal();
    this.router.navigate(['/contact']);
  }

  loginWithGoogle() {
    console.log('Google login button clicked (modal)');
    try {
      this.authService.loginWithGoogle();
    } catch (error) {
      console.error('Error initiating Google login:', error);
      this.error = 'Failed to initiate Google login. Please try again.';
    }
  }

  loginWithFacebook() {
    console.log('Facebook login button clicked (modal)');
    try {
      this.authService.loginWithFacebook();
    } catch (error) {
      console.error('Error initiating Facebook login:', error);
      this.error = 'Failed to initiate Facebook login. Please try again.';
    }
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeOnOverlay(event: Event) {
    this.onBackdropClick(event);
  }

  switchTo(view: 'login' | 'signup' | 'forgot' | 'email-sent' | 'otp-reset'): void {
    if (view === 'signup') {
      this.openSignupModal();
      return;
    }
    if (view === 'login') {
      this.clearOtpTimer();
      this.otpCountdownSec = null;
      this.otpExpired = false;
    }
    this.modalView = view;
    this.error = '';
    this.info = '';
    this.loading = false;
  }

  selectRole(role: 'patient' | 'clinician'): void {
    this.selectedRole = role;
  }

  checkPasswordStrength(value: string): void {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    this.passwordStrength = score as 0 | 1 | 2 | 3 | 4;
  }

  get strengthClass(): string {
    if (this.passwordStrength <= 1) return 'weak';
    if (this.passwordStrength <= 2) return 'medium';
    return 'strong';
  }

  get isLoggingIn(): boolean {
    return this.loading;
  }

  sendResetLink(): void {
    const email = this.resetEmail?.trim();
    if (!email) {
      this.error = 'Please enter your email address.';
      return;
    }
    this.error = '';
    this.info = '';
    this.loading = true;

    this.passwordResetService.requestOTP(email).subscribe({
      next: (response) => {
        this.loading = false;
        this.sentResetEmail = email;
        this.otpExpired = false;
        this.switchTo('email-sent');
        this.info = response?.message || `Verification code sent to ${email}`;
        this.startOtpCountdown();
        this.toastOk(
          'Verification code sent',
          `If an account exists for ${email}, check your inbox for the 6-digit code.`
        );
      },
      error: (error) => {
        this.loading = false;
        const apiMessage = (error?.error?.message || '').toString().toLowerCase();
        if (error?.status === 404 || apiMessage.includes('not found') || apiMessage.includes('does not exist')) {
          this.error = 'No account found with this email address.';
          this.toastErr('Could not send code', this.error);
          return;
        }
        if (error?.status === 400 || apiMessage.includes('invalid')) {
          this.error = 'Please enter a valid email address.';
          this.toastErr('Invalid email', this.error);
          return;
        }
        this.error = error?.error?.message || 'Failed to send reset link. Please try again.';
        this.toastErr('Request failed', this.error);
      }
    });
  }

  /** Step 2–3: submit OTP + new password (backend validates OTP in one call). */
  submitOtpReset(): void {
    if (this.otpExpired) {
      this.modalService.openGlobalNotice(
        'Verification code expired',
        'Please request a new verification code from the password reset screen, then enter it within 60 seconds.'
      );
      return;
    }
    const email = this.sentResetEmail?.trim() || this.resetEmail?.trim();
    const otp = this.resetOtp?.trim().replace(/\s/g, '');
    const pw = this.newPasswordReset;
    const confirm = this.confirmNewPasswordReset;

    if (!email) {
      this.error = 'Email is missing. Request a new code from the previous step.';
      return;
    }
    if (!otp || otp.length < 4) {
      this.error = 'Enter the verification code from your email.';
      return;
    }
    if (!pw || pw.length < 8) {
      this.error = 'New password must be at least 8 characters.';
      return;
    }
    if (pw !== confirm) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.error = '';
    this.loading = true;

    this.passwordResetService.resetPassword(email, otp, pw).subscribe({
      next: () => {
        this.loading = false;
        this.clearOtpTimer();
        this.otpCountdownSec = null;
        this.otpExpired = false;
        this.info = 'Password updated. You can sign in with your new password.';
        this.resetOtp = '';
        this.newPasswordReset = '';
        this.confirmNewPasswordReset = '';
        this.toastOk('Password updated', 'You can sign in with your new password.');
        this.switchTo('login');
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message || err?.message || '';
        this.error =
          msg ||
          'Could not reset password. The code may be wrong or expired — request a new code.';
        this.toastErr('Password reset failed', this.error);
      }
    });
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.error = 'Please enter both email and password';
      this.toastWarn('Missing information', this.error);
      return;
    }

    this.error = '';
    this.info = '';
    this.loading = true;

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.loading = false;

        if (!response.token || !response.user) {
          this.error = response.message || 'Login could not be completed. Please try again.';
          this.toastErr('Sign in incomplete', this.error);
          return;
        }

        if (!this.authService.isSessionUserAllowed(response.user)) {
          const st = response.user.status;
          this.error =
            st === 'Rejected'
              ? 'Your clinician account request has been rejected. Please contact support.'
              : 'Your account is under review and awaiting admin approval.';
          this.toastWarn('Cannot sign in yet', this.error);
          return;
        }

        this.toastOk('Signed in', 'Welcome back to NeuroSync.');
        this.closeModal();

        // Small delay to ensure auth data is fully set before redirect
        setTimeout(() => {
          // Double-check authentication before redirect
          if (this.authService.isAuthenticated()) {
            this.authService.navigateForAuthenticatedUser(response.user);
          } else {
            console.error('Authentication check failed after login');
            this.error = 'Login successful but authentication check failed. Please try again.';
            this.toastErr('Sign in error', this.error);
            this.modalService.openLoginModal(); // Reopen modal to show error
          }
        }, 100);
      },
      error: (error) => {
        this.loading = false;
        console.error('Login error details:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);

        if (error.status === 0) {
          this.error = 'Unable to connect to the server. Please ensure the backend is running.';
        } else if (error.status === 401) {
          this.error =
            (error.error?.message || '').toString() || 'Invalid email or password. Please try again.';
          if (this.error.toLowerCase().includes('inactive')) {
            this.showContactAdmin = true;
          }
        } else if (error.status === 404) {
          this.error = 'API endpoint not found. Please check the API configuration.';
        } else if (error.error?.message) {
          const message = error.error.message as string;
          this.error = message;
          if (message.toLowerCase().includes('inactive')) {
            this.showContactAdmin = true;
          }
        } else if (error.error?.errors) {
          const errors = Object.values(error.error.errors).flat();
          this.error = errors.join(', ');
        } else {
          this.error = `Login failed (${error.status || 'Unknown error'}). Please check your credentials and try again.`;
        }
        this.toastErr('Sign in failed', this.error);
      }
    });
  }
}
