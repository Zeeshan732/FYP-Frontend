import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ClinicianService, Patient } from '../../services/clinician.service';

type FilterStatus = 'all' | 'healthy' | 'at-risk' | 'high-risk';

@Component({
  selector: 'app-patients',
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.scss']
})
export class PatientsComponent implements OnInit {
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  isLoading = true;
  searchQuery = '';
  filterStatus: FilterStatus = 'all';
  showAddModal = false;
  showRemovePatientDialog = false;
  patientPendingRemoval: Patient | null = null;
  deletingId: string | null = null;
  stats = { total: 0, healthy: 0, atRisk: 0, highRisk: 0 };

  constructor(
    private clinicianService: ClinicianService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.clinicianService.getPatients().subscribe({
      next: (patients) => {
        this.patients = patients ?? [];
        this.filteredPatients = [...this.patients];
        this.calculateStats();
        this.isLoading = false;
      },
      error: () => {
        this.patients = [];
        this.filteredPatients = [];
        this.calculateStats();
        this.isLoading = false;
      }
    });
  }

  filterPatients(): void {
    const query = this.searchQuery.trim().toLowerCase();
    this.filteredPatients = this.patients.filter((p) => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const email = (p.email ?? '').toLowerCase();
      const matchesQuery = !query || fullName.includes(query) || email.includes(query);
      if (!matchesQuery) return false;

      const label = (p.latestResult?.label ?? '').toLowerCase();
      if (this.filterStatus === 'all') return true;
      if (this.filterStatus === 'healthy') return label === 'healthy';
      if (this.filterStatus === 'at-risk') return label === 'at risk';
      return label === 'high risk';
    });
  }

  riskColor(score: number): string {
    if (score < 35) return '#1D9E75';
    if (score < 65) return '#F0A500';
    return '#E05252';
  }

  statusLabel(p: Patient): string {
    return p.latestResult?.label ?? 'No tests';
  }

  statusBadgeClass(label: string | undefined): string {
    if (!label) return 'b-neutral';
    if (label === 'Healthy') return 'b-healthy';
    if (label === 'At risk') return 'b-risk';
    if (label === 'High risk') return 'b-high';
    return 'b-neutral';
  }

  onPatientAdded(patient: Patient): void {
    this.patients = [patient, ...this.patients];
    this.calculateStats();
    this.filterPatients();
    this.showAddModal = false;
  }

  navigateToProfile(id: string): void {
    this.router.navigate(['/clinician/patients', id]);
  }

  openRemovePatientDialog(p: Patient, event: Event): void {
    event.stopPropagation();
    this.patientPendingRemoval = p;
    this.showRemovePatientDialog = true;
  }

  cancelRemovePatient(): void {
    this.showRemovePatientDialog = false;
    this.patientPendingRemoval = null;
  }

  confirmRemovePatient(): void {
    const p = this.patientPendingRemoval;
    if (!p) {
      return;
    }
    this.deletingId = p.id;
    this.clinicianService.removePatient(p.id).subscribe({
      next: () => {
        this.patients = this.patients.filter((x) => x.id !== p.id);
        this.deletingId = null;
        this.showRemovePatientDialog = false;
        this.patientPendingRemoval = null;
        this.calculateStats();
        this.filterPatients();
      },
      error: () => {
        this.deletingId = null;
        this.messageService.add({
          severity: 'error',
          summary: 'Remove failed',
          detail: 'Could not remove this patient. Please try again.'
        });
      }
    });
  }

  private calculateStats(): void {
    const labels = this.patients.map((p) => p.latestResult?.label ?? '');
    this.stats = {
      total: this.patients.length,
      healthy: labels.filter((l) => l === 'Healthy').length,
      atRisk: labels.filter((l) => l === 'At risk').length,
      highRisk: labels.filter((l) => l === 'High risk').length
    };
  }
}
