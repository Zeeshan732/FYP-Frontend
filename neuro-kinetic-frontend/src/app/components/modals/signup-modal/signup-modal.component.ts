import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ModalService } from '../../../services/modal.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-signup-modal',
  templateUrl: './signup-modal.component.html',
  styleUrls: ['./signup-modal.component.scss']
})
export class SignupModalComponent implements OnInit, OnDestroy {
  isOpen = false;
  firstName = '';
  lastName = '';
  email = '';
  institution = '';
  role: 'Public' | 'MedicalProfessional' = 'Public';
  password = '';
  confirmPassword = '';
  error = '';
  info = '';
  loading = false;
  modalView: 'login' | 'signup' | 'forgot' | 'email-sent' = 'signup';
  selectedRole: 'patient' | 'clinician' = 'patient';
  showPassword = false;
  showConfirmPassword = false;
  passwordStrength: 0 | 1 | 2 | 3 | 4 = 0;
  agreeTerms = false;
  private subscription: Subscription = new Subscription();
  private previousBodyOverflow = '';

  // Available roles for signup
  roleOptions = [
    { label: 'Public User', value: 'Public' },
    { label: 'Medical Professional', value: 'MedicalProfessional' }
  ];

  constructor(
    private modalService: ModalService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.subscription.add(
      this.modalService.signupModal$.subscribe(isOpen => {
        this.isOpen = isOpen;
        if (isOpen) {
          this.previousBodyOverflow = document.body.style.overflow;
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = this.previousBodyOverflow;
        }
        // Reset form when modal opens
        if (isOpen) {
          this.firstName = '';
          this.lastName = '';
          this.email = '';
          this.institution = '';
          this.role = 'Public';
          this.password = '';
          this.confirmPassword = '';
          this.error = '';
          this.info = '';
          this.loading = false;
          this.modalView = 'signup';
          this.selectedRole = 'patient';
          this.showPassword = false;
          this.showConfirmPassword = false;
          this.passwordStrength = 0;
          this.agreeTerms = false;
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    document.body.style.overflow = this.previousBodyOverflow;
  }

  closeModal() {
    this.modalService.closeSignupModal();
  }

  openLoginModal() {
    this.modalService.closeSignupModal();
    this.modalService.openLoginModal();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  onEmailChange() {
    this.selectedRole = this.role === 'MedicalProfessional' ? 'clinician' : 'patient';
  }

  switchTo(view: 'login' | 'signup' | 'forgot' | 'email-sent'): void {
    if (view === 'login') {
      this.openLoginModal();
      return;
    }
    this.modalView = view;
  }

  selectRole(role: 'patient' | 'clinician'): void {
    this.selectedRole = role;
    this.role = role === 'clinician' ? 'MedicalProfessional' : 'Public';
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

  get isSigningUp(): boolean {
    return this.loading;
  }

  onSubmit() {
    // Validation
    if (!this.firstName || !this.lastName || !this.email || !this.password) {
      this.error = 'Please fill in all required fields';
      return;
    }

    if (this.password.length < 8) {
      this.error = 'Password must be at least 8 characters long';
      return;
    }

    if (!this.agreeTerms) {
      this.error = 'Please accept Terms of Service and Privacy Policy';
      return;
    }

    this.error = '';
    this.info = '';
    this.loading = true;

    const registrationData: any = {
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      institution: this.institution || undefined,
      researchFocus: undefined,
      // Must match backend RegisterRequest.Role (Public | MedicalProfessional); kept in sync by selectRole().
      role: this.role
    };

    this.authService.register(registrationData).subscribe({
      next: (response) => {
        this.loading = false;
        
        // Check if account was approved/activated
        const isApproved = response.status === 'Approved' || response.status === 'Activated';
        const isLoggedIn = !!response.token && !!response.user;
        
        if (isApproved) {
          // Other accounts are approved/activated and auto-logged in
          this.info = response.message || 'Account created successfully.';
        } else {
          // Account is pending approval
          this.info = response.message || 'Registration submitted. Your account is under review.';
        }
        
        // Close modal and redirect based on account status
        setTimeout(() => {
          this.modalService.closeSignupModal();
          
          if (isLoggedIn) {
            // Redirect based on role
            const createdRole = response.user?.role;
            if (createdRole === 'MedicalProfessional') {
              this.router.navigate(['/clinician']);
            } else {
              this.router.navigate(['/patient-test']);
            }
          } else {
            // Pending accounts, redirect to login page
            this.router.navigate(['/login']);
          }
        }, 2000); // 2 second delay to show success message
      },
      error: (error) => {
        this.loading = false;
        if (error.error?.message) {
          this.error = error.error.message;
        } else if (error.error?.errors) {
          const errors = Object.values(error.error.errors).flat();
          this.error = errors.join(', ');
        } else {
          this.error = 'Registration failed. Please try again.';
        }
        console.error('Registration error:', error);
      }
    });
  }
}
