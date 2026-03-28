import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, map, timeout, catchError } from 'rxjs/operators';
import { TimeoutError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PagedResult,
  Publication,
  PerformanceMetric,
  Dataset,
  AnalysisRequest,
  AnalysisResult,
  CrossValidationResult,
  CollaborationRequest,
  HealthCheckResponse,
  MetricsDashboardDto,
  CrossValidationAggregatedDto,
  UserTestRecord,
  UserTestRecordRequest,
  AdminDashboardAnalytics,
  AccountRequest,
  UpdateUserStatusRequest,
  NotificationItem,
  User,
  DisclaimerResponse,
  ResultExplanationDto,
  TrendAnalysisDto,
  ComparisonDto,
  FeatureExplanationDto,
  RagTestRequest,
  RagTestResponse,
  RagAskResponse,
  VoicePredictRequest,
  VoicePredictResponse
} from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ========== PUBLICATIONS ==========

  getPublications(params: {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string;
    searchTerm?: string;
  } = {}): Observable<PagedResult<Publication>> {
    let httpParams = new HttpParams();

    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortOrder) {
      httpParams = httpParams.set('sortOrder', params.sortOrder);
    }
    if (params.searchTerm) {
      httpParams = httpParams.set('searchTerm', params.searchTerm);
    }

    return this.http.get<PagedResult<Publication>>(`${this.apiUrl}/publications`, { params: httpParams });
  }

  getAllPublications(): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.apiUrl}/publications/all`);
  }

  getPublication(id: number): Observable<Publication> {
    return this.http.get<Publication>(`${this.apiUrl}/publications/${id}`);
  }

  getFeaturedPublications(params: {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Observable<PagedResult<Publication>> {
    let httpParams = new HttpParams();

    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortOrder) {
      httpParams = httpParams.set('sortOrder', params.sortOrder);
    }

    return this.http.get<PagedResult<Publication>>(`${this.apiUrl}/publications/featured`, { params: httpParams });
  }

  searchPublications(query: string): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.apiUrl}/publications/search`, {
      params: { query }
    });
  }

  createPublication(data: Partial<Publication>): Observable<Publication> {
    return this.http.post<Publication>(`${this.apiUrl}/publications`, data);
  }

  updatePublication(id: number, data: Partial<Publication>): Observable<Publication> {
    return this.http.put<Publication>(`${this.apiUrl}/publications/${id}`, data);
  }

  deletePublication(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/publications/${id}`);
  }

  // ========== METRICS ==========

  getMetrics(params: {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Observable<PagedResult<PerformanceMetric>> {
    let httpParams = new HttpParams();

    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortOrder) {
      httpParams = httpParams.set('sortOrder', params.sortOrder);
    }

    return this.http.get<PagedResult<PerformanceMetric>>(`${this.apiUrl}/metrics`, { params: httpParams });
  }

  getMetric(id: number): Observable<PerformanceMetric> {
    return this.http.get<PerformanceMetric>(`${this.apiUrl}/metrics/${id}`);
  }

  getMetricsByDataset(datasetName: string, params: {
    pageNumber?: number;
    pageSize?: number;
  } = {}): Observable<PagedResult<PerformanceMetric>> {
    let httpParams = new HttpParams();

    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }

    return this.http.get<PagedResult<PerformanceMetric>>(
      `${this.apiUrl}/metrics/dataset/${encodeURIComponent(datasetName)}`,
      { params: httpParams }
    );
  }

  createMetric(data: Partial<PerformanceMetric>): Observable<PerformanceMetric> {
    return this.http.post<PerformanceMetric>(`${this.apiUrl}/metrics`, data);
  }

  getAllMetrics(): Observable<PerformanceMetric[]> {
    return this.http.get<PerformanceMetric[]>(`${this.apiUrl}/metrics/all`);
  }

  getMetricsDashboard(): Observable<PerformanceMetric[]> {
    return this.http.get<PerformanceMetric[]>(`${this.apiUrl}/metrics/dashboard`);
  }

  getMetricsDashboardAggregated(): Observable<MetricsDashboardDto> {
    return this.http.get<MetricsDashboardDto>(`${this.apiUrl}/metrics/dashboard/aggregated`);
  }

  // ========== DATASETS ==========

  getAllDatasets(): Observable<Dataset[]> {
    return this.http.get<Dataset[]>(`${this.apiUrl}/datasets/all`);
  }

  getDatasets(params: {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Observable<PagedResult<Dataset>> {
    let httpParams = new HttpParams();

    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortOrder) {
      httpParams = httpParams.set('sortOrder', params.sortOrder);
    }

    return this.http.get<PagedResult<Dataset>>(`${this.apiUrl}/datasets`, { params: httpParams });
  }

  getPublicDatasets(params: {
    pageNumber?: number;
    pageSize?: number;
  } = {}): Observable<PagedResult<Dataset>> {
    let httpParams = new HttpParams();

    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }

    return this.http.get<PagedResult<Dataset>>(`${this.apiUrl}/datasets/public`, { params: httpParams });
  }

  getDataset(id: number): Observable<Dataset> {
    return this.http.get<Dataset>(`${this.apiUrl}/datasets/${id}`);
  }

  createDataset(data: Partial<Dataset>): Observable<Dataset> {
    return this.http.post<Dataset>(`${this.apiUrl}/datasets`, data);
  }

  updateDataset(id: number, data: Partial<Dataset>): Observable<Dataset> {
    return this.http.put<Dataset>(`${this.apiUrl}/datasets/${id}`, data);
  }

  deleteDataset(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/datasets/${id}`);
  }

  // ========== ANALYSIS ==========

  submitAnalysis(data: AnalysisRequest): Observable<AnalysisResult> {
    return this.http.post<AnalysisResult>(`${this.apiUrl}/analysis/submit`, data);
  }

  // Process analysis - calls /api/analysis/process endpoint
  processAnalysis(data: {
    sessionId: string;
    hasVoiceData?: boolean;
    hasGaitData?: boolean;
    voiceFileId?: number;
    voiceDataJson?: string;
    gaitDataJson?: string;
    waveformDataJson?: string;
    skeletonDataJson?: string;
    /** When set, analysis is stored with FK to this test record (voice/gait flow). */
    testRecordId?: number;
  }): Observable<AnalysisResult> {
    // Direct call to /api/analysis/process as per backend API
    return this.http.post<AnalysisResult>(`${this.apiUrl}/analysis/process`, {
      sessionId: data.sessionId,
      hasVoiceData: data.hasVoiceData,
      hasGaitData: data.hasGaitData,
      voiceFileId: data.voiceFileId,
      voiceDataJson: data.voiceDataJson,
      gaitDataJson: data.gaitDataJson,
      waveformDataJson: data.waveformDataJson,
      skeletonDataJson: data.skeletonDataJson,
      testRecordId: data.testRecordId
    });
  }

  /** Attach analysis session row to a test record so Test Records shows correct modality and risk. */
  linkAnalysisToTestRecord(sessionId: string, testRecordId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/analysis/link-test-record`, { sessionId, testRecordId });
  }

  getAnalysisResult(id: number): Observable<AnalysisResult> {
    return this.http.get<AnalysisResult>(`${this.apiUrl}/analysis/results/${id}`);
  }

  getAnalysisBySessionId(sessionId: string): Observable<AnalysisResult> {
    return this.http.get<AnalysisResult>(`${this.apiUrl}/analysis/session/${encodeURIComponent(sessionId)}`);
  }

  /**
   * Clinical Decision Support (RAG): ask a question about screening results.
   * POST /api/rag/test with { question, riskPercent, mode }.
   * Returns 200 with either isRelevant: false + relevance_message, or full clinical response.
   */
  ragTest(request: RagTestRequest): Observable<RagTestResponse> {
    return this.http.post<RagTestResponse>(`${this.apiUrl}/rag/test`, {
      question: request.question,
      riskPercent: request.riskPercent,
      mode: request.mode ?? 'voice'
    });
  }

  /**
   * POST /api/rag/ask – Python RAG knowledge-base Q&A (FAISS + Ollama).
   * Use for general Parkinson questions when no screening result is available.
   * Allow up to 3 minutes (backend may take 1–2 min for embeddings + LLM).
   */
  ragAsk(question: string): Observable<RagAskResponse> {
    return this.http.post<RagAskResponse>(`${this.apiUrl}/rag/ask`, { question }).pipe(
      timeout(180000),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          throw { status: 408, error: { message: 'The request took too long. The knowledge-base service may be busy. Please try again.' } };
        }
        throw err;
      })
    );
  }

  /**
   * POST /api/voice/predict with 10 voice features.
   * Content-Type: application/json; Authorization Bearer token added by AuthInterceptor when present.
   * On 200 returns FastAPI JSON (e.g. prediction, probability, class). On 500 body may contain { message: "..." }.
   */
  voicePredict(request: VoicePredictRequest): Observable<VoicePredictResponse> {
    return this.http.post<VoicePredictResponse>(`${this.apiUrl}/voice/predict`, request);
  }

  // ========== CROSS-VALIDATION ==========

  getCrossValidationResults(params: {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Observable<PagedResult<CrossValidationResult>> {
    let httpParams = new HttpParams();

    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortOrder) {
      httpParams = httpParams.set('sortOrder', params.sortOrder);
    }

    return this.http.get<PagedResult<CrossValidationResult>>(`${this.apiUrl}/crossvalidation`, { params: httpParams });
  }

  getAllCrossValidationResults(): Observable<CrossValidationResult[]> {
    return this.http.get<CrossValidationResult[]>(`${this.apiUrl}/crossvalidation/all`);
  }

  getCrossValidationResult(id: number): Observable<CrossValidationResult> {
    return this.http.get<CrossValidationResult>(`${this.apiUrl}/crossvalidation/${id}`);
  }

  getCrossValidationByDataset(datasetName: string, params: {
    pageNumber?: number;
    pageSize?: number;
  } = {}): Observable<PagedResult<CrossValidationResult>> {
    let httpParams = new HttpParams();

    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }

    return this.http.get<PagedResult<CrossValidationResult>>(
      `${this.apiUrl}/crossvalidation/dataset/${encodeURIComponent(datasetName)}`,
      { params: httpParams }
    );
  }

  getCrossValidationByDatasetAggregated(datasetName: string): Observable<CrossValidationAggregatedDto> {
    return this.http.get<CrossValidationAggregatedDto>(
      `${this.apiUrl}/crossvalidation/dataset/${encodeURIComponent(datasetName)}/aggregated`
    );
  }

  createCrossValidationResult(data: Partial<CrossValidationResult>): Observable<CrossValidationResult> {
    return this.http.post<CrossValidationResult>(`${this.apiUrl}/crossvalidation`, data);
  }

  // ========== COLLABORATION ==========

  createCollaborationRequest(data: {
    institutionName: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    proposalDescription?: string;
    collaborationType?: string;
  }): Observable<CollaborationRequest> {
    return this.http.post<CollaborationRequest>(`${this.apiUrl}/collaboration`, data);
  }

  getCollaborationRequests(): Observable<CollaborationRequest[]> {
    return this.http.get<CollaborationRequest[]>(`${this.apiUrl}/collaboration`);
  }

  getCollaborationRequest(id: number): Observable<CollaborationRequest> {
    return this.http.get<CollaborationRequest>(`${this.apiUrl}/collaboration/${id}`);
  }

  updateCollaborationStatus(id: number, status: string, notes?: string): Observable<CollaborationRequest> {
    return this.http.put<CollaborationRequest>(`${this.apiUrl}/collaboration/${id}/status`, {
      status,
      responseNotes: notes
    });
  }

  // ========== HEALTH CHECKS ==========

  getHealthCheck(): Observable<HealthCheckResponse> {
    return this.http.get<HealthCheckResponse>(`${this.apiUrl}/health`);
  }

  getHealthReadiness(): Observable<HealthCheckResponse> {
    return this.http.get<HealthCheckResponse>(`${this.apiUrl}/health/ready`);
  }

  getHealthLiveness(): Observable<HealthCheckResponse> {
    return this.http.get<HealthCheckResponse>(`${this.apiUrl}/health/live`);
  }

  // ========== USER TEST RECORDS ==========

  getUserTestRecords(params: {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string;
    userId?: number;
    status?: string;
    testResult?: string;
    testType?: string;
  } = {}): Observable<PagedResult<UserTestRecord>> {
    let httpParams = new HttpParams();

    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortOrder) {
      httpParams = httpParams.set('sortOrder', params.sortOrder);
    }
    if (params.userId) {
      httpParams = httpParams.set('userId', params.userId.toString());
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.testResult) {
      httpParams = httpParams.set('testResult', params.testResult);
    }
    if (params.testType) {
      httpParams = httpParams.set('testType', params.testType);
    }

    return this.http.get<PagedResult<UserTestRecord>>(`${this.apiUrl}/testrecords`, { params: httpParams });
  }

  getAllUserTestRecords(): Observable<UserTestRecord[]> {
    return this.http.get<UserTestRecord[]>(`${this.apiUrl}/testrecords/all`);
  }

  getUserTestRecord(id: number): Observable<UserTestRecord> {
    return this.http.get<UserTestRecord>(`${this.apiUrl}/testrecords/${id}`);
  }

  createUserTestRecord(data: UserTestRecordRequest): Observable<UserTestRecord> {
    return this.http.post<UserTestRecord>(`${this.apiUrl}/testrecords`, data);
  }

  updateUserTestRecord(id: number, data: Partial<UserTestRecord>): Observable<UserTestRecord> {
    return this.http.put<UserTestRecord>(`${this.apiUrl}/testrecords/${id}`, data);
  }

  deleteUserTestRecord(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/testrecords/${id}`);
  }

  // ========== ADMIN DASHBOARD ==========

  getAdminDashboardAnalytics(params?: {
    days?: number;      // Last N days (e.g., 15, 30)
    months?: number;    // Last N months (e.g., 6, 12)
    years?: number;     // Last N years (e.g., 1, 2, 3)
  }): Observable<AdminDashboardAnalytics> {
    let httpParams = new HttpParams();
    
    if (params?.days) {
      httpParams = httpParams.set('days', params.days.toString());
    }
    if (params?.months) {
      httpParams = httpParams.set('months', params.months.toString());
    }
    if (params?.years) {
      httpParams = httpParams.set('years', params.years.toString());
    }
    
    return this.http.get<AdminDashboardAnalytics>(`${this.apiUrl}/admin/dashboard/analytics`, { params: httpParams });
  }

  // ========== ACCOUNT REQUESTS (ADMIN) ==========
  getAccountRequests(params: {
    status?: 'Pending' | 'Approved' | 'Rejected' | 'Inactive';
    pageNumber?: number;
    pageSize?: number;
    search?: string;
  } = {}): Observable<PagedResult<AccountRequest>> {
    let httpParams = new HttpParams();

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<any>(`${this.apiUrl}/admin/users/pending`, { params: httpParams }).pipe(
      map((res: any) => {
        // If backend returns plain array, wrap into PagedResult shape
        if (Array.isArray(res)) {
          const items = res as AccountRequest[];
          return {
            items,
            totalCount: items.length,
            pageNumber: params.pageNumber || 1,
            pageSize: params.pageSize || items.length || 10,
            totalPages: 1,
            hasPrevious: false,
            hasNext: false
          } as PagedResult<AccountRequest>;
        }
        return res as PagedResult<AccountRequest>;
      })
    );
  }

  updateAccountStatus(id: number, body: UpdateUserStatusRequest): Observable<AccountRequest> {
    return this.http.patch<AccountRequest>(`${this.apiUrl}/admin/users/${id}/status`, body);
  }

  getUserById(id: number): Observable<AccountRequest> {
    return this.http.get<AccountRequest>(`${this.apiUrl}/admin/users/${id}`);
  }

  // Get all users (admin only)
  getAllUsers(params?: {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Observable<PagedResult<User>> {
    let httpParams = new HttpParams();
    if (params?.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params?.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params?.role) {
      httpParams = httpParams.set('role', params.role);
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<PagedResult<User>>(`${this.apiUrl}/admin/users`, { params: httpParams }).pipe(
      map((res: any) => {
        // If backend returns plain array, wrap into PagedResult shape
        if (Array.isArray(res)) {
          const items = res as User[];
          return {
            items,
            totalCount: items.length,
            pageNumber: params?.pageNumber || 1,
            pageSize: params?.pageSize || items.length || 10,
            totalPages: 1,
            hasPrevious: false,
            hasNext: false
          } as PagedResult<User>;
        }
        return res as PagedResult<User>;
      })
    );
  }

  // ========== NOTIFICATIONS ==========
  getNotifications(status?: 'Unread' | 'Read'): Observable<NotificationItem[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<NotificationItem[]>(`${this.apiUrl}/notifications`, { params });
  }

  markNotificationRead(id: number): Observable<NotificationItem> {
    return this.http.patch<NotificationItem>(`${this.apiUrl}/notifications/${id}/read`, {});
  }

  // ========== NEW ENDPOINTS - SPRINT 1-5 ==========

  // ========== CLINICAL DISCLAIMER ==========

  /**
   * Get clinical disclaimer text
   * @returns Observable of DisclaimerResponse
   */
  getDisclaimer(): Observable<DisclaimerResponse> {
    return this.http.get<DisclaimerResponse>(`${this.apiUrl}/clinical/disclaimer`);
  }

  // ========== RESULT EXPLANATION ==========

  /**
   * Get detailed explanation for analysis results
   * @param sessionId - Analysis session ID
   * @returns Observable of ResultExplanationDto
   */
  getResultExplanation(sessionId: string): Observable<ResultExplanationDto> {
    return this.http.get<ResultExplanationDto>(
      `${this.apiUrl}/analysis/session/${encodeURIComponent(sessionId)}/explanation`
    );
  }

  // ========== REPORTS ==========

  /**
   * Download PDF report for a session
   * @param sessionId - Analysis session ID
   * @returns Observable of Blob (PDF file)
   */
  downloadPdfReport(sessionId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/reports/session/${encodeURIComponent(sessionId)}/pdf`,
      { responseType: 'blob' }
    );
  }

  /**
   * Download CSV report for a session
   * @param sessionId - Analysis session ID
   * @returns Observable of Blob (CSV file)
   */
  downloadCsvReport(sessionId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/reports/session/${encodeURIComponent(sessionId)}/csv`,
      { responseType: 'blob' }
    );
  }

  /** PDF when the run was saved as a UserTestRecord (e.g. finger-tapping). Requires auth. */
  downloadPdfReportByTestRecordId(testRecordId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/test-record/${testRecordId}/pdf`, {
      responseType: 'blob'
    });
  }

  downloadCsvReportByTestRecordId(testRecordId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/test-record/${testRecordId}/csv`, {
      responseType: 'blob'
    });
  }

  // ========== TREND ANALYSIS ==========

  /**
   * Get trend analysis for a user's test records
   * @param userId - User ID
   * @returns Observable of TrendAnalysisDto
   * @note Requires authentication. Users can only access their own data (unless Admin)
   */
  getUserTrends(userId: number): Observable<TrendAnalysisDto> {
    return this.http.get<TrendAnalysisDto>(
      `${this.apiUrl}/testrecords/user/${userId}/trends`
    );
  }

  // ========== COMPARISON ==========

  /**
   * Compare two test records
   * @param recordId1 - First test record ID
   * @param recordId2 - Second test record ID
   * @returns Observable of ComparisonDto
   * @note Requires authentication
   */
  compareTestRecords(recordId1: number, recordId2: number): Observable<ComparisonDto> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('recordId1', recordId1.toString());
    httpParams = httpParams.set('recordId2', recordId2.toString());

    return this.http.get<ComparisonDto>(
      `${this.apiUrl}/testrecords/compare`,
      { params: httpParams }
    );
  }

  // ========== FEATURE EXPLANATION ==========

  /**
   * Get feature explanations for an analysis session
   * @param sessionId - Analysis session ID
   * @returns Observable of FeatureExplanationDto
   */
  getFeatureExplanation(sessionId: string): Observable<FeatureExplanationDto> {
    return this.http.get<FeatureExplanationDto>(
      `${this.apiUrl}/features/session/${encodeURIComponent(sessionId)}/explanation`
    );
  }

}
