// User Model
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Public' | 'Researcher' | 'MedicalProfessional' | 'Admin';
  status?: 'Pending' | 'Approved' | 'Rejected' | 'Inactive';
  isActive?: boolean; // NEW: indicates if account is active
  institution?: string;
  researchFocus?: string;
  provider?: string; // OAuth provider (e.g., Google, Facebook)
  providerId?: string; // Provider user id
  createdAt?: string;
}

// Auth Response
export interface AuthResponse {
  token?: string;
  user?: User;
  status?: 'Pending' | 'Approved' | 'Rejected' | 'Activated';
  message?: string;
}

// Admin Account Requests
export interface AccountRequest {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Inactive';
  comment?: string;
  createdAt?: string;
}

export interface UpdateUserStatusRequest {
  status: 'Approved' | 'Rejected' | 'Pending' | 'Inactive';
  comment?: string;
}

// Notifications (matches backend API)
export interface NotificationItem {
  id: number;
  userId?: number;
  message: string;
  status: number; // 0 = Unread, 1 = Read (backend format)
  relatedEntity?: string;
  relatedEntityId?: number;
  createdAt: string;
  updatedAt?: string | null;
}

// Helper type for frontend display
export type NotificationStatus = 'Unread' | 'Read';

// Publication Model
export interface Publication {
  id: number;
  title: string;
  abstract?: string;
  authors?: string;
  journal?: string;
  year?: number;
  doi?: string;
  link?: string;
  type: 'Research' | 'Review' | 'CaseStudy';
  isFeatured: boolean;
  tags?: string;
  createdAt: string;
}

// Paginated Result
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// Dataset
export interface Dataset {
  id: number;
  name: string;
  source?: string;
  version?: string;
  totalSamples?: number;
  voiceSamples?: number;
  gaitSamples?: number;
  multiModalSamples?: number;
  description?: string;
  license?: string;
  accessLink?: string;
  isPublic: boolean;
  citation?: string;
  createdAt: string;
}

// Analysis Request
export interface AnalysisRequest {
  filePath: string;
  analysisType: 'Voice' | 'Gait';
  sessionId?: string;
  metadata?: Record<string, any>;
}

/** CVAME gait benchmark + training curves — only returned by GET /api/analysis/gait-model-info (gait UI). */
export interface GaitModelInfo {
  metrics: Record<string, unknown> | null;
  training_history: {
    train_task_loss?: number[];
    train_domain_loss?: number[];
    test_task_acc?: number[];
  } | null;
  source_files?: { metrics: string; training_history: string };
}

// Analysis Result
export interface AnalysisResult {
  id: number;
  sessionId?: string;
  analysisType: 'Voice' | 'Gait' | 'MultiModal';
  predictionScore?: number;
  confidenceScore?: number;
  predictedClass?: 'Positive' | 'Negative' | 'Uncertain' | 'ParkinsonPositive' | 'Healthy';
  confidenceLevel?: 'High' | 'Medium' | 'Low';
  riskLevel?: 'Low' | 'Moderate' | 'High'; // NEW: Risk level from analysis
  riskPercent?: number; // NEW: 0-100 percentage (e.g., 50, 60, 75)
  modelVersion?: string; // NEW: Model version used for analysis
  details?: string;
  voiceFeaturesJson?: string;
  gaitFeaturesJson?: string;
  waveformDataJson?: string;
  skeletonDataJson?: string;
  isSimulation?: boolean;
  createdAt: string;
}

// Cross-Validation Result
export interface CrossValidationResult {
  id: number;
  datasetName: string;
  validationMethod: string;
  foldNumber?: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  domainAdaptationDrop?: number;
  sourceSite?: string;
  targetSite?: string;
  modelVersion?: string;
  notes?: string;
  createdAt: string;
}

// Error Response
export interface ErrorResponse {
  message?: string;
  errors?: { [key: string]: string[] };
}

// Validation Response
export interface ValidationResponse {
  valid: boolean;
  user?: User; // Optional user payload from validation
  message?: string; // Optional message from backend
}

// File Upload Response
export interface FileUploadResponse {
  fileId: number;
  fileName: string;
  filePath: string;
  fileUrl: string;
  contentType: string;
  fileSize: number;
  fileType: 'voice' | 'gait' | 'video' | 'image';
  uploadedAt: string;
}

// File Upload Request
export interface FileUploadRequest {
  file: File;
  fileType: 'voice' | 'gait' | 'video' | 'image';
  sessionId?: string;
  description?: string;
}

// Health Check Response
export interface HealthCheckEntry {
  name: string;
  status: 'Healthy' | 'Unhealthy' | 'Degraded';
  description?: string;
  duration: number;
}

export interface HealthCheckResponse {
  status: 'Healthy' | 'Unhealthy' | 'Degraded';
  totalDuration: number;
  entries: HealthCheckEntry[];
}

