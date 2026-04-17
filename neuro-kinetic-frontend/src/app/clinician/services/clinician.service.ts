import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  createdAt: string;
  latestResult?: PatientRiskSummary;
}

export interface PatientRiskSummary {
  overallScore: number;
  label: 'Healthy' | 'At risk' | 'High risk';
  voiceScore: number | null;
  gaitScore: number | null;
  tapScore: number | null;
  lastTestDate: string;
}

export interface PatientResult {
  id: string;
  testType: 'voice' | 'gait' | 'fingertap';
  riskPercent: number;
  label: string;
  createdAt: string;
}

export interface ClinicianNote {
  id: string;
  content: string;
  createdAt: string;
  clinicianName: string;
}

export interface AddPatientPayload {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  notes?: string;
}

export interface RequestTestPayload {
  patientId: string;
  testType: 'voice' | 'gait' | 'fingertap';
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ClinicianService {
  // Ensure we call the backend API (not the Angular dev server origin).
  private base = `${environment.apiUrl}/clinician`;

  constructor(private http: HttpClient) {}

  getPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.base}/patients`);
  }

  addPatient(payload: AddPatientPayload): Observable<Patient> {
    return this.http.post<Patient>(`${this.base}/patients`, payload);
  }

  getPatient(id: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.base}/patients/${id}`);
  }

  getPatientResults(id: string): Observable<PatientResult[]> {
    return this.http.get<PatientResult[]>(`${this.base}/patients/${id}/results`);
  }

  requestTest(payload: RequestTestPayload): Observable<{ testRequestId?: number }> {
    return this.http.post<{ testRequestId?: number }>(
      `${this.base}/patients/${payload.patientId}/request-test`,
      payload
    );
  }

  removePatient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/patients/${id}`);
  }

  /** Whether an email already has a NeuroSync account */
  lookupPatientEmail(email: string): Observable<{
    registered: boolean;
    userId?: number;
    linkedToThisClinician?: boolean;
    role?: string;
  }> {
    const params = { email: email.trim() };
    return this.http.get<{
      registered: boolean;
      userId?: number;
      linkedToThisClinician?: boolean;
      role?: string;
    }>(`${this.base}/patients/email-lookup`, { params });
  }

  /** Invite a non-registered email to sign up (no patient row created) */
  sendTestInvitationEmail(payload: {
    email: string;
    testType: string;
    message?: string;
  }): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(`${this.base}/test-request/send-invitation`, payload);
  }
}
