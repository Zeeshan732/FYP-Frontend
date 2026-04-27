import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
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
  clinicName = '';
  licenseNumber = '';
  licenseDocumentUrl = '';
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
  signupFieldErrors: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    clinicName?: string;
    licenseNumber?: string;
    agreeTerms?: string;
  } = {};
  private subscription: Subscription = new Subscription();
  private previousBodyOverflow = '';
  private invitedClinicianId?: number;
  private invitedEmail = '';

  // Available roles for signup
  roleOptions = [
    { label: 'Public User', value: 'Public' },
    { label: 'Clinician', value: 'MedicalProfessional' }
  ];

  constructor(
    private modalService: ModalService,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
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
          // Read query params from the active URL directly. This is reliable for modal components
          // rendered outside routed page components (e.g. app-level modal host).
          const qp = this.router.parseUrl(this.router.url).queryParams ?? {};
          const invitedEmail = String(qp['email'] ?? '').trim();
          const parsedClinicianId = Number(String(qp['clinicianId'] ?? '').trim());
          this.invitedEmail = invitedEmail;
          this.invitedClinicianId =
            Number.isFinite(parsedClinicianId) && parsedClinicianId > 0
              ? parsedClinicianId
              : undefined;

          this.firstName = '';
          this.lastName = '';
          this.email = '';
          this.institution = '';
          this.clinicName = '';
          this.licenseNumber = '';
          this.licenseDocumentUrl = '';
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
          this.signupFieldErrors = {};

          if (this.invitedEmail) {
            this.email = this.invitedEmail;
            this.selectRole('patient');
          }
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
    this.signupFieldErrors = {};

    const firstName = this.firstName?.trim() || '';
    const lastName = this.lastName?.trim() || '';
    const email = this.email?.trim() || '';
    const password = this.password || '';

    if (!firstName) this.signupFieldErrors.firstName = 'First name is required.';
    if (!lastName) this.signupFieldErrors.lastName = 'Last name is required.';
    if (!email) this.signupFieldErrors.email = 'Email address is required.';
    if (!password) this.signupFieldErrors.password = 'Password is required.';

    if (!this.signupFieldErrors.password && password.length < 8) {
      this.error = 'Password must be at least 8 characters long';
      return;
    }

    if (!this.agreeTerms) {
      this.signupFieldErrors.agreeTerms = 'Please accept Terms of Service and Privacy Policy.';
    }

    if (this.role === 'MedicalProfessional') {
      if (!this.clinicName.trim()) this.signupFieldErrors.clinicName = 'Clinic / Hospital name is required.';
      if (!this.licenseNumber.trim()) this.signupFieldErrors.licenseNumber = 'License number is required.';
    }

    if (Object.keys(this.signupFieldErrors).length > 0) {
      this.error = '';
      return;
    }

    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.error = '';
    this.info = '';
    this.loading = true;

    const registrationData: any = {
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      institution: this.institution || undefined,
      clinicName: this.role === 'MedicalProfessional' ? this.clinicName.trim() : undefined,
      licenseNumber: this.role === 'MedicalProfessional' ? this.licenseNumber.trim() : undefined,
      licenseDocumentUrl: this.role === 'MedicalProfessional' && this.licenseDocumentUrl.trim()
        ? this.licenseDocumentUrl.trim()
        : undefined,
      researchFocus: undefined,
      // Must match backend RegisterRequest.Role (Public | MedicalProfessional); kept in sync by selectRole().
      role: this.role,
      clinicianId: this.role === 'Public' ? this.invitedClinicianId : undefined
    };

    this.authService.register(registrationData).subscribe({
      next: (response) => {
        this.loading = false;

        const u = response.user;
        const registeredAndCanSignIn =
          !!response.token &&
          !!u &&
          u.status === 'Approved';

        if (registeredAndCanSignIn) {
          this.info = response.message || 'Account created successfully.';
        } else {
          this.info =
            response.message ||
            'Registration submitted. Your account is under review.';
        }

        if (registeredAndCanSignIn) {
          this.messageService.add({
            severity: 'success',
            summary: 'Welcome to NeuroSync',
            detail: this.info,
            life: 2000
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Registration received',
            detail: this.info,
            life: 2000
          });
        }

        setTimeout(() => {
          this.modalService.closeSignupModal();

          if (registeredAndCanSignIn) {
            const createdRole = response.user?.role;
            if (createdRole === 'MedicalProfessional') {
              this.router.navigate(['/clinician']);
            } else {
              this.router.navigate(['/patient-test']);
            }
          } else {
            this.router.navigate(['/login']);
          }
        }, 2000);
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
        this.messageService.add({
          severity: 'error',
          summary: 'Registration failed',
          detail: this.error,
          life: 2000
        });
        console.error('Registration error:', error);
      }
    });
  }
}
