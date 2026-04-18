import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { AnalysisResult, UserTestRecordRequest } from '../../../models/api.models';
import { HttpErrorResponse } from '@angular/common/http';
import type { ClinicalGaitForm } from './gait-clinical-form.types';
import {
  parseGaitCsvText,
  validateGaitCsvFile,
  GAIT_CSV_REQUIRED_COLUMNS
} from './gait-csv-import.util';

export type { ClinicalGaitForm } from './gait-clinical-form.types';

/** Maps UI clinical inputs → 17-vector order in ml_service/gait_features.txt (internal only). */
function buildModelFeatureVector(form: ClinicalGaitForm): number[] {
  const cadence = Math.max(1, form.cadence);
  const strideLen = Math.max(0.05, form.strideLength);
  const stepTimeMean = 60 / cadence;
  const strideTimeMean = 2 * stepTimeMean;
  const stVar = Math.max(0, form.stepTimeVariability);
  const stepTimeStd = Math.max(1e-6, stVar * stepTimeMean + 0.002);
  const strideTimeStd = Math.max(1e-6, stVar * strideTimeMean + 0.002);
  const vel = (form.gaitVelocity + form.walkingSpeed) / 2;
  const stepLen = Math.max(
    0.08,
    strideLen * 0.48 - Math.abs(form.stepLengthDifference) * 0.2
  );
  const bal = Math.min(100, Math.max(0, form.balanceScore)) / 100;
  const asym = Math.max(0, form.forceAsymmetry);
  const diff = form.stepLengthDifference;
  const leftForce = 42 + 58 * bal - asym * 48 + diff * 35;
  const rightForce = 42 + 58 * bal + asym * 48 - diff * 35;
  const swing = Math.min(0.48, Math.max(0.28, 0.30 + bal * 0.16 - stVar * 0.08));
  const stance = 1 - swing;

  return [
    strideTimeMean,
    strideTimeStd,
    stepTimeMean,
    stepTimeStd,
    form.cadence,
    vel,
    stepLen,
    strideLen,
    asym,
    stVar,
    Math.min(stVar * 1.08, stVar + 0.02),
    leftForce,
    rightForce,
    9 + stVar * 28 + asym * 12,
    9 + stVar * 28 + asym * 12,
    swing,
    stance
  ];
}

