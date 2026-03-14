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
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService, ConfirmationService } from 'primeng/api';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { ClinicalUseComponent } from './pages/clinical-use/clinical-use.component';
import { CollaborationComponent } from './pages/collaboration/collaboration.component';
import { LandingComponent } from './pages/landing/landing.component';
import { ServicesComponent } from './pages/services/services.component';
import { ContactComponent } from './pages/contact/contact.component';
import { LoginComponent } from './pages/login/login.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { SignupComponent } from './pages/signup/signup.component';
import { NavigationComponent } from './components/navigation/navigation.component';
import { FooterComponent } from './components/footer/footer.component';
import { LoginModalComponent } from './components/modals/login-modal/login-modal.component';
import { SignupModalComponent } from './components/modals/signup-modal/signup-modal.component';
import { PatientTestComponent } from './pages/patient-test/patient-test.component';
import { TestRecordsComponent } from './pages/test-records/test-records.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { TestRecordDialogComponent } from './components/test-record-dialog/test-record-dialog.component';
import { AskResultsDialogComponent } from './components/ask-results-dialog/ask-results-dialog.component';
import { RagChatComponent } from './components/rag-chat/rag-chat.component';
import { HeaderComponent } from './components/header/header.component';
import { AccountRequestsComponent } from './pages/account-requests/account-requests.component';
import { AdminUsersComponent } from './pages/admin-users/admin-users.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { VoiceInputComponent } from './pages/voice-input/voice-input.component';
import { OAuthCallbackComponent } from './pages/oauth-callback/oauth-callback.component';
import { LiveVoiceMonitorComponent } from './pages/live-voice-monitor/live-voice-monitor.component';
import { ConsultationComponent } from './pages/consultation/consultation.component';
import { AnalyticsDashboardComponent } from './pages/analytics-dashboard/analytics-dashboard.component';
import { AboutComponent } from './pages/about/about.component';
import { BlogComponent } from './pages/blog/blog.component';
import { ArticleCardComponent } from './components/blog/article-card/article-card.component';
import { SectionRowComponent } from './components/blog/section-row/section-row.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { NbThemeModule } from '@nebular/theme';
import { NbChatModule } from '@nebular/theme';
@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ClinicalUseComponent,
    CollaborationComponent,
    LandingComponent,
    ServicesComponent,
    ContactComponent,
    LoginComponent,
    ForgotPasswordComponent,
    SignupComponent,
    NavigationComponent,
    FooterComponent,
    LoginModalComponent,
    SignupModalComponent,
    PatientTestComponent,
    TestRecordsComponent,
    OAuthCallbackComponent,
    AdminDashboardComponent,
    TestRecordDialogComponent,
    AskResultsDialogComponent,
    RagChatComponent,
    HeaderComponent,
    AccountRequestsComponent,
    AdminUsersComponent,
    NotificationsComponent,
    VoiceInputComponent,
    LiveVoiceMonitorComponent,
    ConsultationComponent,
    AnalyticsDashboardComponent,
    AboutComponent,
    BlogComponent,
    ArticleCardComponent,
    SectionRowComponent
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
    TooltipModule,
    TagModule,
    ProgressBarModule,
    NbThemeModule.forRoot({ name: 'default' }),
    NbChatModule,
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