// Cross-Validation Aggregated DTO
export interface CrossValidationAggregatedDto {
  datasetName: string;
  totalFolds: number;
  averageAccuracy: number;
  averagePrecision: number;
  averageRecall: number;
  averageF1Score: number;
  stdDevAccuracy: number;
  stdDevPrecision: number;
  stdDevRecall: number;
  stdDevF1Score: number;
  folds: CrossValidationResult[];
  summary: StatisticalSummary;
}

export interface StatisticalSummary {
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
}

// User Test Record
export interface UserTestRecord {
  id: number;
  userId: number;
  userName: string;
  testDate: string;
  testResult: 'Positive' | 'Negative' | 'Uncertain';
  accuracy: number;
  /** Risk percentage 0–100 from screening (when provided by backend). */
  riskPercent?: number;
  status: 'Completed' | 'Pending' | 'Failed';
  /** Test modality/category for UI filtering and display: 'voice' | 'gait' | 'fingertapping' */
  testType?: 'voice' | 'gait' | 'fingertapping';
  voiceRecordingUrl?: string;
  analysisNotes?: string;
  createdAt: string;
}

// User Test Record Request (for creating new tests)
export interface UserTestRecordRequest {
  userId?: number;
  userName: string;
  testResult?: 'Positive' | 'Negative' | 'Uncertain';
  accuracy?: number;
  /** Risk percentage 0–100 from screening (for backend to store and return in list). */
  riskPercent?: number;
  status?: 'Completed' | 'Pending' | 'Failed';
  voiceRecordingUrl?: string;
  analysisNotes?: string;
  /** Backend: creates linked AnalysisResult for Test Records category (fingertapping | gait). */
  modality?: 'fingertapping' | 'gait';
  /** Model probability / risk 0–1; required with modality for correct test type in list. */
  predictionScore0To1?: number;
}

// Admin Dashboard Analytics
// NOTE: Shape must stay in sync with AdminDashboardAnalyticsDto from the backend.
export interface AdminDashboardAnalytics {
  /**
   * Total number of registered users in the system (all roles).
   * Example: 5
   */
  totalRegisteredUsers: number;

  /**
   * Users who have performed at least one test in the selected period.
   * Example: 3
   */
  activeUsers: number;

  /**
   * Percentage of active users out of total registered users.
   * Example: 60.0 (represents 60%)
   */
  activationRate: number;

  totalTests: number;
  positiveCases: number;
  negativeCases: number;
  uncertainCases: number;
  averageAccuracy: number;
  usageByDay: UsageStatistic[];
  usageByMonth: UsageStatistic[];
  usageByYear: UsageStatistic[];
  recentTests: UserTestRecord[];
  testResultsDistribution: TestResultDistribution;
}

export interface UsageStatistic {
  date: string;
  count: number;
  label: string;
}

export interface TestResultDistribution {
  positive: number;
  negative: number;
  uncertain: number;
}

// ========== NEW ENDPOINTS - SPRINT 1-5 ==========

// Clinical Disclaimer
export interface DisclaimerResponse {
  text: string;
  showOnResults: boolean;
  showOnDashboard: boolean;
}

// Result Explanation
export interface ResultExplanationDto {
  summary: string;
  detailedExplanation: string;
  riskAssessment: string;
  recommendations: string;
  confidenceInterpretation: string;
}// Trend Analysis
export interface TrendAnalysisDto {
  userId: number;
  userName: string;
  trends: UserTestTrendDataPoint[];
  summary: TrendSummary;
}

export interface UserTestTrendDataPoint {
  date: string; // ISO 8601 format
  testRecordId: number;
  riskLevel?: 'Low' | 'Moderate' | 'High';
  confidence?: number; // 0-1 decimal
  prediction?: 'Healthy' | 'ParkinsonPositive' | 'Uncertain';
  accuracy: number; // 0-100
  status: 'Completed' | 'Pending' | 'Failed';
}

export interface TrendSummary {
  totalTests: number;
  completedTests: number;
  overallTrend?: 'Improving' | 'Stable' | 'Declining';
  averageConfidence?: number; // 0-1 decimal
  averageAccuracy: number; // 0-100
  firstTestDate?: string; // ISO 8601
  lastTestDate?: string; // ISO 8601
}

// Comparison
export interface ComparisonDto {
  record1: UserTestRecordDto;
  record2: UserTestRecordDto;
  differences: ComparisonDifferences;
}

export interface UserTestRecordDto {
  id: number;
  userId?: number;
  userName: string;
  testDate: string; // ISO 8601
  testResult: 'Positive' | 'Negative' | 'Uncertain';
  accuracy: number; // 0-100 (model confidence)
  riskPercent?: number; // 0-100 screening risk (e.g. 40, 43)
  status: 'Completed' | 'Pending' | 'Failed';
  voiceRecordingUrl?: string;
  analysisNotes?: string;
  createdAt: string; // ISO 8601
}

