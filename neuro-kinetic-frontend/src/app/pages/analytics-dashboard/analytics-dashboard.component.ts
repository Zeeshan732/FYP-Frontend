import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { AnalyticsApiService } from '../../services/analytics/analytics-api.service';
import { SimulationService, SimulationResult } from '../../services/analytics/simulation.service';
import {
  ProgressionAnalysisDto,
  StatisticsResponse,
  TestRecordPoint
} from '../../models/api.models';

declare var Chart: any;

@Component({
  selector: 'app-analytics-dashboard',
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss']
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('progressionChart') progressionChartRef!: ElementRef<HTMLCanvasElement>;

  // Risk adjustment
  mlRiskPercent = 50;
  gaitScore = 50;
  age = 55;
  adjustedRisk: number | null = null;
  riskLoading = false;
  riskError = '';

  // Progression
  progressionResult: ProgressionAnalysisDto | null = null;
  progressionLoading = false;
  progressionError = '';
  progressionChart: any = null;

  // Statistics (sample data or user-provided)
  statValues = '30,45,52,60,55,48,62,58';
  statResult: StatisticsResponse | null = null;
  statLoading = false;
  statError = '';

  // Simulation
  simResult: SimulationResult | null = null;
  simMl = 50;
  simGait = 50;
  simAge = 55;

  currentUserId: number | null = null;
  private sub: any;

  constructor(
    private authService: AuthService,
    private analyticsApi: AnalyticsApiService,
    private simulation: SimulationService
  ) {}

  ngOnInit(): void {
    this.sub = this.authService.currentUser$.subscribe(u => {
      this.currentUserId = u?.id ?? null;
    });
    this.runRiskAdjust();
    this.runProgression();
    this.runStatistics();
    this.runSimulation();
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
    if (this.progressionChart) this.progressionChart.destroy();
  }

  runRiskAdjust(): void {
    this.riskLoading = true;
    this.riskError = '';
    this.analyticsApi.riskAdjust({
      mlRiskPercent: this.mlRiskPercent,
      gaitScore: this.gaitScore,
      age: this.age
    }).subscribe({
      next: res => {
        this.adjustedRisk = res.finalAdjustedRisk;
        this.riskLoading = false;
      },
      error: err => {
        this.riskError = err?.error?.message || 'Risk adjust failed';
        this.riskLoading = false;
      }
    });
  }

  runProgression(): void {
    this.progressionLoading = true;
    this.progressionError = '';
    const request = this.currentUserId
      ? { userId: this.currentUserId }
      : { dataPoints: this.getDemoDataPoints() };
    this.analyticsApi.progression(request).subscribe({
      next: res => {
        this.progressionResult = res;
        this.progressionLoading = false;
        setTimeout(() => this.drawProgressionChart(), 0);
      },
      error: err => {
        this.progressionError = err?.error?.message || 'Progression failed';
        this.progressionLoading = false;
      }
    });
  }

  private getDemoDataPoints(): TestRecordPoint[] {
    const base = new Date();
    return [40, 45, 52, 48, 55, 58, 62].map((v, i) => ({
      testDate: new Date(base.getTime() - (6 - i) * 30 * 24 * 60 * 60 * 1000).toISOString(),
      riskValue: v
    }));
  }

  drawProgressionChart(): void {
    if (!this.progressionResult?.smoothedPoints?.length || !this.progressionChartRef?.nativeElement) return;
    if (this.progressionChart) this.progressionChart.destroy();

    const labels = this.progressionResult.smoothedPoints.map(p =>
      new Date(p.testDate).toLocaleDateString()
    );
    const data = this.progressionResult.smoothedPoints.map(p => p.riskValue);

    this.progressionChart = new Chart(this.progressionChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Risk (smoothed)', data, borderColor: '#1A6FA8', backgroundColor: 'rgba(26, 111, 168, 0.1)', fill: true, tension: 0.3 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 100 },
          x: { title: { display: true, text: 'Date' } }
        },
        plugins: { legend: { display: true } }
      }
    });
  }

  runStatistics(): void {
    const values = this.statValues.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (values.length === 0) {
      this.statError = 'Enter comma-separated numbers';
      return;
    }
    this.statLoading = true;
    this.statError = '';
    this.analyticsApi.statistics({ values }).subscribe({
      next: res => {
        this.statResult = res;
        this.statLoading = false;
      },
      error: err => {
        this.statError = err?.error?.message || 'Statistics failed';
        this.statLoading = false;
      }
    });
  }

  runSimulation(): void {
    this.simResult = this.simulation.runMonteCarlo({
      mlRiskPercent: this.simMl,
      gaitScore: this.simGait,
      age: this.simAge
    }, 1000);
  }

  onSimSlidersChange(): void {
    this.runSimulation();
  }
}
