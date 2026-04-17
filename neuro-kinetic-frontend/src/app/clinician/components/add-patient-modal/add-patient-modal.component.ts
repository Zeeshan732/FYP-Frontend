import { Component, EventEmitter, Output } from '@angular/core';
import { AddPatientPayload, ClinicianService, Patient } from '../../services/clinician.service';

@Component({
  selector: 'app-add-patient-modal',
  templateUrl: './add-patient-modal.component.html',
  styleUrls: ['./add-patient-modal.component.scss']
})
export class AddPatientModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() patientAdded = new EventEmitter<Patient>();

  form: AddPatientPayload = {
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    notes: ''
  };

  /** When email has no NeuroSync account yet — invite flow */
  phase: 'form' | 'noAccount' = 'form';
  inviteTestType: 'voice' | 'gait' | 'fingertap' = 'voice';

  isSubmitting = false;
  errorMessage = '';

  constructor(private clinicianService: ClinicianService) {}

  submit(): void {
    if (this.phase !== 'form') return;

    const email = (this.form.email || '').trim();
    if (!email) {
      this.errorMessage = 'Email is required.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.clinicianService.lookupPatientEmail(email).subscribe({
      next: (res) => {
        if (!res.registered) {
          this.phase = 'noAccount';
          this.isSubmitting = false;
          return;
        }
        if (res.role && res.role !== 'Public') {
          this.errorMessage =
            'This email is already used by a non-patient account. Use a different patient email.';
          this.isSubmitting = false;
          return;
        }
        this.persistNewPatient();
      },
      error: () => {
        this.errorMessage = 'Could not verify this email. Try again.';
        this.isSubmitting = false;
      }
    });
  }

  private persistNewPatient(): void {
    this.clinicianService.addPatient(this.form).subscribe({
      next: (patient) => {
        this.isSubmitting = false;
        this.patientAdded.emit(patient);
        this.close.emit();
      },
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'Failed to add patient. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  sendInvitation(): void {
    const email = (this.form.email || '').trim();
    if (!email) {
      this.errorMessage = 'Email is required.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.clinicianService
      .sendTestInvitationEmail({
        email,
        testType: this.inviteTestType,
        message: this.form.notes
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.close.emit();
        },
        error: (err) => {
          this.errorMessage =
            err.error?.message ??
            (err.status === 409
              ? 'An account already exists for this email. Add them as a patient instead.'
              : 'Failed to send invitation email.');
          this.isSubmitting = false;
        }
      });
  }

  backToForm(): void {
    this.phase = 'form';
    this.errorMessage = '';
  }
}
