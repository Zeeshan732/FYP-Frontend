import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LandingComponent } from './pages/landing/landing.component';
import { ServicesComponent } from './pages/services/services.component';
import { ContactComponent } from './pages/contact/contact.component';
import { LoginComponent } from './pages/login/login.component';
import { TechnologyDemoComponent } from './pages/technology-demo/technology-demo.component';
import { TechnologyComponent } from './pages/technology/technology.component';
import { ResearchComponent } from './pages/research/research.component';
import { ClinicalUseComponent } from './pages/clinical-use/clinical-use.component';
import { CollaborationComponent } from './pages/collaboration/collaboration.component';
import { PublicationsComponent } from './pages/publications/publications.component';
import { PublicationDetailComponent } from './pages/publication-detail/publication-detail.component';
import { MetricsDashboardComponent } from './pages/metrics-dashboard/metrics-dashboard.component';
import { CrossValidationComponent } from './pages/cross-validation/cross-validation.component';
import { PatientTestComponent } from './pages/patient-test/patient-test.component';
import { TestRecordsComponent } from './pages/test-records/test-records.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

const routes: Routes = [
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: 'landing', component: LandingComponent },
  { path: 'home', component: HomeComponent },
  { path: 'services', component: ServicesComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'login', component: LoginComponent },
      { path: 'technology', component: TechnologyComponent },
      { path: 'technology-demo', component: TechnologyDemoComponent },
  { path: 'research', component: ResearchComponent },
  { path: 'publications', component: PublicationsComponent },
  { path: 'publications/:id', component: PublicationDetailComponent },
  { path: 'metrics', component: MetricsDashboardComponent },
  { path: 'cross-validation', component: CrossValidationComponent },
  { path: 'patient-test', component: PatientTestComponent, canActivate: [AuthGuard] },
  { path: 'test-records', component: TestRecordsComponent, canActivate: [AuthGuard] },
  { path: 'admin-dashboard', component: AdminDashboardComponent, canActivate: [AdminGuard] },
  { path: 'clinical-use', component: ClinicalUseComponent },
  { path: 'collaboration', component: CollaborationComponent },
  { path: 'voice-analysis', loadChildren: () => import('./modules/voice-analysis/voice-analysis.module').then(m => m.VoiceAnalysisModule) },
  { path: 'gait-analysis', loadChildren: () => import('./modules/gait-analysis/gait-analysis.module').then(m => m.GaitAnalysisModule) },
  { path: '**', redirectTo: '/landing' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