export interface ComparisonDifferences {
  daysBetween: number;
  riskLevelChanged: boolean;
  riskLevelChange?: string; // e.g., "Low → Moderate"
  confidenceChange?: number; // Decimal change
  predictionChanged: boolean;
  predictionChange?: string; // e.g., "Healthy → Uncertain"
  accuracyChange: number; // Percentage change
  statusChange: string; // e.g., "Pending → Completed"
}

// Feature Explanation
export interface FeatureExplanationDto {
  features: FeatureExplanationItem[];
  summary: string;
}

export interface FeatureExplanationItem {
  featureName: string;
  value?: string;
  explanation: string;
  significance: string;
}

// ========== Clinical Decision Support (RAG) ==========

/** Request body for POST /api/rag/test */
export interface RagTestRequest {
  question: string;
  riskPercent: number;
  mode?: 'voice' | 'gait' | 'multimodal';
}

/** Irrelevant question response (isRelevant === false) */
export interface RagIrrelevantResponse {
  isRelevant: false;
  relevance_message: string;
}

/** Risk summary block from RAG */
export interface RagRiskSummary {
  risk_level: string;
  risk_percent: number;
  screening_mode: string;
  summary_text: string;
}

/** Clinical analysis block */
export interface RagClinicalAnalysis {
  interpretation: string;
  key_findings: string[];
  context: string;
}

/** Recommendation block */
export interface RagRecommendation {
  next_steps: string[];
  follow_up: string;
  priority: string;
}

/** Doctor referral block */
export interface RagDoctorReferral {
  recommended_specialist: string;
  reason: string;
  suggested_timing: string;
  city: string | null;
}

/** Lifestyle guidance block */
export interface RagLifestyleGuidance {
  general_advice: string[];
  activity_suggestions: string[];
  notes: string;
}

/** Relevant clinical response (isRelevant === true or omitted) */
export interface RagRelevantResponse {
  isRelevant?: true;
  relevanceMessage?: string | null;
  risk_summary: RagRiskSummary;
  clinical_analysis: RagClinicalAnalysis;
  recommendation: RagRecommendation;
  doctor_referral: RagDoctorReferral;
  lifestyle_guidance: RagLifestyleGuidance;
  disclaimer: string;
}

/** RAG API response: either irrelevant (message only) or full clinical */
export type RagTestResponse = RagIrrelevantResponse | RagRelevantResponse;

/** Type guard: response is irrelevant */
export function isRagIrrelevant(r: RagTestResponse): r is RagIrrelevantResponse {
  return r.isRelevant === false;
}

/** Response from POST /api/rag/ask (Python RAG knowledge-base). */
export interface RagAskResponse {
  answer: string;
}

export interface ChatConversation {
  id: number;
  title: string;
  lastMessagePreview?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// ========== Voice Predict (FastAPI /api/voice/predict) ==========

/** Request body for POST /api/voice/predict. Matches Python ML service: { features: [22 numbers in fixed order] }. */
export interface VoicePredictRequest {
  /**
   * Voice feature vector in the exact training order:
   * [MDVP:Fo(Hz), MDVP:Fhi(Hz), MDVP:Flo(Hz), MDVP:Jitter(%), MDVP:Jitter(Abs),
   *  MDVP:RAP, MDVP:PPQ, Jitter:DDP, MDVP:Shimmer, MDVP:Shimmer(dB),
   *  Shimmer:APQ3, Shimmer:APQ5, MDVP:APQ, Shimmer:DDA, NHR, HNR,
   *  RPDE, DFA, spread1, spread2, D2, PPE]
   */
  features: number[];
}

/** Success response from POST /api/voice/predict (e.g. prediction, probability, class). */
export interface VoicePredictResponse {
  prediction?: number | string;
  probability?: number;
  class?: string;
  [key: string]: unknown;
}

/** Error body when API returns 500 (e.g. ML service unavailable). */
export interface VoicePredictErrorBody {
  message?: string;
  detail?: string;
  [key: string]: unknown;
}

// ========== Analytics Layer (independent of ML/RAG) ==========

export interface RiskAdjustRequest {
  mlRiskPercent: number;
  gaitScore?: number;
  age?: number;
}

export interface RiskAdjustResponse {
  finalAdjustedRisk: number;
}

export interface TestRecordPoint {
  testDate: string; // ISO
  riskValue: number;
}

export interface ProgressionRequest {
  userId?: number;
  dataPoints?: TestRecordPoint[];
}

export interface ProgressionAnalysisDto {
  linearRegressionSlope: number;
  movingAverages: number[];
  trendClassification: 'Stable' | 'Increasing' | 'Rapid increase';
  smoothedPoints: TestRecordPoint[];
}

export interface StatisticsRequest {
  values: number[];
}

export interface StatisticsResponse {
  mean: number;
  variance: number;
  standardDeviation: number;
  zScores: number[];
  minMaxNormalized: number[];
}
