import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientsComponent } from './pages/patients/patients.component';
import { PatientProfileComponent } from './pages/patient-profile/patient-profile.component';
import { ClinicianGuard } from './guards/clinician.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [ClinicianGuard],
    canActivateChild: [ClinicianGuard],
    children: [
      { path: '', component: PatientsComponent },
      { path: 'patients/:id', component: PatientProfileComponent },
      { path: 'patients', redirectTo: '', pathMatch: 'full' },
      { path: 'results', redirectTo: '/test-records', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClinicianRoutingModule {}
