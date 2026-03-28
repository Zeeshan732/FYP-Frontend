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

  constructor(private clinicianService: ClinicianService) {}

  submit(): void {
    if (!this.selectedTest) return;
    this.isSubmitting = true;
    this.clinicianService.requestTest({
      patientId: this.patient.id,
      testType: this.selectedTest,
      message: this.message
    }).subscribe({
      next: () => {
        this.testRequested.emit();
        this.close.emit();
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }
}
