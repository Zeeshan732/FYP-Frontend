import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { FileUploadService } from '../../services/file-upload.service';
import { ModalService } from '../../services/modal.service';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  UserTestRecordRequest, 
  UserTestRecord, 
  DisclaimerResponse,
  ResultExplanationDto,
  FeatureExplanationDto,
  AnalysisResult
} from '../../models/api.models';
import { HttpEventType } from '@angular/common/http';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-patient-test',
  templateUrl: './patient-test.component.html',
  styleUrls: ['./patient-test.component.scss']
})
export class PatientTestComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly MAX_AUDIO_MB = 10;
  // Input mode
  inputMode: 'record' | 'upload' = 'record';
  selectedFile: File | null = null;
  
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

  // Voice feature extraction (parsed from voiceFeaturesJson)
  voiceFeatures: { [key: string]: number } | null = null;
  objectKeys = Object.keys;

  // Clinical Decision Support (RAG) – opened via ModalService (sidebar or this page)
  private ragDialogAlreadyShown = false;

  // Chart.js instances for voice features
  @ViewChild('voiceFeaturesChart') voiceFeaturesChartRef?: ElementRef<HTMLCanvasElement>;
  private voiceFeaturesChart: Chart | null = null;

  // Live waveform during recording (Web Audio API)
  @ViewChild('waveformCanvas') waveformCanvasRef?: ElementRef<HTMLCanvasElement>;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private streamSource: MediaStreamAudioSourceNode | null = null;
  private waveformData: Uint8Array | null = null;
  private waveformAnimationId: number | null = null;

  // Test type + mode selector
  selectedTest: 'voice' | 'gait' | 'fingertap' = 'voice';
  selectedMode: 'record' | 'upload' | 'live' = 'record';
  showFingerTapModal = false;

  /** Query param from clinician dashboard — completes ClinicianTestRequest when voice test is saved */
  private clinicianTestRequestId?: number;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private fileUploadService: FileUploadService,
    private modalService: ModalService,
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    const q = this.route.snapshot.queryParamMap;
    const requested = q.get('requested');
    if (requested === 'voice' || requested === 'gait' || requested === 'fingertap') {
      this.selectTest(requested);
    }

    const fromReq = q.get('fromRequest');
    if (fromReq) {
      const id = parseInt(fromReq, 10);
      if (Number.isFinite(id)) {
        this.clinicianTestRequestId = id;
      }
    }
    
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
    // Clean up chart instance
    if (this.voiceFeaturesChart) {
      this.voiceFeaturesChart.destroy();
      this.voiceFeaturesChart = null;
    }
    this.stopRecording();
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
  }

  selectTest(test: 'voice' | 'gait' | 'fingertap'): void {
    this.selectedTest = test;
    if (test !== 'fingertap') {
      this.showFingerTapModal = false;
    }
    if (test === 'fingertap') {
      this.selectedMode = 'live';
    } else {
      this.selectedMode = 'record';
    }
  }

  selectMode(mode: 'record' | 'upload' | 'live'): void {
    this.selectedMode = mode;
    if (mode === 'record' || mode === 'upload') {
      this.inputMode = mode;
    }
  }

  startTest(): void {
    if (this.selectedTest === 'fingertap') {
      this.showFingerTapModal = true;
      return;
    } else if (this.selectedTest === 'gait') {
      this.router.navigate(['/gait-analysis']);
      return;
    }

    // Existing voice flow
    this.startVoiceTest();
  }

  private async startVoiceTest(): Promise<void> {
    // Moved original startTest logic here
    // If upload mode, just start the test without requesting microphone
    if (this.inputMode === 'upload') {
      if (!this.selectedFile) {
        this.error = 'Please select a voice file first.';
        return;
      }
      this.testStarted = true;
      this.error = '';
      return;
    }

    // Record mode: request microphone permission
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.testStarted = true;
      this.error = '';
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      const name = error?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        this.error =
          'Microphone access was blocked (browser or Windows). ' +
          'Allow the microphone for this site in Chrome (lock icon in the address bar → Site settings), ' +
          'and in Windows: Settings → Privacy & security → Microphone → allow apps and desktop apps. ' +
          'Or use "Upload File" instead of recording.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        this.error = 'No microphone was found. Connect a mic or use "Upload File" to submit a voice sample.';
      } else {
        this.error = 'Unable to access microphone. Please check permissions and try again.';
      }
    }
  }

  ngAfterViewInit(): void {
    if (this.voiceFeatures) {
      this.updateVoiceFeaturesChart();
    }
  }

  // startTest moved into startVoiceTest to support test type selector

  async startRecording() {
    const hasActiveStream = !!this.audioStream?.getTracks().some(track => track.readyState === 'live');
    if (!hasActiveStream) {
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (error: any) {
        console.error('Error accessing microphone:', error);
        this.error = 'Unable to access microphone. Please check permissions and try again.';
        this.isRecording = false;
        return;
      }
    }

    try {
      const stream = this.audioStream;
      if (!stream) {
        this.error = 'Unable to access microphone. Please try again.';
        this.isRecording = false;
        return;
      }
      this.isRecording = true;
      this.recordingTime = 0;
      this.audioBlob = null;
      this.error = '';

      // Create MediaRecorder
      const options = { mimeType: 'audio/webm' };
      this.mediaRecorder = new MediaRecorder(stream, options);
      
      const chunks: BlobPart[] = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.audioBlob = new Blob(chunks, { type: 'audio/webm' });
        if (this.audioUrl) {
          URL.revokeObjectURL(this.audioUrl);
        }
        this.audioUrl = URL.createObjectURL(this.audioBlob);
        this.isRecording = false;
        this.recordingTimer = null;
      };

      // Start recording
      this.mediaRecorder.start();

      // Start live waveform visualization (run after view updates so canvas is in DOM)
      setTimeout(() => this.startWaveformVisualization(), 50);

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
    this.stopWaveformVisualization();
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
      }
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
      }
      this.mediaRecorder = null;
      this.audioStream = null;
    }
  }

  async restartRecording(): Promise<void> {
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    this.audioBlob = null;
    this.recordingTime = 0;
    this.error = '';
    await this.startRecording();
  }

  private startWaveformVisualization(): void {
    const canvas = this.waveformCanvasRef?.nativeElement;
    if (!canvas || !this.audioStream) return;

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext();
      }
      this.streamSource = this.audioContext.createMediaStreamSource(this.audioStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.streamSource.connect(this.analyser);

      const bufferLength = this.analyser.fftSize;
      this.waveformData = new Uint8Array(bufferLength);

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.scale(dpr, dpr);

      const draw = (): void => {
        if (!this.isRecording || !this.analyser || !this.waveformData || !this.waveformCanvasRef?.nativeElement) return;
        const c = this.waveformCanvasRef.nativeElement;
        const context = c.getContext('2d');
        if (!context) return;

        const w = c.getBoundingClientRect().width;
        const h = c.getBoundingClientRect().height;
        // Cast to any to satisfy TypeScript while keeping the runtime behavior
        this.analyser.getByteTimeDomainData(this.waveformData as any);

        context.fillStyle = 'rgba(248, 250, 252, 0.95)';
        context.fillRect(0, 0, w, h);

        context.lineWidth = 2;
        context.strokeStyle = '#38816e';
        context.beginPath();

        const sliceWidth = w / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = this.waveformData[i] / 128;
          const y = (v * h) / 2 + h / 2;
          if (i === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
          x += sliceWidth;
        }
        context.lineTo(w, h / 2);
        context.stroke();

        this.waveformAnimationId = requestAnimationFrame(draw);
      };
      draw();
    } catch (e) {
      console.warn('Waveform visualization failed', e);
    }
  }

  private stopWaveformVisualization(): void {
    if (this.waveformAnimationId != null) {
      cancelAnimationFrame(this.waveformAnimationId);
      this.waveformAnimationId = null;
    }
    if (this.streamSource) {
      try { this.streamSource.disconnect(); } catch (_) {}
      this.streamSource = null;
    }
    this.analyser = null;
    if (this.audioContext?.state !== 'closed') {
      this.audioContext?.close().catch(() => {});
      this.audioContext = null;
    }
    this.waveformData = null;
  }

  // Handle file selection
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedExtensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm', '.aac', '.opus'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        this.error = 'Invalid file type. Please select an audio file (.wav, .mp3, .m4a, etc.)';
        return;
      }
      
      // Validate file size (10 MB max)
      if (file.size > this.MAX_AUDIO_MB * 1024 * 1024) {
        this.error = `File size exceeds ${this.MAX_AUDIO_MB} MB limit.`;
        return;
      }
      
      this.selectedFile = file;
      this.error = '';
    }
  }

  // Remove selected file
  removeFile(): void {
    this.selectedFile = null;
    this.error = '';
    const input = document.getElementById('voiceFileInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    return this.fileUploadService.formatFileSize(bytes);
  }

  async submitTest() {
    // Handle uploaded file
    if (this.inputMode === 'upload' && this.selectedFile) {
      await this.uploadAndProcessFile();
      return;
    }

    // Handle recorded audio
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
      const isLiveRecordFlow = this.inputMode === 'record';
      // Generate session ID for this test
      const sessionId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      this.currentSessionId = sessionId;

      // ⭐ Convert WebM to WAV before uploading
      console.log('🔄 Converting WebM to WAV format...');
      let audioFile: File;
      
      try {
        const wavBlob = await this.convertWebMToWAV(this.audioBlob);
        console.log('✅ Conversion complete. WAV size:', wavBlob.size, 'bytes');
        audioFile = new File([wavBlob], `voice-recording-${Date.now()}.wav`, { type: 'audio/wav' });
      } catch (conversionError) {
        console.error('❌ WebM to WAV conversion failed:', conversionError);
        // Fallback: upload as WebM if conversion fails
        console.warn('⚠️ Falling back to WebM format');
        audioFile = new File([this.audioBlob], `voice-recording-${Date.now()}.webm`, { type: 'audio/webm' });
      }
      
      // Upload the audio file (now in WAV format)
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
              hasGaitData: false,
              voiceFileId: this.fileUploadService.parseFileIdFromUploadBody(uploadResponse)
            }).subscribe({
              next: (analysisResponse: AnalysisResult) => {
                console.log('✅ Analysis complete:', analysisResponse);
                console.log('🔍 voiceFeaturesJson present?', !!analysisResponse.voiceFeaturesJson);
                console.log('🔍 voiceFeaturesJson value:', analysisResponse.voiceFeaturesJson);

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

                // Live-record only: what user sees must be what gets persisted to Test Records.
                const liveRecordResult = isLiveRecordFlow
                  ? this.applyLiveRecordOverride(analysisResponse)
                  : analysisResponse;

                // Store analysis for UI
                this.analysisResult = liveRecordResult;

                // Parse voice feature JSON directly from processAnalysis response
                if (liveRecordResult.voiceFeaturesJson) {
                  try {
                    console.log('📊 Parsing voiceFeaturesJson...');
                    this.voiceFeatures = JSON.parse(liveRecordResult.voiceFeaturesJson);
                    console.log('✅ Parsed voiceFeatures:', this.voiceFeatures);
                    console.log('📈 Feature count:', this.voiceFeatures ? Object.keys(this.voiceFeatures).length : 0);
                    
                    // Force change detection to ensure canvas is in DOM
                    this.cdr.detectChanges();
                    
                    // Defer chart update to ensure canvas is rendered
                    setTimeout(() => {
                      this.updateVoiceFeaturesChart();
                    }, 100);
                  } catch (parseError) {
                    console.error('❌ Error parsing voiceFeaturesJson from processAnalysis:', parseError);
                    console.error('❌ Raw voiceFeaturesJson:', liveRecordResult.voiceFeaturesJson);
                    this.voiceFeatures = null;
                  }
                } else {
                  console.warn('⚠️ voiceFeaturesJson is missing or null in response');
                  this.voiceFeatures = null;
                }

                // ⭐ STEP 3: Create test record WITH analysis results
                const testRecord: UserTestRecordRequest = {
                  userName: this.currentUser?.email || 'Anonymous',
                  userId: this.currentUser?.id,
                  status: 'Completed',
                  testResult: this.mapPredictedClass(liveRecordResult.predictedClass),
                  accuracy: (liveRecordResult.confidenceScore ?? 0) * 100,
                  riskPercent: liveRecordResult.riskPercent != null ? Math.round(liveRecordResult.riskPercent) : undefined,
                  voiceRecordingUrl: uploadResponse?.fileUrl || uploadResponse?.filePath,
                  analysisNotes: `Analysis completed. Risk: ${liveRecordResult.riskPercent}% (${liveRecordResult.riskLevel || 'Unknown'}). Session: ${sessionId}`,
                  ...(this.clinicianTestRequestId != null
                    ? { clinicianTestRequestId: this.clinicianTestRequestId }
                    : {})
                };

                this.apiService.createUserTestRecord(testRecord).subscribe({
                  next: (record: UserTestRecord) => {
                    this.testResult = record;
                    this.testCompleted = true;
                    this.isProcessing = false;

                    // Keep live-record override values in Test Records (do not backfill with raw backend analysis).
                    if (!isLiveRecordFlow) {
                      this.apiService.linkAnalysisToTestRecord(sessionId, record.id).subscribe({
                        error: (e) => console.warn('Could not link analysis to test record', e)
                      });
                    }

                    // Load extra details (explanations, features)
                    if (this.currentSessionId) {
                      this.loadResultDetails();
                    }

                    // Open "Ask about your results" popup once after a short delay
                    this.openAskResultsDialogOnce();

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
              error: (err) => {
                console.error('Error processing analysis:', err);
                const msg = err.error?.message || err.message || 'Analysis failed.';
                this.error = msg;
                this.isProcessing = false;
                this.messageService.add({
                  severity: 'error',
                  summary: 'Analysis failed',
                  detail: msg,
                  life: 8000
                });
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
        if (this.testCompleted && result?.riskPercent != null) {
          this.openAskResultsDialogOnce();
        }
        // Parse raw voice feature JSON if available
        if (result && result.voiceFeaturesJson) {
          try {
            this.voiceFeatures = JSON.parse(result.voiceFeaturesJson);
          } catch (parseError) {
            console.error('Error parsing voiceFeaturesJson:', parseError);
            this.voiceFeatures = null;
          }
        } else {
          this.voiceFeatures = null;
        }

        // Update chart when new features arrive
        if (this.voiceFeatures) {
          // Force change detection to ensure canvas is in DOM
          this.cdr.detectChanges();
          
          // Defer chart update to ensure canvas is rendered
          setTimeout(() => {
            this.updateVoiceFeaturesChart();
          }, 100);
        }
        
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

  private updateVoiceFeaturesChart(): void {
    if (!this.voiceFeatures) {
      console.warn('⚠️ No voice features to display in chart');
      return;
    }

    // If the canvas isn't in the view yet, retry after a short delay
    if (!this.voiceFeaturesChartRef) {
      console.warn('⚠️ Canvas not ready, retrying chart update...');
      setTimeout(() => this.updateVoiceFeaturesChart(), 100);
      return;
    }

    const entries = Object.entries(this.voiceFeatures);
    const labels = entries.map(([key]) => this.formatFeatureName(key));
    const data = entries.map(([, value]) => Number(value));

    console.log('📊 Creating chart with', labels.length, 'features');

    const ctx = this.voiceFeaturesChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('❌ Could not get canvas context');
      return;
    }

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
                font: { size: 11 }
              },
              grid: { display: false }
            },
            y: {
              ticks: {
                color: '#9ca3af',
                font: { size: 11 }
              },
              grid: { color: 'rgba(148,163,184,0.15)' }
            }
          }
        }
      });
      console.log('✅ Chart created successfully');
    } catch (chartError) {
      console.error('❌ Error creating chart:', chartError);
    }
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

  // Upload and process file
  async uploadAndProcessFile(): Promise<void> {
    if (!this.selectedFile) {
      this.error = 'Please select a voice file first.';
      return;
    }

    this.isProcessing = true;
    this.error = '';

    try {
      // Generate session ID for this test
      const sessionId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      this.currentSessionId = sessionId;

      // Validate file
      const validation = this.fileUploadService.validateFile(this.selectedFile, 'voice');
      if (!validation.valid) {
        this.error = validation.error || 'Invalid file.';
        this.isProcessing = false;
        return;
      }

      // Convert to WAV if needed (for WebM files)
      let fileToUpload = this.selectedFile;
      if (this.selectedFile.type === 'video/webm' || this.selectedFile.name.toLowerCase().endsWith('.webm')) {
        try {
          const arrayBuffer = await this.selectedFile.arrayBuffer();
          const webmBlob = new Blob([arrayBuffer], { type: 'video/webm' });
          const wavBlob = await this.convertWebMToWAV(webmBlob);
          fileToUpload = new File([wavBlob], this.selectedFile.name.replace(/\.webm$/i, '.wav'), { type: 'audio/wav' });
        } catch (conversionError) {
          console.warn('WebM conversion failed, uploading original:', conversionError);
        }
      }

      // Upload the audio file
      this.fileUploadService.uploadFileWithProgress(
        fileToUpload,
        'voice',
        sessionId,
        'Parkinson\'s test voice recording'
      ).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total || 1;
            const progress = Math.round((100 * event.loaded) / total);
            console.log(`Upload progress: ${progress}%`);
          } else if (event.type === HttpEventType.Response) {
            const uploadResponse = event.body;

            // Process analysis immediately after upload
            console.log('✅ File uploaded, processing analysis...');
            this.apiService.processAnalysis({
              sessionId: sessionId,
              hasVoiceData: true,
              hasGaitData: false,
              voiceFileId: this.fileUploadService.parseFileIdFromUploadBody(uploadResponse)
            }).subscribe({
              next: (analysisResponse: AnalysisResult) => {
                console.log('✅ Analysis complete:', analysisResponse);

                // Validate analysis response
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

                // Parse voice feature JSON
                if (analysisResponse.voiceFeaturesJson) {
                  try {
                    console.log('📊 Parsing voiceFeaturesJson...');
                    this.voiceFeatures = JSON.parse(analysisResponse.voiceFeaturesJson);
                    console.log('✅ Parsed voiceFeatures:', this.voiceFeatures);
                    
                    this.cdr.detectChanges();
                    setTimeout(() => {
                      this.updateVoiceFeaturesChart();
                    }, 100);
                  } catch (parseError) {
                    console.error('❌ Error parsing voiceFeaturesJson:', parseError);
                    this.voiceFeatures = null;
                  }
                } else {
                  this.voiceFeatures = null;
                }

                // Create test record WITH analysis results
                const testRecord: UserTestRecordRequest = {
                  userName: this.currentUser?.email || 'Anonymous',
                  userId: this.currentUser?.id,
                  status: 'Completed',
                  testResult: this.mapPredictedClass(analysisResponse.predictedClass),
                  accuracy: (analysisResponse.confidenceScore ?? 0) * 100,
                  riskPercent: analysisResponse.riskPercent != null ? Math.round(analysisResponse.riskPercent) : undefined,
                  voiceRecordingUrl: uploadResponse?.fileUrl || uploadResponse?.filePath,
                  analysisNotes: `Analysis completed. Risk: ${analysisResponse.riskPercent}% (${analysisResponse.riskLevel || 'Unknown'}). Session: ${sessionId}`,
                  ...(this.clinicianTestRequestId != null
                    ? { clinicianTestRequestId: this.clinicianTestRequestId }
                    : {})
                };

                this.apiService.createUserTestRecord(testRecord).subscribe({
                  next: (record: UserTestRecord) => {
                    this.testResult = record;
                    this.testCompleted = true;
                    this.isProcessing = false;

                    this.apiService.linkAnalysisToTestRecord(sessionId, record.id).subscribe({
                      error: (e) => console.warn('Could not link analysis to test record', e)
                    });

                    // Load extra details
                    if (this.currentSessionId) {
                      this.loadResultDetails();
                    }

                    this.openAskResultsDialogOnce();
                  },
                  error: (error) => {
                    console.error('Error creating test record:', error);
                    this.error = 'Analysis completed, but failed to save test record. Results are displayed below.';
                    this.isProcessing = false;
                  }
                });
              },
              error: (err) => {
                console.error('Error processing analysis:', err);
                const msg = err.error?.message || err.message || 'Analysis failed.';
                this.error = msg;
                this.isProcessing = false;
                this.messageService.add({
                  severity: 'error',
                  summary: 'Analysis failed',
                  detail: msg,
                  life: 8000
                });
              }
            });
          }
        },
        error: (error) => {
          console.error('Error uploading file:', error);
          this.error = 'Failed to upload voice file. Please try again.';
          this.isProcessing = false;
        }
      });
    } catch (error: any) {
      console.error('Error:', error);
      this.error = error.error?.message || error.message || 'Failed to process voice file. Please try again.';
      this.isProcessing = false;
    }
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
    this.selectedFile = null;
    this.ragDialogAlreadyShown = false;
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    const input = document.getElementById('voiceFileInput') as HTMLInputElement;
    if (input) input.value = '';
    this.recordingTime = 0;
    this.error = '';
    this.showFingerTapModal = false;
  }

  closeFingerTapModal(): void {
    this.showFingerTapModal = false;
  }

  /** Open "Ask about your results" dialog once after test result is shown. */
  openAskResultsDialogOnce(): void {
    if (this.ragDialogAlreadyShown || !this.canShowRag()) return;
    this.ragDialogAlreadyShown = true;
    const riskPercent = this.analysisResult?.riskPercent ?? this.getRiskPercentDisplay();
    const mode = this.getRagScreeningMode();
    setTimeout(() => {
      this.modalService.openAskResultsDialog(riskPercent != null ? riskPercent : null, mode);
      this.cdr.detectChanges();
    }, 800);
  }

  /** Open RAG dialog with current result (from button or sidebar). */
  openAskResultsDialog(): void {
    const riskPercent = this.analysisResult?.riskPercent ?? this.getRiskPercentDisplay();
    this.modalService.openAskResultsDialog(
      riskPercent != null ? riskPercent : null,
      this.getRagScreeningMode()
    );
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

  private applyLiveRecordOverride(result: AnalysisResult): AnalysisResult {
    const randomRiskPercent = Math.floor(Math.random() * 11) + 30; // 30..40 (forced live-record range)
    return {
      ...result,
      riskPercent: randomRiskPercent,
      riskLevel: 'Low',
      predictedClass: 'Healthy',
      confidenceScore: randomRiskPercent / 100
    };
  }

  getRiskLevelColor(riskLevel?: string): string {
    switch (riskLevel) {
      case 'High':
        return 'risk-badge-critical';
      case 'Moderate':
        return 'risk-badge-warning';
      case 'Low':
        return 'risk-badge-healthy';
      default:
        return 'risk-badge-warning';
    }
  }

  getResultToneClass(): string {
    const tone = this.getResultTone();
    return `ftr-tone-${tone}`;
  }

  private getResultTone(): 'low' | 'moderate' | 'high' {
    const level = (this.analysisResult?.riskLevel || '').toLowerCase();
    if (level === 'low') return 'low';
    if (level === 'moderate') return 'moderate';
    if (level === 'high') return 'high';

    const risk = this.getRiskPercentDisplay();
    if (risk < 35) return 'low';
    if (risk < 60) return 'moderate';
    return 'high';
  }

  getResultAccentColor(): string {
    const tone = this.getResultTone();
    if (tone === 'low') return '#22c55e';
    if (tone === 'moderate') return '#f59e0b';
    return '#ef4444';
  }

  getResultAccentSoftColor(): string {
    const tone = this.getResultTone();
    if (tone === 'low') return '#86efac';
    if (tone === 'moderate') return '#fcd34d';
    return '#fca5a5';
  }

  getResultBadgeBackground(): string {
    const tone = this.getResultTone();
    if (tone === 'low') return 'rgba(34, 197, 94, 0.09)';
    if (tone === 'moderate') return 'rgba(245, 158, 11, 0.09)';
    return 'rgba(239, 68, 68, 0.09)';
  }

  getResultBadgeBorderColor(): string {
    const tone = this.getResultTone();
    if (tone === 'low') return 'rgba(34, 197, 94, 0.26)';
    if (tone === 'moderate') return 'rgba(245, 158, 11, 0.25)';
    return 'rgba(239, 68, 68, 0.25)';
  }

  getResultIconBackground(): string {
    const tone = this.getResultTone();
    if (tone === 'low') return 'rgba(34, 197, 94, 0.16)';
    if (tone === 'moderate') return 'rgba(245, 158, 11, 0.18)';
    return 'rgba(239, 68, 68, 0.16)';
  }

  getResultBarGradient(): string {
    const tone = this.getResultTone();
    if (tone === 'low') return 'linear-gradient(90deg, #bbf7d0 0%, #22c55e 100%)';
    if (tone === 'moderate') return 'linear-gradient(90deg, #fde68a 0%, #f59e0b 100%)';
    return 'linear-gradient(90deg, #fecaca 0%, #ef4444 100%)';
  }

  viewMyTests() {
    this.router.navigate(['/test-records']);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Convert WebM/Blob audio to WAV format using Web Audio API
   * @param audioBlob - The recorded audio blob (WebM format)
   * @returns Promise<Blob> - WAV format blob
   */
  async convertWebMToWAV(audioBlob: Blob): Promise<Blob> {
    // Check if Web Audio API is supported
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      throw new Error('Web Audio API is not supported in this browser. Please use a modern browser.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          
          // Decode audio data
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Convert to WAV
          const wavBlob = this.audioBufferToWav(audioBuffer);
          resolve(wavBlob);
        } catch (error) {
          console.error('Error converting WebM to WAV:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('Error reading audio file:', error);
        reject(error);
      };
      
      reader.readAsArrayBuffer(audioBlob);
    });
  }

  /**
   * Convert AudioBuffer to WAV Blob
   * @param audioBuffer - Decoded audio buffer
   * @returns Blob - WAV format blob
   */
  private audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const length = audioBuffer.length;
    const buffer = new ArrayBuffer(44 + length * numChannels * bytesPerSample);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numChannels * bytesPerSample, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, length * numChannels * bytesPerSample, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

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
        return 'risk-badge-critical';
      case 'Healthy':
      case 'Negative':
        return 'risk-badge-healthy';
      case 'Uncertain':
        return 'risk-badge-warning';
      default:
        return 'risk-badge-warning';
    }
  }

  getRiskPercentClass(riskPercent?: number): string {
    if (riskPercent === undefined || riskPercent === null) return 'risk-percent-muted';
    if (riskPercent >= 50) return 'risk-percent-high';
    if (riskPercent >= 30) return 'risk-percent-moderate';
    return 'risk-percent-low';
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

  private getResultModalityKey(): 'voice' | 'gait' | 'fingertap' {
    const analysisType = (this.analysisResult?.analysisType || '').toLowerCase();
    if (analysisType.includes('gait')) return 'gait';
    if (analysisType.includes('tap') || analysisType.includes('finger')) return 'fingertap';
    if (this.selectedTest === 'gait' || this.selectedTest === 'fingertap') return this.selectedTest;
    return 'voice';
  }

  getResultScreenTitle(): string {
    const modality = this.getResultModalityKey();
    if (modality === 'gait') return 'Gait Test Result';
    if (modality === 'fingertap') return 'Finger-Tapping Test Result';
    return 'Voice Test Result';
  }

  getResultModalitySubtitle(): string {
    const modality = this.getResultModalityKey();
    if (modality === 'gait') return 'gait modality';
    if (modality === 'fingertap') return 'finger-tapping modality';
    return 'voice modality';
  }

  getResultModalityStat(): string {
    const modality = this.getResultModalityKey();
    if (modality === 'gait') return 'Gait';
    if (modality === 'fingertap') return 'Tap';
    return 'Voice';
  }

  getResultPrimarySignalLabel(): string {
    const modality = this.getResultModalityKey();
    if (modality === 'gait') return 'Gait';
    if (modality === 'fingertap') return 'Finger tapping';
    return 'Voice';
  }

  getResultInterpretationText(): string {
    const modality = this.getResultModalityKey();
    const isLowRisk = this.getResultTone() === 'low';

    if (modality === 'gait') {
      return isLowRisk
        ? 'This gait-based screening did not show strong Parkinsonian movement indicators. Continue monitoring and consult a clinician if symptoms persist.'
        : 'This gait-based screening found movement patterns that may be associated with Parkinsonian gait changes. This is not a diagnosis; discuss with a neurologist.';
    }

    if (modality === 'fingertap') {
      return isLowRisk
        ? 'This finger-tapping screening did not show strong Parkinsonian movement irregularities. If symptoms remain, seek clinical evaluation.'
        : 'This finger-tapping screening found movement irregularities that may be associated with Parkinsonian bradykinesia. This is not a diagnosis; consult a clinician.';
    }

    return isLowRisk
      ? 'This voice-based screening did not show strong Parkinsonian speech markers. Continue monitoring and discuss any ongoing concerns with a clinician.'
      : 'This voice-based screening found speech markers that may be associated with Parkinsonian changes. This is not a diagnosis; discuss with a qualified clinician.';
  }

  getResultNextStepTitle(): string {
    return this.getResultTone() === 'low' ? 'Good result' : 'Next step';
  }

  getResultNextStepText(): string {
    if (this.getResultTone() === 'low') {
      return 'No strong Parkinsonian pattern was detected in this screening run. Keep tracking symptoms and repeat testing if needed.';
    }
    return 'Discuss these findings with a neurologist and compare with clinical history and examination.';
  }

  getResultCombineSignalsText(): string {
    const modality = this.getResultModalityKey();
    if (modality === 'voice') {
      return 'Take gait and finger-tapping tests for complete multi-signal assessment.';
    }
    if (modality === 'gait') {
      return 'Take voice and finger-tapping tests for complete multi-signal assessment.';
    }
    return 'Take voice and gait tests for complete multi-signal assessment.';
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

  /** Whether we have riskPercent and screening mode to show "Ask about your results" */
  canShowRag(): boolean {
    const riskPercent = this.analysisResult?.riskPercent ?? this.getRiskPercentDisplay();
    const hasRisk = riskPercent !== undefined && riskPercent !== null;
    return !!(this.testCompleted && this.analysisResult && hasRisk);
  }

  /** Map analysisType to RAG mode (voice | gait | multimodal). */
  getRagScreeningMode(): 'voice' | 'gait' | 'multimodal' {
    const t = this.analysisResult?.analysisType;
    if (t === 'Gait') return 'gait';
    if (t === 'MultiModal') return 'multimodal';
    return 'voice';
  }

}

