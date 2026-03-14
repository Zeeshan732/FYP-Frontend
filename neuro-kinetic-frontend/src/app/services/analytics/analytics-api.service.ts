import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RiskAdjustRequest,
  RiskAdjustResponse,
  ProgressionRequest,
  ProgressionAnalysisDto,
  StatisticsRequest,
  StatisticsResponse
} from '../../models/api.models';

/**
 * Calls only /api/analytics/* endpoints. Does NOT call ML or RAG endpoints.
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsApiService {
  private apiUrl = environment.apiUrl;
  private base = `${this.apiUrl}/analytics`;

  constructor(private http: HttpClient) {}

  riskAdjust(request: RiskAdjustRequest): Observable<RiskAdjustResponse> {
    return this.http.post<RiskAdjustResponse>(`${this.base}/risk-adjust`, request);
  }

  progression(request: ProgressionRequest): Observable<ProgressionAnalysisDto> {
    return this.http.post<ProgressionAnalysisDto>(`${this.base}/progression`, request);
  }

  statistics(request: StatisticsRequest): Observable<StatisticsResponse> {
    return this.http.post<StatisticsResponse>(`${this.base}/statistics`, request);
  }
}