@Component({
  selector: 'app-gait-visualizer',
  templateUrl: './gait-visualizer.component.html',
  styleUrls: ['./gait-visualizer.component.scss'],
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('380ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('pulseSoft', [
      transition(':enter', [
        style({ opacity: 0.85 }),
        animate('600ms ease-out', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class GaitVisualizerComponent {
  /** Demo preset: strong clinically typical pattern */
  readonly healthyExample: ClinicalGaitForm = {
    gaitVelocity: 1.2,
    strideLength: 1.3,
    cadence: 110,
    stepTimeVariability: 0.05,
    forceAsymmetry: 0.05,
    balanceScore: 85,
    walkingSpeed: 1.2,
    stepLengthDifference: 0.03
  };

  /** Demo preset: strong Parkinson-like gait pattern */
  readonly parkinsonExample: ClinicalGaitForm = {
    gaitVelocity: 0.3,
    strideLength: 0.4,
    cadence: 65,
    stepTimeVariability: 0.45,
    forceAsymmetry: 0.6,
    balanceScore: 20,
    walkingSpeed: 0.3,
    stepLengthDifference: 0.35
  };

  form: ClinicalGaitForm = { ...this.healthyExample };
  clinicalNotes = '';

  analysisResult: AnalysisResult | null = null;
  error = '';
  isProcessing = false;
  currentUser: unknown = null;

  /** UX summary derived after successful analysis */
  displayPredictedLabel: 'Healthy' | 'Mild Risk' | "Parkinson's Detected" | '' = '';
  displayConfidencePercent: number | null = null;
  contributingFactors: string[] = [];
  clinicalInterpretation = '';

  /** From ?fromRequest= — server marks clinician test request completed when gait record is saved */
  private readonly clinicianTestRequestId?: number;

  /** Last CSV import (audit / test record notes only; file is not stored) */
  gaitValueSource: 'manual' | 'csv' = 'manual';
  csvFileName: string | null = null;
  csvImportErrors: string[] = [];
  csvPreview: { key: string; value: string }[] = [];

  @ViewChild('csvFileInput') csvFileInput?: ElementRef<HTMLInputElement>;

  readonly csvRequiredColumns = GAIT_CSV_REQUIRED_COLUMNS;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {
    this.authService.currentUser$.subscribe(u => { this.currentUser = u; });
    const fr = this.route.snapshot.queryParamMap.get('fromRequest');
    const id = fr ? parseInt(fr, 10) : NaN;
    this.clinicianTestRequestId = Number.isFinite(id) ? id : undefined;
  }

  loadHealthyExample(): void {
    this.form = { ...this.healthyExample };
    this.clearCsvState();
    this.resetOutcomePanel();
  }

  loadParkinsonExample(): void {
    this.form = { ...this.parkinsonExample };
    this.clearCsvState();
    this.resetOutcomePanel();
  }

  openCsvPicker(): void {
    this.csvFileInput?.nativeElement?.click();
  }

  onCsvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';

    this.csvImportErrors = [];

    const pre = validateGaitCsvFile(file);
    if (pre) {
      this.csvImportErrors = [pre];
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseGaitCsvText(text);
      if (!parsed.ok) {
        this.csvImportErrors = parsed.errors;
        this.csvFileName = file!.name;
        return;
      }

      const rangeCheck = this.validateForm(parsed.values);
      if (!rangeCheck.ok) {
        this.csvImportErrors = [
          rangeCheck.message,
          'Adjust values manually or fix the CSV and upload again.'
        ];
        this.csvFileName = file!.name;
        return;
      }

      this.form = { ...parsed.values };
      this.gaitValueSource = 'csv';
      this.csvFileName = file!.name;
      this.csvImportErrors = [];
      this.csvPreview = [
        { key: 'gait_velocity', value: String(parsed.values.gaitVelocity) },
        { key: 'stride_length', value: String(parsed.values.strideLength) },
        { key: 'cadence', value: String(parsed.values.cadence) },
        { key: 'step_time_variability', value: String(parsed.values.stepTimeVariability) },
        { key: 'force_asymmetry', value: String(parsed.values.forceAsymmetry) },
        { key: 'balance_score', value: String(parsed.values.balanceScore) },
        { key: 'walking_speed', value: String(parsed.values.walkingSpeed) },
        { key: 'step_length_difference', value: String(parsed.values.stepLengthDifference) }
      ];
      this.resetOutcomePanel();
    };
    reader.onerror = () => {
      this.csvImportErrors = ['Could not read the file. Try again.'];
    };
    reader.readAsText(file!);
  }

  clearCsvImport(): void {
    this.clearCsvState();
    this.resetOutcomePanel();
  }

  private clearCsvState(): void {
    this.gaitValueSource = 'manual';
    this.csvFileName = null;
    this.csvImportErrors = [];
    this.csvPreview = [];
  }

  /** Clears the result panel when the clinician adjusts inputs after a run. */
  onFieldEdited(): void {
    if (this.gaitValueSource === 'csv') {
      this.gaitValueSource = 'manual';
      this.csvFileName = null;
      this.csvPreview = [];
    }
    this.csvImportErrors = [];
    this.resetOutcomePanel();
  }

  get outcomeIsHealthy(): boolean {
    return this.displayPredictedLabel === 'Healthy';
  }

  get outcomeIsMild(): boolean {
    return this.displayPredictedLabel === 'Mild Risk';
  }

  get outcomeIsParkinson(): boolean {
    return this.displayPredictedLabel === "Parkinson's Detected";
  }

  private resetOutcomePanel(): void {
    this.analysisResult = null;
    this.displayPredictedLabel = '';
    this.displayConfidencePercent = null;
    this.contributingFactors = [];
    this.clinicalInterpretation = '';
    this.error = '';
  }

  analyzeGaitPattern(): void {
    this.error = '';
    const v = this.validateForm(this.form);
    if (!v.ok) {
      this.error = v.message;
      return;
    }

    const values = buildModelFeatureVector(this.form);
    if (Math.max(...values.map(x => Math.abs(x))) < 1e-4) {
      this.error = 'Entered values are too small to analyze. Adjust the gait parameters.';
      return;
    }

    const sessionId = `gait-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    // Wrap with named clinical fields for backend logging/debug (backend still reads `.features`).
    const gaitDataJson = JSON.stringify({
      clinical: { ...this.form },
      features: values
    });

    this.isProcessing = true;
    this.analysisResult = null;
    this.displayPredictedLabel = '';
    this.apiService.processAnalysis({
      sessionId,
      hasVoiceData: false,
      hasGaitData: true,
      gaitDataJson
    }).subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.analysisResult = res;
        this.populateOutcome(res);
        this.persistGaitTestRecord(res, sessionId);
      },
      error: (err: HttpErrorResponse) => {
        this.isProcessing = false;
        this.error = err.error?.message || err.message || 'Analysis could not be completed. Please try again.';
      }
    });
  }

  private validateForm(f: ClinicalGaitForm = this.form): { ok: boolean; message: string } {
    if (Number.isNaN(f.gaitVelocity) || f.gaitVelocity < 0 || f.gaitVelocity > 4) {
      return { ok: false, message: 'Gait velocity must be between 0 and 4 m/s.' };
    }
    if (Number.isNaN(f.walkingSpeed) || f.walkingSpeed < 0 || f.walkingSpeed > 4) {
      return { ok: false, message: 'Walking speed must be between 0 and 4 m/s.' };
    }
    if (Number.isNaN(f.strideLength) || f.strideLength <= 0 || f.strideLength > 3) {
      return { ok: false, message: 'Stride length must be between 0 and 3 m.' };
    }
    if (Number.isNaN(f.cadence) || f.cadence < 20 || f.cadence > 220) {
      return { ok: false, message: 'Cadence must be between 20 and 220 steps/min.' };
    }
    if (Number.isNaN(f.stepTimeVariability) || f.stepTimeVariability < 0 || f.stepTimeVariability > 1) {
      return { ok: false, message: 'Step time variability must be between 0 and 1.' };
    }
    if (Number.isNaN(f.forceAsymmetry) || f.forceAsymmetry < 0 || f.forceAsymmetry > 1) {
      return { ok: false, message: 'Force asymmetry must be between 0 and 1.' };
    }
    if (Number.isNaN(f.balanceScore) || f.balanceScore < 0 || f.balanceScore > 100) {
      return { ok: false, message: 'Balance score must be between 0 and 100.' };
    }
    if (Number.isNaN(f.stepLengthDifference) || f.stepLengthDifference < -1 || f.stepLengthDifference > 1) {
      return { ok: false, message: 'Step length difference must be between -1 and 1 m.' };
    }
    return { ok: true, message: '' };
  }

  private populateOutcome(res: AnalysisResult): void {
    const rp = Number(res.riskPercent ?? 0);
    const pc = (res.predictedClass || '').replace(/\s/g, '');
    const isParkinson =
      rp >= 60 ||
      /ParkinsonPositive/i.test(pc);
    const isMild =
      !isParkinson && (rp >= 35 || /Uncertain/i.test(pc));

    this.displayPredictedLabel = isParkinson
      ? "Parkinson's Detected"
      : isMild
        ? "Mild Risk"
        : 'Healthy';

    const conf = res.confidenceScore;
    this.displayConfidencePercent =
      conf != null ? Math.round(Math.min(100, Math.max(0, Number(conf) * 100))) : null;

    this.contributingFactors = this.computeContributingFactors(this.form, this.displayPredictedLabel);
    this.clinicalInterpretation = this.computeInterpretation(this.form, this.displayPredictedLabel, res);
  }

  private computeContributingFactors(
    f: ClinicalGaitForm,
    outcome: 'Healthy' | 'Mild Risk' | "Parkinson's Detected" | ''
  ): string[] {
    const abnormal: string[] = [];
    if (f.gaitVelocity < 1.0 || f.walkingSpeed < 1.0) abnormal.push('Reduced gait velocity relative to typical adult values');
    if (f.strideLength < 1.0) abnormal.push('Shortened stride length');
    if (f.cadence < 100) abnormal.push('Lower-than-typical cadence');
    if (f.stepTimeVariability > 0.15) abnormal.push('Elevated step timing variability');
    if (f.forceAsymmetry > 0.15) abnormal.push('Asymmetric limb loading (force asymmetry)');
    if (f.balanceScore < 65) abnormal.push('Lower balance score on clinical observation');
    if (Math.abs(f.stepLengthDifference) > 0.08) abnormal.push('Inter-limb step length difference');

    // Align explanation with the *final* predicted category to avoid “Healthy + severe abnormalities”.
    if (outcome === 'Healthy') {
      const minor: string[] = [];
      if ((f.gaitVelocity >= 0.9 && f.gaitVelocity < 1.0) || (f.walkingSpeed >= 0.9 && f.walkingSpeed < 1.0)) {
        minor.push('Slightly reduced gait velocity compared with typical reference ranges');
      }
      if (f.strideLength >= 0.9 && f.strideLength < 1.0) {
        minor.push('Slightly shorter stride length compared with typical reference ranges');
      }
      if (f.stepTimeVariability >= 0.12 && f.stepTimeVariability <= 0.15) {
        minor.push('Mildly elevated step timing variability');
      }
      if (minor.length) return minor.slice(0, 2);
      return ['Gait parameters fall within commonly reported non-pathological ranges'];
    }

    if (abnormal.length === 0) {
      return ['Gait parameters fall within commonly reported non-pathological ranges'];
    }
    return outcome === 'Mild Risk' ? abnormal.slice(0, 4) : abnormal;
  }

  private computeInterpretation(
    f: ClinicalGaitForm,
    outcome: 'Healthy' | 'Mild Risk' | "Parkinson's Detected" | '',
    res: AnalysisResult
  ): string {
    const bits: string[] = [];
    if (f.gaitVelocity < 1.0) {
      bits.push('reduced gait velocity');
    }
    if (f.strideLength < 1.0) {
      bits.push('shorter stride length');
    }
    if (f.forceAsymmetry > 0.15 || Math.abs(f.stepLengthDifference) > 0.1) {
      bits.push('increased asymmetry');
    }
    if (f.stepTimeVariability > 0.15) {
      bits.push('irregular step timing');
    }

    if (outcome === "Parkinson's Detected") {
      if (bits.length) {
        const joined = bits.slice(0, 3).join(', ');
        return `${joined.charAt(0).toUpperCase() + joined.slice(1)} suggest a pattern sometimes seen in Parkinsonian gait. This is a screening aid only and not a diagnosis.`;
      }
      return 'The entered pattern is associated with higher estimated neurological risk on this screening model. Clinical correlation is required; this is not a diagnosis.';
    }

    if (outcome === 'Mild Risk') {
      if (bits.length) {
        const joined = bits.slice(0, 2).join(' and ');
        return `${joined.charAt(0).toUpperCase() + joined.slice(1)} may warrant follow-up. This screening estimate is intermediate and should be interpreted in clinical context.`;
      }
      return 'Some parameters deviate from typical ranges and the screening estimate is intermediate. Clinical judgment should guide follow-up.';
    }

    if (bits.length === 0) {
      return 'Overall gait parameters align with a relatively typical pattern on this screening tool. Discuss any concerns with your clinician.';
    }
    // If the model predicts Healthy, keep interpretation conservative.
    const rp = Number(res.riskPercent ?? 0);
    if (rp < 35) {
      return 'A few values deviate slightly from typical reference ranges, but the screening estimate remains lower. Clinical judgment should guide follow-up.';
    }
    return 'Some parameters deviate from typical ranges. Consider repeating the assessment and correlating with clinical history.';
  }

  private persistGaitTestRecord(res: AnalysisResult, sessionId: string): void {
    const user = this.currentUser as { email?: string; id?: number } | null;
    const p = res.predictionScore ?? (res.riskPercent != null ? res.riskPercent / 100 : undefined);
    const notesExtra = this.clinicalNotes.trim()
      ? ` Clinical notes: ${this.clinicalNotes.trim()}`
      : '';
    const sourceExtra =
      this.gaitValueSource === 'csv' && this.csvFileName
        ? ` Source: CSV upload (${this.csvFileName}).`
        : ' Source: Manual entry.';
    const req: UserTestRecordRequest = {
      userName: user?.email || 'Anonymous',
      userId: user?.id,
      status: 'Completed',
      testResult: (res.riskPercent ?? 0) >= 50 ? 'Positive' : 'Negative',
      accuracy: (res.confidenceScore ?? 0) * 100,
      riskPercent: res.riskPercent != null ? Math.round(res.riskPercent) : undefined,
      analysisNotes:
        `Gait clinical assessment. Session: ${sessionId}. Model: ${res.modelVersion || '—'}.${sourceExtra}${notesExtra}`,
      modality: 'gait',
      predictionScore0To1: p != null ? Math.min(1, Math.max(0, p)) : undefined,
      ...(this.clinicianTestRequestId != null
        ? { clinicianTestRequestId: this.clinicianTestRequestId }
        : {})
    };
    this.apiService.createUserTestRecord(req).subscribe({
      next: (record) => {
        if (record?.id) {
          this.apiService.linkAnalysisToTestRecord(sessionId, record.id).subscribe({ error: () => {} });
        }
      },
      error: () => {}
    });
  }

  riskBadgeClass(): string {
    const lvl = (this.analysisResult?.riskLevel || '').toLowerCase();
    if (lvl.includes('high')) {
      return 'ga-badge ga-badge-high';
    }
    if (lvl.includes('moderate')) {
      return 'ga-badge ga-badge-mod';
    }
    return 'ga-badge ga-badge-low';
  }

  riskBadgeLabel(): string {
    const lvl = (this.analysisResult?.riskLevel || '').toLowerCase();
    if (lvl.includes('high')) {
      return 'High Risk';
    }
    if (lvl.includes('moderate')) {
      return 'Moderate Risk';
    }
    return 'Low Risk';
  }
}
