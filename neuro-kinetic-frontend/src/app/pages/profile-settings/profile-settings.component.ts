import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/api.models';

@Component({
  selector: 'app-profile-settings',
  templateUrl: './profile-settings.component.html',
  styleUrls: ['./profile-settings.component.scss']
})
export class ProfileSettingsComponent implements OnInit {
  loading = false;
  savingProfile = false;
  changingPassword = false;

  profile = {
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    institution: '',
    researchFocus: ''
  };

  password = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  constructor(
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.authService.getProfile().subscribe({
      next: (user: User) => {
        this.profile.firstName = user.firstName || '';
        this.profile.lastName = user.lastName || '';
        this.profile.email = user.email || '';
        this.profile.role = user.role || '';
        this.profile.institution = user.institution || '';
        this.profile.researchFocus = user.researchFocus || '';
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Unable to load profile.'
        });
      }
    });
  }

  saveProfile(): void {
    if (!this.profile.firstName.trim() || !this.profile.lastName.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Required',
        detail: 'First name and last name are required.'
      });
      return;
    }

    this.savingProfile = true;
    this.authService.updateProfile({
      firstName: this.profile.firstName.trim(),
      lastName: this.profile.lastName.trim(),
      institution: this.profile.institution.trim() || undefined,
      researchFocus: this.profile.researchFocus.trim() || undefined
    }).subscribe({
      next: () => {
        this.savingProfile = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Profile updated successfully.'
        });
      },
      error: (err) => {
        this.savingProfile = false;
        const detail = err?.error?.message || 'Failed to update profile.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail });
      }
    });
  }

  changePassword(): void {
    if (!this.password.currentPassword || !this.password.newPassword || !this.password.confirmPassword) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Required',
        detail: 'Please fill all password fields.'
      });
      return;
    }

    if (this.password.newPassword.length < 8) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Weak password',
        detail: 'New password must be at least 8 characters.'
      });
      return;
    }

    if (this.password.newPassword !== this.password.confirmPassword) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Mismatch',
        detail: 'New password and confirm password do not match.'
      });
      return;
    }

    this.changingPassword = true;
    this.authService.changePassword(this.password.currentPassword, this.password.newPassword).subscribe({
      next: () => {
        this.changingPassword = false;
        this.password = { currentPassword: '', newPassword: '', confirmPassword: '' };
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Password changed successfully.'
        });
      },
      error: (err) => {
        this.changingPassword = false;
        const detail = err?.error?.message || 'Failed to change password.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail });
      }
    });
  }
}

