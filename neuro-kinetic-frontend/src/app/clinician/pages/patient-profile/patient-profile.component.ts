import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClinicianNote, ClinicianService, Patient, PatientResult } from '../../services/clinician.service';

@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.scss']
})
export class PatientProfileComponent implements OnInit {
  patient: Patient | null = null;
  results: PatientResult[] = [];
  notes: ClinicianNote[] = [];
  isLoading = true;
  showRequestModal = false;

  constructor(
    private route: ActivatedRoute,
    private clinicianService: ClinicianService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading = false;
      return;
    }

    forkJoin([
      this.clinicianService.getPatient(id),
      this.clinicianService.getPatientResults(id)
    ]).subscribe({
      next: ([patient, results]) => {
        this.patient = patient;
        this.results = results ?? [];
        this.notes = ((patient as unknown as { notes?: ClinicianNote[] }).notes ?? []);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  signalColor(type: string): string {
    if (type === 'voice') return '#2E86DE';
    if (type === 'gait') return '#7F77DD';
    return '#1D9E75';
  }

  get combinedScore(): number {
    if (!this.patient?.latestResult) return 0;
    const scores = [
      this.patient.latestResult.voiceScore,
      this.patient.latestResult.gaitScore,
      this.patient.latestResult.tapScore
    ].filter((v): v is number => v !== null);
    if (!scores.length) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  get signalCount(): number {
    if (!this.patient?.latestResult) return 0;
    return [
      this.patient.latestResult.voiceScore,
      this.patient.latestResult.gaitScore,
      this.patient.latestResult.tapScore
    ].filter((v) => v !== null).length;
  }

  riskColor(score: number): string {
    if (score < 35) return '#1D9E75';
    if (score < 65) return '#F0A500';
    return '#E05252';
  }

  labelBadgeClass(label: string): string {
    if (label === 'Healthy') return 'b-healthy';
    if (label === 'At risk') return 'b-risk';
    return 'b-high';
  }

  onTestRequested(): void {
    this.showRequestModal = false;
  }
}
