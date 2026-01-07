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

// Performance Metric
export interface PerformanceMetric {
  id: number;
  metricName?: string;
  dataset: string;
  model?: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  specificity?: number;
  sensitivity?: number;
  domainAdaptationDrop?: number;
  validationMethod?: string;
  notes?: string;
  modelVersion?: string;
  foldNumber?: number;
  createdAt: string;
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

// Collaboration Request
export interface CollaborationRequest {
  id: number;
  institutionName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  proposalDescription?: string;
  collaborationType?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'UnderReview';
  responseNotes?: string;
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
  message?: string; // Optional message from backend
}

// File Upload Response
export interface FileUploadResponse {
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

// Metrics Dashboard Aggregated DTO
export interface MetricsDashboardDto {
  totalMetrics: number;
  averageAccuracy: number;
  averagePrecision: number;
  averageRecall: number;
  averageF1Score: number;
  bestAccuracy: number;
  worstAccuracy: number;
  metricsByDataset: MetricsByDataset[];
  recentMetrics: PerformanceMetric[];
  trends: MetricsTrends;
}

export interface MetricsByDataset {
  dataset: string;
  count: number;
  averageAccuracy: number;
  bestAccuracy: number;
}

export interface MetricsTrends {
  accuracyOverTime: TrendDataPoint[];
  improvement: number;
  trendDirection: 'improving' | 'declining' | 'stable';
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label: string;
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
  status: 'Completed' | 'Pending' | 'Failed';
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
  status?: 'Completed' | 'Pending' | 'Failed';
  voiceRecordingUrl?: string;
  analysisNotes?: string;
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
}

// Trend Analysis
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
  accuracy: number; // 0-100
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

