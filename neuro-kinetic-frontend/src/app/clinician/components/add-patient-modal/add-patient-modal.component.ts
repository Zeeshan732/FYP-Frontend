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

  isSubmitting = false;
  errorMessage = '';

  constructor(private clinicianService: ClinicianService) {}

  submit(): void {
    this.isSubmitting = true;
    this.errorMessage = '';
    this.clinicianService.addPatient(this.form).subscribe({
      next: (patient) => {
        this.patientAdded.emit(patient);
        this.close.emit();
      },
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'Failed to add patient. Please try again.';
        this.isSubmitting = false;
      }
    });
  }
}
