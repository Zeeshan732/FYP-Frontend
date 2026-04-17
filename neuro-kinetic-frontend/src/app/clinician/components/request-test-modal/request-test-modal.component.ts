import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ClinicianService, Patient } from '../../services/clinician.service';

@Component({
  selector: 'app-request-test-modal',
  templateUrl: './request-test-modal.component.html',
  styleUrls: ['./request-test-modal.component.scss']
})
export class RequestTestModalComponent {
  @Input() patient!: Patient;
  @Output() close = new EventEmitter<void>();
  @Output() testRequested = new EventEmitter<void>();

  selectedTest: 'voice' | 'gait' | 'fingertap' | null = null;
  message = '';
  isSubmitting = false;
  errorMessage = '';

  constructor(private clinicianService: ClinicianService) {}

  submit(): void {
    if (!this.selectedTest) return;
    this.isSubmitting = true;
    this.errorMessage = '';
    this.clinicianService.requestTest({
      patientId: this.patient.id,
      testType: this.selectedTest,
      message: this.message
    }).subscribe({
      next: () => {
        this.testRequested.emit();
        this.close.emit();
      },
      error: (err) => {
        this.errorMessage =
          err.error?.message ??
          (err.status === 404
            ? 'Patient not found or no longer linked to your account.'
            : 'Could not send the test request. Please try again.');
        this.isSubmitting = false;
      }
    });
  }
}
