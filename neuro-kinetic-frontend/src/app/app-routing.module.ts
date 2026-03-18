import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LandingComponent } from './pages/landing/landing.component';
import { ServicesComponent } from './pages/services/services.component';
import { ContactComponent } from './pages/contact/contact.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ClinicalUseComponent } from './pages/clinical-use/clinical-use.component';
import { CollaborationComponent } from './pages/collaboration/collaboration.component';
import { PatientTestComponent } from './pages/patient-test/patient-test.component';
import { TestRecordsComponent } from './pages/test-records/test-records.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { AccountRequestsComponent } from './pages/account-requests/account-requests.component';
import { AdminUsersComponent } from './pages/admin-users/admin-users.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { VoiceInputComponent } from './pages/voice-input/voice-input.component';
import { LiveVoiceMonitorComponent } from './pages/live-voice-monitor/live-voice-monitor.component';
import { OAuthCallbackComponent } from './pages/oauth-callback/oauth-callback.component';
import { ConsultationComponent } from './pages/consultation/consultation.component';
import { FingerTapComponent } from './pages/finger-tap/finger-tap.component';
import { AnalyticsDashboardComponent } from './pages/analytics-dashboard/analytics-dashboard.component';
import { AboutComponent } from './pages/about/about.component';
import { BlogComponent } from './pages/blog/blog.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

const routes: Routes = [
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: 'landing', component: LandingComponent },
  { path: 'home', component: HomeComponent },
  { path: 'services', component: ServicesComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'login', component: LandingComponent, data: { openLoginModal: true } },
  { path: 'dashboard', redirectTo: '/patient-test', pathMatch: 'full' },
  { path: 'auth/callback', component: OAuthCallbackComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'patient-test', component: PatientTestComponent, canActivate: [AuthGuard] },
  { path: 'voice-input', component: VoiceInputComponent, canActivate: [AuthGuard] },
  { path: 'live-voice-monitor', component: LiveVoiceMonitorComponent, canActivate: [AuthGuard] },
  { path: 'consultation', component: ConsultationComponent, canActivate: [AuthGuard] },
  { path: 'finger-tap', component: FingerTapComponent, canActivate: [AuthGuard] },
  { path: 'analytics-dashboard', component: AnalyticsDashboardComponent, canActivate: [AuthGuard] },
  { path: 'test-records', component: TestRecordsComponent, canActivate: [AuthGuard] },
  { path: 'admin-dashboard', component: AdminDashboardComponent, canActivate: [AdminGuard] },
  { path: 'account-requests', component: AccountRequestsComponent, canActivate: [AdminGuard] },
  { path: 'admin-users', component: AdminUsersComponent, canActivate: [AdminGuard] },
  { path: 'notifications', component: NotificationsComponent, canActivate: [AuthGuard] },
  { path: 'about', component: AboutComponent },
  { path: 'blog', component: BlogComponent },
  { path: 'clinical-use', component: ClinicalUseComponent },
  { path: 'collaboration', component: CollaborationComponent },
  { path: 'voice-analysis', loadChildren: () => import('./modules/voice-analysis/voice-analysis.module').then(m => m.VoiceAnalysisModule) },
  { path: 'gait-analysis', loadChildren: () => import('./modules/gait-analysis/gait-analysis.module').then(m => m.GaitAnalysisModule) },
  { path: 'clinician', loadChildren: () => import('./clinician/clinician.module').then(m => m.ClinicianModule) },
  { path: '**', redirectTo: '/landing' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
