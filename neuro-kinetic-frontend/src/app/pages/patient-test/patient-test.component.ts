import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { FileUploadService } from '../../services/file-upload.service';
import { Router } from '@angular/router';
import { 
  UserTestRecordRequest, 
  UserTestRecord, 
  DisclaimerResponse,
  ResultExplanationDto,
  FeatureExplanationDto,
  AnalysisResult
} from '../../models/api.models';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-patient-test',
  templateUrl: './patient-test.component.html',
  styleUrls: ['./patient-test.component.scss']
})
export class PatientTestComponent implements OnInit, OnDestroy {
  private readonly MAX_AUDIO_MB = 10;
  // Recording state
  isRecording = false;
  isProcessing = false;
  recordingTime = 0;
  recordingTimer: any;
  audioBlob: Blob | null = null;
  audioUrl: string | null = null;
  
  // Media stream
  mediaRecorder: MediaRecorder | null = null;
  audioStream: MediaStream | null = null;
  
  // Test state
  testStarted = false;
  testCompleted = false;
  testResult: UserTestRecord | null = null;
  analysisResult: AnalysisResult | null = null;
  error = '';
  
  // User info
  currentUser: any = null;

  // New features
  disclaimer: DisclaimerResponse | null = null;
  resultExplanation: ResultExplanationDto | null = null;
  featureExplanation: FeatureExplanationDto | null = null;
  loadingExplanation = false;
  loadingFeatures = false;
  currentSessionId: string | null = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private fileUploadService: FileUploadService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    
    // Load disclaimer on component init
    this.loadDisclaimer();
  }

  loadDisclaimer() {
    this.apiService.getDisclaimer().subscribe({
      next: (disclaimer) => {
        this.disclaimer = disclaimer;
      },
      error: (error) => {
        console.error('Error loading disclaimer:', error);
        // Don't show error to user, just log it
      }
    });
  }

  ngOnDestroy() {
    this.stopRecording();
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
  }

  async startTest() {
    try {
      // Request microphone permission
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.testStarted = true;
      this.error = '';
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      this.error = 'Unable to access microphone. Please check permissions and try again.';
    }
  }

  async startRecording() {
    if (!this.audioStream) {
      await this.startTest();
      return;
    }

    try {
      this.isRecording = true;
      this.recordingTime = 0;
      this.audioBlob = null;
      this.error = '';

      // Create MediaRecorder
      const options = { mimeType: 'audio/webm' };
      this.mediaRecorder = new MediaRecorder(this.audioStream, options);
      
      const chunks: BlobPart[] = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.audioBlob = new Blob(chunks, { type: 'audio/webm' });
        this.audioUrl = URL.createObjectURL(this.audioBlob);
        this.isRecording = false;
        this.recordingTimer = null;
      };

      // Start recording
      this.mediaRecorder.start();
      
      // Start timer
      this.recordingTimer = setInterval(() => {
        this.recordingTime++;
      }, 1000);

    } catch (error: any) {
      console.error('Error starting recording:', error);
      this.error = 'Failed to start recording. Please try again.';
      this.isRecording = false;
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
      }
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
      }
    }
  }

  async submitTest() {
    if (!this.audioBlob) {
      this.error = 'Please record a voice sample first.';
      return;
    }

    // Frontend guardrail for file size before hitting backend
    if (this.audioBlob.size > this.MAX_AUDIO_MB * 1024 * 1024) {
      this.error = `Voice recording is too large. Please keep it under ${this.MAX_AUDIO_MB} MB.`;
      return;
    }

    this.isProcessing = true;
    this.error = '';
    this.testCompleted = false;

    try {
      // Generate session ID for this test
      const sessionId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      this.currentSessionId = sessionId;

      // First, upload the audio file
      const audioFile = new File([this.audioBlob], `voice-recording-${Date.now()}.webm`, { type: 'audio/webm' });
      
      this.fileUploadService.uploadFileWithProgress(
        audioFile,
        'voice',
        sessionId,
        'Parkinson\'s test voice recording'
      ).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total || 1;
            const progress = Math.round((100 * event.loaded) / total);
            // You can show upload progress here if needed
            console.log(`Upload progress: ${progress}%`);
          } else if (event.type === HttpEventType.Response) {
            const uploadResponse = event.body;

            // ⭐ STEP 1: Process analysis immediately after upload
            console.log('✅ File uploaded, processing analysis...');
            this.apiService.processAnalysis({
              sessionId: sessionId, // MUST match upload sessionId
              hasVoiceData: true,
              hasGaitData: false
            }).subscribe({
              next: (analysisResponse: AnalysisResult) => {
                console.log('✅ Analysis complete:', analysisResponse);

                // Step 2: Validate analysis response
                if (!analysisResponse) {
                  this.error = 'Analysis completed but no results were returned.';
                  this.isProcessing = false;
                  return;
                }

                if (analysisResponse.riskPercent == null && analysisResponse.riskPercent !== 0) {
                  console.error('❌ Analysis failed - riskPercent is null');
                  this.error = 'Analysis processing failed. Please try again.';
                  this.isProcessing = false;
                  return;
                }

                // Store analysis for UI
                this.analysisResult = analysisResponse;

                // ⭐ STEP 3: Create test record WITH analysis results
                const testRecord: UserTestRecordRequest = {
                  userName: this.currentUser?.email || 'Anonymous',
                  userId: this.currentUser?.id,
                  status: 'Completed',
                  testResult: this.mapPredictedClass(analysisResponse.predictedClass),
                  accuracy: (analysisResponse.confidenceScore || 0) * 100,
                  voiceRecordingUrl: uploadResponse?.fileUrl || uploadResponse?.filePath,
                  analysisNotes: `Analysis completed. Risk: ${analysisResponse.riskPercent}% (${analysisResponse.riskLevel || 'Unknown'})`
                };

                this.apiService.createUserTestRecord(testRecord).subscribe({
                  next: (record: UserTestRecord) => {
                    this.testResult = record;
                    this.testCompleted = true;
                    this.isProcessing = false;

                    // Load extra details (explanations, features)
                    if (this.currentSessionId) {
                      this.loadResultDetails();
                    }

                    // Stop audio stream
                    if (this.audioStream) {
                      this.audioStream.getTracks().forEach(track => track.stop());
                    }
                  },
                  error: (error) => {
                    console.error('Error creating test record:', error);
                    this.error = 'Analysis completed, but failed to save test record. Results are displayed below.';
                    this.isProcessing = false;
                  }
                });
              },
              error: (error) => {
                console.error('Error processing analysis:', error);
                this.error = 'Failed to process analysis. Please try again.';
                this.isProcessing = false;
              }
            });
          }
        },
        error: (error) => {
          console.error('Error uploading file:', error);
          this.error = 'Failed to upload voice recording. Please try again.';
          this.isProcessing = false;
        }
      });

    } catch (error: any) {
      console.error('Error submitting test:', error);
      this.error = 'Failed to submit test. Please try again.';
      this.isProcessing = false;
    }
  }

  private processTestResult(record: UserTestRecord) {
    // When ML model integration is ready, this method can poll or use websockets.
    this.apiService.getUserTestRecord(record.id).subscribe({
      next: (updatedRecord) => {
        this.testResult = updatedRecord;
        this.testCompleted = true;
        this.isProcessing = false;

        if (updatedRecord.status !== 'Completed') {
          // Backend is still processing asynchronously – show a friendly message.
          this.error = 'Test submitted. Results will be available once processing completes.';
          
          // Poll again after 3 seconds if still pending
          if (updatedRecord.status === 'Pending') {
            setTimeout(() => {
              this.processTestResult(updatedRecord);
            }, 3000);
          }
        } else {
          // Status is Completed - try to get analysis result
          if (this.currentSessionId) {
            this.loadAnalysisResult(this.currentSessionId);
            this.loadResultDetails();
          }
        }

        // Stop audio stream
        if (this.audioStream) {
          this.audioStream.getTracks().forEach(track => track.stop());
        }
      },
      error: (error) => {
        console.error('Error checking test record:', error);
        // Show the record we have and stop the loader so the UI is not stuck.
        this.testResult = record;
        this.testCompleted = true;
        this.isProcessing = false;
        this.error = 'Test submitted. Results will be available once processing completes.';

        if (this.audioStream) {
          this.audioStream.getTracks().forEach(track => track.stop());
        }
      }
    });
  }

  private loadAnalysisResult(sessionId: string) {
    this.apiService.getAnalysisBySessionId(sessionId).subscribe({
      next: (result) => {
        this.analysisResult = result;
        
        // If we have analysis result, update test result display
        if (result && result.predictedClass) {
          // Analysis completed - results are available
          console.log('Analysis completed:', {
            predictedClass: result.predictedClass,
            riskPercent: result.riskPercent,
            riskLevel: result.riskLevel,
            confidenceScore: result.confidenceScore,
            isSimulation: result.isSimulation
          });
        }
      },
      error: (error) => {
        console.error('Error loading analysis result:', error);
        // Don't show error, analysis result is optional
      }
    });
  }

  private loadResultDetails() {
    // If we have a session ID, load explanation and features
    if (this.currentSessionId) {
      this.loadResultExplanation(this.currentSessionId);
      this.loadFeatureExplanation(this.currentSessionId);
    }
  }

  loadResultExplanation(sessionId: string) {
    this.loadingExplanation = true;
    this.apiService.getResultExplanation(sessionId).subscribe({
      next: (explanation) => {
        this.resultExplanation = explanation;
        this.loadingExplanation = false;
      },
      error: (error) => {
        console.error('Error loading result explanation:', error);
        this.loadingExplanation = false;
        // Don't show error to user, explanation is optional
      }
    });
  }

  loadFeatureExplanation(sessionId: string) {
    this.loadingFeatures = true;
    this.apiService.getFeatureExplanation(sessionId).subscribe({
      next: (explanation) => {
        this.featureExplanation = explanation;
        this.loadingFeatures = false;
      },
      error: (error) => {
        console.error('Error loading feature explanation:', error);
        this.loadingFeatures = false;
        // Don't show error to user, features are optional
      }
    });
  }

  downloadPdfReport() {
    if (!this.currentSessionId) {
      this.error = 'Session ID not available for report download.';
      return;
    }

    this.apiService.downloadPdfReport(this.currentSessionId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `NeuroSync_Report_${this.currentSessionId}_${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
        this.error = 'Failed to download PDF report. Please try again.';
      }
    });
  }

  downloadCsvReport() {
    if (!this.currentSessionId) {
      this.error = 'Session ID not available for report download.';
      return;
    }

    this.apiService.downloadCsvReport(this.currentSessionId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `NeuroSync_Report_${this.currentSessionId}_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading CSV:', error);
        this.error = 'Failed to download CSV report. Please try again.';
      }
    });
  }

  startNewTest() {
    this.testStarted = false;
    this.testCompleted = false;
    this.testResult = null;
    this.analysisResult = null;
    this.resultExplanation = null;
    this.featureExplanation = null;
    this.currentSessionId = null;
    this.audioBlob = null;
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    this.recordingTime = 0;
    this.error = '';
  }

  // Helper: Map backend predicted class to frontend format
  private mapPredictedClass(predictedClass?: string): 'Positive' | 'Negative' | 'Uncertain' {
    const mapping: { [key: string]: 'Positive' | 'Negative' | 'Uncertain' } = {
      'ParkinsonPositive': 'Positive',
      'Healthy': 'Negative',
      'Uncertain': 'Uncertain',
      'Positive': 'Positive',
      'Negative': 'Negative'
    };
    return mapping[predictedClass || ''] || 'Uncertain';
  }

  getRiskLevelColor(riskLevel?: string): string {
    switch (riskLevel) {
      case 'High':
        return 'bg-red-500/20 border-red-500 text-red-400';
      case 'Moderate':
        return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 'Low':
        return 'bg-green-500/20 border-green-500 text-green-400';
      default:
        return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  }

  viewMyTests() {
    this.router.navigate(['/test-records']);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getResultColor(result: string): string {
    switch (result) {
      case 'Positive':
        return 'text-red-400';
      case 'Negative':
        return 'text-green-400';
      case 'Uncertain':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  }

  getResultBadgeColor(result: string): string {
    switch (result) {
      case 'Positive':
        return 'bg-red-500/20 border-red-500 text-red-400';
      case 'Negative':
        return 'bg-green-500/20 border-green-500 text-green-400';
      case 'Uncertain':
        return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      default:
        return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  }

  // Helper methods for ML integration
  getPredictionText(predictedClass?: string): string {
    switch(predictedClass) {
      case 'ParkinsonPositive':
        return 'Parkinson\'s Detected';
      case 'Healthy':
        return 'Healthy';
      case 'Uncertain':
        return 'Uncertain';
      case 'Positive':
        return 'Positive';
      case 'Negative':
        return 'Negative';
      default:
        return 'Pending';
    }
  }

  getPredictionBadgeColor(predictedClass?: string): string {
    switch(predictedClass) {
      case 'ParkinsonPositive':
      case 'Positive':
        return 'bg-red-500/20 border-red-500 text-red-400';
      case 'Healthy':
      case 'Negative':
        return 'bg-green-500/20 border-green-500 text-green-400';
      case 'Uncertain':
        return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      default:
        return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  }

  getRiskPercentClass(riskPercent?: number): string {
    if (riskPercent === undefined || riskPercent === null) return 'text-gray-400';
    if (riskPercent >= 50) return 'text-red-400';
    if (riskPercent >= 30) return 'text-yellow-400';
    return 'text-green-400';
  }

  getRiskPercentDisplay(): number {
    // Priority: riskPercent > confidenceScore > testResult.accuracy
    if (this.analysisResult?.riskPercent !== undefined && this.analysisResult.riskPercent !== null) {
      return this.analysisResult.riskPercent;
    }
    if (this.analysisResult?.confidenceScore !== undefined) {
      return this.analysisResult.confidenceScore * 100;
    }
    return this.testResult?.accuracy || 0;
  }

  getDisplayPrediction(): string {
    // Use predictedClass from analysis if available, otherwise use testResult
    if (this.analysisResult?.predictedClass) {
      return this.getPredictionText(this.analysisResult.predictedClass);
    }
    return this.testResult?.testResult || 'Pending';
  }

  getPredictionBadgeColorValue(): string {
    // Helper method to safely get prediction badge color
    const predictedClass = this.analysisResult?.predictedClass || this.testResult?.testResult;
    return this.getPredictionBadgeColor(predictedClass);
  }

  getRiskPercentClassValue(): string {
    // Helper method to safely get risk percent class
    const riskPercent = this.analysisResult?.riskPercent;
    const confidenceScore = this.analysisResult?.confidenceScore;
    const value = riskPercent !== undefined && riskPercent !== null 
      ? riskPercent 
      : (confidenceScore !== undefined ? confidenceScore * 100 : undefined);
    return this.getRiskPercentClass(value);
  }

  getConfidenceScoreDisplay(): number {
    // Helper method to safely get confidence score for display
    if (this.analysisResult?.confidenceScore !== undefined) {
      return this.analysisResult.confidenceScore * 100;
    }
    return 0;
  }
}

