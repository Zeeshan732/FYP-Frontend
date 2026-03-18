import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicianRoutingModule } from './clinician-routing.module';
import { SharedModule } from '../shared/shared.module';
import { PatientsComponent } from './pages/patients/patients.component';
import { PatientProfileComponent } from './pages/patient-profile/patient-profile.component';
import { AddPatientModalComponent } from './components/add-patient-modal/add-patient-modal.component';
import { RequestTestModalComponent } from './components/request-test-modal/request-test-modal.component';
import { PatientCardComponent } from './components/patient-card/patient-card.component';

@NgModule({
  declarations: [
    PatientsComponent,
    PatientProfileComponent,
    AddPatientModalComponent,
    RequestTestModalComponent,
    PatientCardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    ClinicianRoutingModule
  ]
})
export class ClinicianModule {}
