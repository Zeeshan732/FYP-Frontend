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
  role: 'Public' | 'Researcher' | 'MedicalProfessional' | 'Admin' = 'Public';
  password = '';
  confirmPassword = '';
  error = '';
  info = '';
  loading = false;
  isAdminEmail = false;
  private subscription: Subscription = new Subscription();

  // Available roles for signup (Admin cannot be self-selected)
  roleOptions = [
    { label: 'Public User', value: 'Public' },
    { label: 'Researcher', value: 'Researcher' },
    { label: 'Medical Professional', value: 'MedicalProfessional' }
  ];

  // Admin email pattern: admin1@domain.com, admin2@domain.com, etc.
  // Can be configured to match your domain
  private adminEmailPattern = /^admin\d+@/i;

  constructor(
    private modalService: ModalService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.subscription.add(
      this.modalService.signupModal$.subscribe(isOpen => {
        this.isOpen = isOpen;
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
          this.isAdminEmail = false;
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
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
    // Check if email matches admin pattern
    this.isAdminEmail = this.adminEmailPattern.test(this.email);
    
    // If admin email detected, automatically set role to Admin
    if (this.isAdminEmail) {
      this.role = 'Admin';
    } else {
      // Reset to Public if not admin email
      if (this.role === 'Admin') {
        this.role = 'Public';
      }
    }
  }

  onSubmit() {
    // Validation
    if (!this.firstName || !this.lastName || !this.email || !this.password) {
      this.error = 'Please fill in all required fields';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters long';
      return;
    }

    this.error = '';
    this.info = '';
    this.loading = true;

    // For admin emails, send role as Admin (backend will validate and enforce)
    const registrationData: any = {
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      institution: this.institution || undefined,
      researchFocus: undefined
    };

    // Only include role if it's Admin (backend will handle admin detection)
    if (this.isAdminEmail) {
      registrationData.role = 'Admin';
    } else {
      registrationData.role = this.role;
    }

    this.authService.register(registrationData).subscribe({
      next: (response) => {
        this.loading = false;
        
        // Check if account was approved/activated (admin accounts or auto-approved)
        const isApproved = response.status === 'Approved' || !!response.token;
        
        if (isApproved) {
          // Account is approved/activated (admin or auto-approved)
          this.info = response.message || 'Account created successfully.';
        } else {
          // Account is pending approval
          this.info = response.message || 'Registration submitted. Your account is under review.';
        }
        
        // Close modal and redirect to login after a short delay
        setTimeout(() => {
          this.modalService.closeSignupModal();
          this.router.navigate(['/login']);
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
