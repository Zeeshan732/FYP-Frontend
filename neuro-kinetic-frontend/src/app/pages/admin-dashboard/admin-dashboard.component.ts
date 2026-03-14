import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { AdminDashboardAnalytics, UsageStatistic } from '../../models/api.models';

declare var Chart: any;

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  analytics: AdminDashboardAnalytics | null = null;
  loading = false;
  error = '';
  
  // Time range selectors
  selectedDays: number = 30;      // Default: Last 30 days
  selectedMonths: number = 12;   // Default: Last 12 months
  selectedYears: number = 5;     // Default: Last 5 years
  
  // Time range options
  daysOptions = [
    { label: 'Last 7 Days', value: 7 },
    { label: 'Last 15 Days', value: 15 },
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last 60 Days', value: 60 },
    { label: 'Last 90 Days', value: 90 }
  ];
  
  monthsOptions = [
    { label: 'Last 3 Months', value: 3 },
    { label: 'Last 6 Months', value: 6 },
    { label: 'Last 12 Months', value: 12 },
    { label: 'Last 18 Months', value: 18 },
    { label: 'Last 24 Months', value: 24 }
  ];
  
  yearsOptions = [
    { label: 'Last 1 Year', value: 1 },
    { label: 'Last 2 Years', value: 2 },
    { label: 'Last 3 Years', value: 3 },
    { label: 'Last 5 Years', value: 5 },
    { label: 'Last 10 Years', value: 10 }
  ];
  
  // Chart references
  @ViewChild('usageByDayChart') usageByDayChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('usageByMonthChart') usageByMonthChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('usageByYearChart') usageByYearChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('resultDistributionChart') resultDistributionChartRef!: ElementRef<HTMLCanvasElement>;

  charts: any[] = [];

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if user is admin
    this.authService.currentUser$.subscribe(user => {
      if (user?.role !== 'Admin') {
        this.router.navigate(['/home']);
      } else {
        this.loadAnalytics();
      }
    });
  }

  loadAnalytics() {
    this.loading = true;
    this.error = '';

    // Fetch real analytics from backend API with time range parameters
    this.apiService.getAdminDashboardAnalytics({
      days: this.selectedDays,
      months: this.selectedMonths,
      years: this.selectedYears
    }).subscribe({
      next: (data: AdminDashboardAnalytics) => {
        this.analytics = data;
        this.loading = false;
        
        // Wait for view to initialize charts
        setTimeout(() => {
          this.initCharts();
        }, 100);
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        // Fallback to dummy data if API fails
        if (error.status === 404 || error.status === 0) {
          console.warn('Analytics endpoint not available, using dummy data');
          this.analytics = this.getDummyAnalytics();
          this.loading = false;
          setTimeout(() => {
            this.initCharts();
          }, 100);
        } else {
          this.error = 'Failed to load analytics. Please try again.';
          this.loading = false;
        }
      }
    });
  }

  initCharts() {
    if (!this.analytics) return;

    // Destroy existing charts
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];

    // Check if Chart.js is loaded
    if (typeof (window as any).Chart === 'undefined') {
      console.error('Chart.js is not loaded. Please check the CDN script.');
      return;
    }

    const Chart = (window as any).Chart;
    const axisColor = '#8B95A6';
    const gridColor = 'rgba(255, 255, 255, 0.06)';
    const tooltipBg = '#162A4A';
    const tooltipText = '#E8EBF0';
    const tooltipBorder = 'rgba(255, 255, 255, 0.1)';
    const lineColor = '#2E86DE';
    const barMonthColor = '#7F77DD';
    const barYearColor = '#2E86DE';
    const pointBorderDark = '#112240';

    // Usage by Day — Line chart (FIX 5: stroke #2E86DE)
    if (this.usageByDayChartRef) {
      const ctx = this.usageByDayChartRef.nativeElement.getContext('2d');
      if (!ctx) return;

      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, 'rgba(46, 134, 222, 0.35)');
      gradient.addColorStop(0.5, 'rgba(46, 134, 222, 0.15)');
      gradient.addColorStop(1, 'rgba(46, 134, 222, 0.05)');

      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.analytics.usageByDay.map((u: UsageStatistic) => u.label),
          datasets: [{
            label: 'Tests',
            data: this.analytics.usageByDay.map((u: UsageStatistic) => u.count),
            borderColor: lineColor,
            backgroundColor: gradient,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: lineColor,
            pointBorderColor: pointBorderDark,
            pointBorderWidth: 2,
            pointHoverBackgroundColor: lineColor,
            pointHoverBorderColor: pointBorderDark,
            pointHoverBorderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1500, easing: 'easeInOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: tooltipBg,
              titleColor: tooltipText,
              bodyColor: tooltipText,
              borderColor: tooltipBorder,
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: false,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 16, weight: '600' },
              callbacks: { label: (c: any) => `${c.parsed.y} tests` }
            }
          },
          scales: {
            x: {
              ticks: { color: axisColor, font: { size: 10, weight: '500' }, maxRotation: 45, minRotation: 0 },
              grid: { display: false, drawBorder: false },
              border: { color: gridColor }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: axisColor,
                font: { size: 11, weight: '500' },
                stepSize: null,
                callback: (v: any) => v.toLocaleString()
              },
              grid: { color: gridColor, drawBorder: false, lineWidth: 1 },
              border: { color: gridColor }
            }
          },
          interaction: { intersect: false, mode: 'index' }
        }
      });
      this.charts.push(chart);
    }

    // Usage by Month — Bar chart (FIX 5: fill #7F77DD)
    if (this.usageByMonthChartRef) {
      const ctx = this.usageByMonthChartRef.nativeElement.getContext('2d');
      if (!ctx) return;

      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.analytics.usageByMonth.map((u: UsageStatistic) => u.label),
          datasets: [{
            label: 'Tests',
            data: this.analytics.usageByMonth.map((u: UsageStatistic) => u.count),
            backgroundColor: barMonthColor,
            borderColor: barMonthColor,
            borderWidth: 0,
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 60
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1500, easing: 'easeInOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: tooltipBg,
              titleColor: tooltipText,
              bodyColor: tooltipText,
              borderColor: tooltipBorder,
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: false,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 16, weight: '600' },
              callbacks: { label: (c: any) => `${c.parsed.y} tests` }
            }
          },
          scales: {
            x: {
              ticks: { color: axisColor, font: { size: 11, weight: '500' }, maxRotation: 45, minRotation: 0 },
              grid: { display: false, drawBorder: false },
              border: { color: gridColor }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: axisColor,
                font: { size: 11, weight: '500' },
                stepSize: null,
                callback: (v: any) => v.toLocaleString()
              },
              grid: { color: gridColor, drawBorder: false, lineWidth: 1 },
              border: { color: gridColor }
            }
          },
          interaction: { intersect: false, mode: 'index' }
        }
      });
      this.charts.push(chart);
    }

    // Usage by Year — Bar chart (FIX 5: fill #2E86DE)
    if (this.usageByYearChartRef) {
      const ctx = this.usageByYearChartRef.nativeElement.getContext('2d');
      if (!ctx) return;

      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.analytics.usageByYear.map((u: UsageStatistic) => u.label),
          datasets: [{
            label: 'Tests',
            data: this.analytics.usageByYear.map((u: UsageStatistic) => u.count),
            backgroundColor: barYearColor,
            borderColor: barYearColor,
            borderWidth: 0,
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 80
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1500, easing: 'easeInOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: tooltipBg,
              titleColor: tooltipText,
              bodyColor: tooltipText,
              borderColor: tooltipBorder,
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: false,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 16, weight: '600' },
              callbacks: { label: (c: any) => `${c.parsed.y.toLocaleString()} tests` }
            }
          },
          scales: {
            x: {
              ticks: { color: axisColor, font: { size: 12, weight: '500' }, maxRotation: 0, minRotation: 0 },
              grid: { display: false, drawBorder: false },
              border: { color: gridColor }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: axisColor,
                font: { size: 11, weight: '500' },
                stepSize: null,
                callback: (value: any) => {
                  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
                  return value.toLocaleString();
                }
              },
              grid: { color: gridColor, drawBorder: false, lineWidth: 1 },
              border: { color: gridColor }
            }
          },
          interaction: { intersect: false, mode: 'index' }
        }
      });
      this.charts.push(chart);
    }

    // Result Distribution — Doughnut (FIX 5: Positive #E05252, Negative #1D9E75, Uncertain #F0A500)
    if (this.resultDistributionChartRef) {
      const ctx = this.resultDistributionChartRef.nativeElement.getContext('2d');
      if (!ctx) return;

      const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Positive', 'Negative', 'Uncertain'],
          datasets: [{
            data: [
              this.analytics.testResultsDistribution.positive,
              this.analytics.testResultsDistribution.negative,
              this.analytics.testResultsDistribution.uncertain
            ],
            backgroundColor: ['#E05252', '#1D9E75', '#F0A500'],
            borderColor: ['#E05252', '#1D9E75', '#F0A500'],
            borderWidth: 2,
            hoverBorderWidth: 3,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1500, easing: 'easeInOutQuart', animateRotate: true, animateScale: true },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#8B95A6',
                padding: 15,
                font: { size: 12, weight: '500' },
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: tooltipBg,
              padding: 12,
              titleColor: tooltipText,
              bodyColor: tooltipText,
              borderColor: tooltipBorder,
              borderWidth: 1,
              cornerRadius: 8,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 16, weight: '600' },
              callbacks: {
                label: (context: any) => {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${value.toLocaleString()} (${percentage}%)`;
                }
              }
            }
          },
          cutout: '60%',
          interaction: { intersect: true, mode: 'point' }
        }
      });
      this.charts.push(chart);
    }
  }

  // Dummy data generator - fallback when API is unavailable
  getDummyAnalytics(): AdminDashboardAnalytics {
    const now = new Date();
    const days: any[] = [];
    const months: any[] = [];
    const years: any[] = [];

    // Generate last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString(),
        count: Math.floor(Math.random() * 50) + 10,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }

    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      months.push({
        date: date.toISOString(),
        count: Math.floor(Math.random() * 200) + 100,
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
    }

    // Generate last 5 years
    for (let i = 4; i >= 0; i--) {
      const date = new Date(now);
      date.setFullYear(date.getFullYear() - i);
      years.push({
        date: date.toISOString(),
        count: Math.floor(Math.random() * 2000) + 1000,
        label: date.getFullYear().toString()
      });
    }

    const totalRegisteredUsers = 1250;
    const activeUsers = 800;
    const activationRate = Math.round((activeUsers / totalRegisteredUsers) * 1000) / 10; // one decimal place

    return {
      totalRegisteredUsers,
      activeUsers,
      activationRate,
      totalTests: 3420,
      positiveCases: 856,
      negativeCases: 2314,
      uncertainCases: 250,
      averageAccuracy: 82.5,
      usageByDay: days,
      usageByMonth: months,
      usageByYear: years,
      recentTests: [],
      testResultsDistribution: {
        positive: 856,
        negative: 2314,
        uncertain: 250
      }
    };
  }

  refreshData() {
    this.loadAnalytics();
  }

  onDaysChange() {
    this.loadAnalytics();
  }

  onMonthsChange() {
    this.loadAnalytics();
  }

  onYearsChange() {
    this.loadAnalytics();
  }

  navigateToTestRecords() {
    this.router.navigate(['/test-records']);
  }

  getPositivePercentage(): number {
    if (!this.analytics || this.analytics.totalTests === 0) return 0;
    return Math.round((this.analytics.positiveCases / this.analytics.totalTests) * 100);
  }

  getNegativePercentage(): number {
    if (!this.analytics || this.analytics.totalTests === 0) return 0;
    return Math.round((this.analytics.negativeCases / this.analytics.totalTests) * 100);
  }

  getUncertainPercentage(): number {
    if (!this.analytics || this.analytics.totalTests === 0) return 0;
    return Math.round((this.analytics.uncertainCases / this.analytics.totalTests) * 100);
  }

  getTestsPerUser(): number {
    if (!this.analytics || this.analytics.totalRegisteredUsers === 0) return 0;
    return Math.round((this.analytics.totalTests / this.analytics.totalRegisteredUsers) * 10) / 10;
  }

  // Helper for template
  Math = Math;
}

