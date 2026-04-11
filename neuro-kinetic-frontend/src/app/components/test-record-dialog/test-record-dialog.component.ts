import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, ViewChild, ElementRef, ChangeDetectorRef, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserTestRecord, AnalysisResult } from '../../models/api.models';
import { ApiService } from '../../services/api.service';
import { ModalService } from '../../services/modal.service';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-test-record-dialog',
  templateUrl: './test-record-dialog.component.html',
  styleUrls: ['./test-record-dialog.component.scss']
})
export class TestRecordDialogComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() visible: boolean = false;
  @Input() record: UserTestRecord | null = null;
  @Input() isEditMode: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<UserTestRecord>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('voiceFeaturesChart') voiceFeaturesChartRef?: ElementRef<HTMLCanvasElement>;
  private voiceFeaturesChart: Chart | null = null;

  recordForm!: FormGroup;
  testResultOptions = [
    { label: 'Positive', value: 'Positive' },
    { label: 'Negative', value: 'Negative' },
    { label: 'Uncertain', value: 'Uncertain' }
  ];
  statusOptions = [
    { label: 'Completed', value: 'Completed' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Failed', value: 'Failed' }
  ];

  // Voice features
  voiceFeatures: { [key: string]: number } | null = null;
  objectKeys = Object.keys;
  loadingFeatures = false;
  analysisResult: AnalysisResult | null = null;

  /** Responsive panel width; vertical bounds use min(dvh) in component SCSS */
  readonly dialogPanelStyle: Record<string, string> = {
    width: 'min(92vw, 900px)',
    maxWidth: 'min(96vw, 900px)',
  };


  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['record'] && this.record) {
      this.initializeForm();
      if (this.record && !this.isEditMode) {
        this.loadVoiceFeatures();
      }
    }
    if (changes['visible'] && changes['visible'].currentValue && this.record && !this.isEditMode) {
      this.loadVoiceFeatures();
    }
  }

  ngAfterViewInit() {
    // Chart will be created when voiceFeatures are loaded
  }

  ngOnDestroy() {
    if (this.voiceFeaturesChart) {
      this.voiceFeaturesChart.destroy();
      this.voiceFeaturesChart = null;
    }
  }

  /** Shown under patient name when it differs from stored login/email. */
  get patientEmailLine(): string | null {
    if (!this.record) return null;
    const name = (this.record.displayName || '').trim();
    const login = (this.record.userName || '').trim();
    if (!login || !name || login.toLowerCase() === name.toLowerCase()) return null;
    return `Account / email: ${login}`;
  }

  initializeForm() {
    const recordData: Partial<UserTestRecord> = this.record || {};
    const display =
      (recordData.displayName?.trim() || recordData.userName || '').trim();

    this.recordForm = this.fb.group({
      userName: [{ value: display, disabled: true }],
      testDate: [{ value: recordData.testDate ? new Date(recordData.testDate) : new Date(), disabled: true }],
      // In view mode, make these fields read-only as well
      testResult: [{ value: recordData.testResult || 'Uncertain', disabled: !this.isEditMode }, Validators.required],
      accuracy: [{ value: recordData.accuracy || 0, disabled: !this.isEditMode }, [Validators.required, Validators.min(0), Validators.max(100)]],
      status: [{ value: recordData.status || 'Pending', disabled: !this.isEditMode }, Validators.required],
      voiceRecordingUrl: [{ value: recordData.voiceRecordingUrl || '', disabled: !this.isEditMode }],
      analysisNotes: [recordData.analysisNotes || '']
    });
  }

  onSave() {
    if (this.recordForm.valid) {
      const formValue = this.recordForm.getRawValue();
      const updatedRecord: UserTestRecord = {
        ...this.record!,
        ...formValue,
        userName: this.record!.userName,
        displayName: this.record!.displayName,
        testDate: formValue.testDate instanceof Date 
          ? formValue.testDate.toISOString() 
          : this.record!.testDate
      };
      this.save.emit(updatedRecord);
    }
  }

  onCancel() {
    this.visibleChange.emit(false);
    this.cancel.emit();
  }

  onClose() {
    this.visibleChange.emit(false);
  }

  /**
   * Extract sessionId from analysisNotes or voiceRecordingUrl
   */
  private extractSessionId(): string | null {
    if (!this.record) return null;

    // Try to extract from analysisNotes (format: "Analysis completed. Risk: X% (Y). Session: test-...")
    if (this.record.analysisNotes) {
      const sessionMatch = this.record.analysisNotes.match(/Session:\s*(test-[^\s]+)/i) ||
                          this.record.analysisNotes.match(/(test-\d+-\w+)/);
      if (sessionMatch) {
        return sessionMatch[1];
      }
    }

    // Try to extract from voiceRecordingUrl (if it contains session ID)
    if (this.record.voiceRecordingUrl) {
      const urlMatch = this.record.voiceRecordingUrl.match(/(test-\d+-\w+)/);
      if (urlMatch) {
        return urlMatch[1];
      }
    }

    return null;
  }

  /**
   * Load voice features from analysis result
   */
  private loadVoiceFeatures() {
    if (!this.record || this.record.status !== 'Completed') {
      return;
    }

    this.loadingFeatures = true;

    // Try to get analysis by sessionId first
    const sessionId = this.extractSessionId();
    if (sessionId) {
      this.apiService.getAnalysisBySessionId(sessionId).subscribe({
        next: (result: AnalysisResult) => {
          this.handleAnalysisResult(result);
        },
        error: (error) => {
          console.warn('Failed to get analysis by sessionId, trying by record ID...', error);
          // Fallback: try to get by test record ID
          this.tryGetAnalysisByRecordId();
        }
      });
    } else {
      // Try to get by test record ID directly
      this.tryGetAnalysisByRecordId();
    }
  }

  /**
   * Try to get analysis result by test record ID
   */
  private tryGetAnalysisByRecordId() {
    if (!this.record) return;

    // Try to get analysis by record ID (if backend supports it)
    // Note: This assumes the analysis ID might match the record ID or be related
    this.apiService.getAnalysisResult(this.record.id).subscribe({
      next: (result: AnalysisResult) => {
        this.handleAnalysisResult(result);
      },
      error: (error) => {
        console.warn('Could not load analysis result for test record:', error);
        this.voiceFeatures = null;
        this.loadingFeatures = false;
      }
    });
  }

  /**
   * Handle analysis result and parse voice features
   */
  private handleAnalysisResult(result: AnalysisResult) {
    this.analysisResult = result;
    
    // Parse voice features
    if (result && result.voiceFeaturesJson) {
      try {
        this.voiceFeatures = JSON.parse(result.voiceFeaturesJson);
        this.cdr.detectChanges();
        
        // Create chart after view is updated
        setTimeout(() => {
          this.updateVoiceFeaturesChart();
        }, 100);
      } catch (parseError) {
        console.error('Error parsing voiceFeaturesJson:', parseError);
        this.voiceFeatures = null;
      }
    } else {
      this.voiceFeatures = null;
    }
    
    this.loadingFeatures = false;
  }

  /**
   * Update or create voice features chart
   */
  private updateVoiceFeaturesChart(): void {
    if (!this.voiceFeatures) {
      return;
    }

    if (!this.voiceFeaturesChartRef) {
      setTimeout(() => this.updateVoiceFeaturesChart(), 100);
      return;
    }

    const entries = Object.entries(this.voiceFeatures);
    const labels = entries.map(([key]) => this.formatFeatureName(key));
    const data = entries.map(([, value]) => Number(value));

    const ctx = this.voiceFeaturesChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.voiceFeaturesChart) {
      this.voiceFeaturesChart.data.labels = labels;
      this.voiceFeaturesChart.data.datasets[0].data = data;
      this.voiceFeaturesChart.update();
      return;
    }

    try {
      this.voiceFeaturesChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Voice Feature Value',
              data,
              backgroundColor: '#22c55e',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              ticks: {
                color: '#e5e7eb',
                font: { size: 10 },
                maxRotation: 45,
                minRotation: 45
              },
              grid: { display: false }
            },
            y: {
              ticks: {
                color: '#9ca3af',
                font: { size: 10 }
              },
              grid: { color: 'rgba(148,163,184,0.15)' }
            }
          }
        }
      });
    } catch (chartError) {
      console.error('Error creating chart:', chartError);
    }
  }

  /**
   * Format feature name for display
   */
  formatFeatureName(key: string): string {
    const names: { [key: string]: string } = {
      'jitter_local_percent': 'Jitter (Local %)',
      'jitter_local_abs': 'Jitter (Absolute)',
      'jitter_rap': 'Jitter (RAP)',
      'jitter_ppq5': 'Jitter (PPQ5)',
      'shimmer_local': 'Shimmer (Local)',
      'shimmer_local_db': 'Shimmer (dB)',
      'nhr': 'Noise-to-Harmonics Ratio',
      'hnr': 'Harmonics-to-Noise Ratio',
      'rpde': 'RPDE',
      'dfa': 'DFA',
      'ppe': 'PPE'
    };
    return names[key] || key;
  }

  canShowRag(): boolean {
    if (this.isEditMode || !this.analysisResult) return false;
    const riskPercent = this.analysisResult.riskPercent;
    return riskPercent !== undefined && riskPercent !== null;
  }

  getRagScreeningMode(): 'voice' | 'gait' | 'multimodal' {
    const t = this.analysisResult?.analysisType;
    if (t === 'Gait') return 'gait';
    if (t === 'MultiModal') return 'multimodal';
    return 'voice';
  }

  openAskResultsDialog(): void {
    this.modalService.openAskResultsDialog(
      this.analysisResult?.riskPercent ?? null,
      this.getRagScreeningMode()
    );
  }
}

