import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  stats = { total: 0, healthy: 0, atRisk: 0, highRisk: 0 };

  constructor(
    private clinicianService: ClinicianService,
    private router: Router
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

  labelBadgeClass(label: string): string {
    if (label === 'Healthy') return 'b-healthy';
    if (label === 'At risk') return 'b-risk';
    return 'b-high';
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
