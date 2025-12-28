import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { TechnologyComponent } from './pages/technology/technology.component';
import { ResearchComponent } from './pages/research/research.component';
import { ClinicalUseComponent } from './pages/clinical-use/clinical-use.component';
import { CollaborationComponent } from './pages/collaboration/collaboration.component';
import { LandingComponent } from './pages/landing/landing.component';
import { ServicesComponent } from './pages/services/services.component';
import { ContactComponent } from './pages/contact/contact.component';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { NavigationComponent } from './components/navigation/navigation.component';
import { FooterComponent } from './components/footer/footer.component';
import { LoginModalComponent } from './components/modals/login-modal/login-modal.component';
import { SignupModalComponent } from './components/modals/signup-modal/signup-modal.component';
import { TechnologyDemoComponent } from './pages/technology-demo/technology-demo.component';
import { PublicationsComponent } from './pages/publications/publications.component';
import { PublicationDetailComponent } from './pages/publication-detail/publication-detail.component';
import { MetricsDashboardComponent } from './pages/metrics-dashboard/metrics-dashboard.component';
import { CrossValidationComponent } from './pages/cross-validation/cross-validation.component';
import { PatientTestComponent } from './pages/patient-test/patient-test.component';
import { TestRecordsComponent } from './pages/test-records/test-records.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { TestRecordDialogComponent } from './components/test-record-dialog/test-record-dialog.component';
import { HeaderComponent } from './components/header/header.component';
import { AccountRequestsComponent } from './pages/account-requests/account-requests.component';
import { AdminUsersComponent } from './pages/admin-users/admin-users.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    TechnologyComponent,
    ResearchComponent,
    ClinicalUseComponent,
    CollaborationComponent,
    LandingComponent,
    ServicesComponent,
    ContactComponent,
    LoginComponent,
    SignupComponent,
    NavigationComponent,
    FooterComponent,
    LoginModalComponent,
    SignupModalComponent,
    TechnologyDemoComponent,
    PublicationsComponent,
    PublicationDetailComponent,
    MetricsDashboardComponent,
    CrossValidationComponent,
    PatientTestComponent,
    TestRecordsComponent,
    AdminDashboardComponent,
    TestRecordDialogComponent,
    HeaderComponent,
    AccountRequestsComponent,
    AdminUsersComponent,
    NotificationsComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    // PrimeNG Modules
    ButtonModule,
    DialogModule,
    ToastModule,
    ConfirmPopupModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    InputTextareaModule,
    TooltipModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    MessageService,
    ConfirmationService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
