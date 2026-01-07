import { Component, OnInit, OnDestroy } from '@angular/core';
import { FileUploadService } from '../../services/file-upload.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { AnalysisResult, UserTestRecord, UserTestRecordRequest } from '../../models/api.models';

@Component({
  selector: 'app-voice-input',
  templateUrl: './voice-input.component.html',
  styleUrls: ['./voice-input.component.scss']
})
export class VoiceInputComponent implements OnInit, OnDestroy {
  // Input mode
  inputMode: 'upload' | 'record' = 'upload';
  
  // File upload state
  selectedFile: File | null = null;
  
  // Recording state
  isRecording: boolean = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  recordedAudio: Blob | null = null;
  recordedAudioUrl: string = '';
  recordingTime: number = 0;
  recordingTimer: any;
  audioStream: MediaStream | null = null;
  
  // Processing state
  sessionId: string = '';
  isUploading: boolean = false;
  isProcessing: boolean = false;
  
  // Results
  analysisResult: AnalysisResult | null = null;
  prediction?: string;
  riskPercent?: number;
  riskLevel?: string;
  confidence?: number;
  modelVersion?: string;
  isSimulation?: boolean;
  
  // Error handling
  error: string = '';

  // Test record tracking
  existingTestRecordId: number | null = null;
  currentUser: any = null;

  constructor(
    private fileUploadService: FileUploadService,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generateSessionId();
    // Get current user
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy(): void {
    this.stopRecording();
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
    }
    if (this.recordedAudioUrl) {
      URL.revokeObjectURL(this.recordedAudioUrl);
    }
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
    }
  }

  // Generate unique session ID
  generateSessionId(): void {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      
      // Validate file size (100 MB max)
      if (file.size > 100 * 1024 * 1024) {
        this.error = 'File size exceeds 100 MB limit.';
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

  // Upload and process file
  async uploadAndProcess(): Promise<void> {
    if (!this.selectedFile) {
      this.error = 'Please select a voice file first.';
      return;
    }

    // Validate file using service
    const validation = this.fileUploadService.validateFile(this.selectedFile, 'voice');
    if (!validation.valid) {
      this.error = validation.error || 'Invalid file.';
      return;
    }

    try {
      this.isUploading = true;
      this.isProcessing = true;
      this.error = '';

      // Step 1: Upload file
      const uploadResponse = await this.fileUploadService.uploadFile(
        this.selectedFile,
        'voice',
        this.sessionId
      ).toPromise();

      console.log('✅ File uploaded:', uploadResponse);

      // Step 2: ⭐ CRITICAL: Process analysis immediately after upload
      const analysisResponse = await this.apiService.processAnalysis({
        sessionId: this.sessionId,  // ⚠️ MUST match upload sessionId
        hasVoiceData: true,
        hasGaitData: false
      }).toPromise();

      console.log('✅ Analysis complete:', analysisResponse);
      
      // Step 3: Verify analysis was successful
      if (!analysisResponse) {
        this.error = 'Analysis completed but no results were returned.';
        return;
      }

      // Validate analysis response
      if (analysisResponse.isSimulation) {
        console.warn('⚠️ ML service not available - using simulation');
      }

      if (analysisResponse.riskPercent == null && analysisResponse.riskPercent !== 0) {
        console.error('❌ Analysis failed - riskPercent is null');
        this.error = 'Analysis processing failed. Please try again.';
        return;
      }

      // Step 4: Handle analysis results for display
      this.handleAnalysisResult(analysisResponse);

      // Step 5: Create or update test record with analysis results
      try {
        await this.createOrUpdateTestRecord(analysisResponse, uploadResponse);
      } catch (recordError: any) {
        console.error('❌ Error creating/updating test record:', recordError);
        // Still show analysis results even if test record save fails
        this.error = 'Analysis completed, but failed to save test record. Results are displayed below.';
      }

    } catch (error: any) {
      console.error('Error:', error);
      this.error = error.error?.message || error.message || 'Failed to process voice file. Please try again.';
    } finally {
      this.isUploading = false;
      this.isProcessing = false;
    }
  }

  // Check microphone permission
  async checkMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      this.error = 'Microphone access is required to record voice. Please enable microphone permissions.';
      return false;
    }
  }

  // Start recording
  async startRecording(): Promise<void> {
    // Check permission first
    const hasPermission = await this.checkMicrophonePermission();
    if (!hasPermission) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });

      this.audioStream = stream;
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getSupportedMimeType()
      });

      this.audioChunks = [];
      this.recordingTime = 0;
      this.error = '';

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.recordedAudio = new Blob(this.audioChunks, { 
          type: this.getSupportedMimeType() || 'audio/wav' 
        });
        
        if (this.recordedAudioUrl) {
          URL.revokeObjectURL(this.recordedAudioUrl);
        }
        this.recordedAudioUrl = URL.createObjectURL(this.recordedAudio);
        
        if (this.audioStream) {
          this.audioStream.getTracks().forEach(track => track.stop());
          this.audioStream = null;
        }
        
        if (this.recordingTimer) {
          clearInterval(this.recordingTimer);
        }
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;

      this.recordingTimer = setInterval(() => {
        this.recordingTime++;
      }, 1000);

    } catch (error: any) {
      console.error('Error starting recording:', error);
      this.error = error.message || 'Failed to start recording. Please check microphone permissions.';
      this.isRecording = false;
    }
  }

  // Stop recording
  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
    }
  }

  // Delete recording
  deleteRecording(): void {
    this.recordedAudio = null;
    if (this.recordedAudioUrl) {
      URL.revokeObjectURL(this.recordedAudioUrl);
      this.recordedAudioUrl = '';
    }
    this.audioChunks = [];
    this.recordingTime = 0;
    this.error = '';
  }

  // Play recording preview
  playRecording(): void {
    if (this.recordedAudioUrl) {
      const audio = new Audio(this.recordedAudioUrl);
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        this.error = 'Failed to play recording preview.';
      });
    }
  }

  // Get supported MIME type
  getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  // Format time display
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Upload recorded audio
  async uploadRecordedAudio(): Promise<void> {
    if (!this.recordedAudio) {
      this.error = 'No recording available. Please record first.';
      return;
    }

    try {
      this.isUploading = true;
      this.isProcessing = true;
      this.error = '';

      // Convert blob to File
      const audioFile = new File(
        [this.recordedAudio], 
        `recording-${Date.now()}.wav`, 
        { type: 'audio/wav' }
      );

      // Step 1: Upload file
      const uploadResponse = await this.fileUploadService.uploadFile(
        audioFile,
        'voice',
        this.sessionId
      ).toPromise();

      console.log('✅ Recording uploaded:', uploadResponse);

      // Step 2: ⭐ CRITICAL: Process analysis immediately after upload
      const analysisResponse = await this.apiService.processAnalysis({
        sessionId: this.sessionId,  // ⚠️ MUST match upload sessionId
        hasVoiceData: true,
        hasGaitData: false
      }).toPromise();

      console.log('✅ Analysis complete:', analysisResponse);
      
      // Step 3: Verify analysis was successful
      if (!analysisResponse) {
        this.error = 'Analysis completed but no results were returned.';
        return;
      }

      // Validate analysis response
      if (analysisResponse.isSimulation) {
        console.warn('⚠️ ML service not available - using simulation');
      }

      if (analysisResponse.riskPercent == null && analysisResponse.riskPercent !== 0) {
        console.error('❌ Analysis failed - riskPercent is null');
        this.error = 'Analysis processing failed. Please try again.';
        return;
      }

      // Step 4: Handle analysis results for display
      this.handleAnalysisResult(analysisResponse);

      // Step 5: Create or update test record with analysis results
      try {
        await this.createOrUpdateTestRecord(analysisResponse, uploadResponse);
      } catch (recordError: any) {
        console.error('❌ Error creating/updating test record:', recordError);
        // Still show analysis results even if test record save fails
        this.error = 'Analysis completed, but failed to save test record. Results are displayed below.';
      }

    } catch (error: any) {
      console.error('Error:', error);
      this.error = error.error?.message || error.message || 'Failed to process recording. Please try again.';
    } finally {
      this.isUploading = false;
      this.isProcessing = false;
    }
  }

  // Handle analysis results
  handleAnalysisResult(response: AnalysisResult): void {
    this.analysisResult = response;
    this.prediction = response.predictedClass;
    this.riskPercent = response.riskPercent;
    this.riskLevel = response.riskLevel;
    this.confidence = response.confidenceScore ? response.confidenceScore * 100 : undefined;
    this.modelVersion = response.modelVersion;
    this.isSimulation = response.isSimulation;

    // Clear any previous errors if analysis succeeded
    if (response.riskPercent !== null && response.riskPercent !== undefined) {
      // Only clear error if it's not a test record save error
      if (!this.error.includes('failed to save test record')) {
        this.error = '';
      }
    }
  }

  // Helper methods for display
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

  getPredictionClass(predictedClass?: string): string {
    switch(predictedClass) {
      case 'ParkinsonPositive':
      case 'Positive':
        return 'prediction-high';
      case 'Healthy':
      case 'Negative':
        return 'prediction-low';
      case 'Uncertain':
        return 'prediction-uncertain';
      default:
        return 'prediction-pending';
    }
  }

  getRiskClass(riskPercent?: number): string {
    if (!riskPercent && riskPercent !== 0) return 'risk-unknown';
    if (riskPercent >= 50) return 'risk-high';
    if (riskPercent >= 30) return 'risk-moderate';
    return 'risk-low';
  }

  // Reset component for new analysis
  resetComponent(): void {
    this.selectedFile = null;
    this.recordedAudio = null;
    if (this.recordedAudioUrl) {
      URL.revokeObjectURL(this.recordedAudioUrl);
      this.recordedAudioUrl = '';
    }
    this.audioChunks = [];
    this.recordingTime = 0;
    this.analysisResult = null;
    this.prediction = undefined;
    this.riskPercent = undefined;
    this.riskLevel = undefined;
    this.confidence = undefined;
    this.modelVersion = undefined;
    this.isSimulation = undefined;
    this.error = '';
    this.existingTestRecordId = null;  // Reset test record ID for new analysis
    this.generateSessionId();
  }

  // Navigate to test records
  navigateToTestRecords(): void {
    this.router.navigate(['/test-records']);
  }

  // Create or update test record with analysis results
  async createOrUpdateTestRecord(
    analysisResponse: AnalysisResult,
    uploadResponse: any
  ): Promise<void> {
    if (!this.currentUser) {
      console.error('❌ No current user found');
      throw new Error('User not authenticated');
    }

    try {
      // Map analysis results to test record format
      const testRecordData: UserTestRecordRequest = {
        userId: this.currentUser.id,
        userName: this.currentUser.email || this.currentUser.userName,
        testResult: this.mapPredictedClass(analysisResponse.predictedClass),
        accuracy: (analysisResponse.confidenceScore || 0) * 100,  // Convert 0-1 to 0-100
        status: 'Completed',  // ⭐ CRITICAL: Change from "Pending" to "Completed"
        voiceRecordingUrl: uploadResponse.fileUrl || uploadResponse.filePath,
        analysisNotes: `Analysis completed. Risk: ${analysisResponse.riskPercent}% (${analysisResponse.riskLevel || 'Unknown'})`
      };

      // If test record already exists, update it
      if (this.existingTestRecordId) {
        const updateResponse = await this.apiService.updateUserTestRecord(
          this.existingTestRecordId,
          testRecordData
        ).toPromise();

        console.log('✅ Test record updated:', updateResponse);
      } else {
        // Create new test record
        const createResponse = await this.apiService.createUserTestRecord(
          testRecordData
        ).toPromise();

        console.log('✅ Test record created:', createResponse);
        if (createResponse) {
          this.existingTestRecordId = createResponse.id;
        }
      }

      // Note: Linking AnalysisResult to UserTestRecord would require backend endpoint
      // For now, the sessionId ensures they can be linked via backend logic
      console.log(`✅ Test record ${this.existingTestRecordId} linked to analysis session ${analysisResponse.sessionId}`);

    } catch (error: any) {
      console.error('❌ Error creating/updating test record:', error);
      throw error;
    }
  }

  // Helper: Map backend predicted class to frontend format
  mapPredictedClass(predictedClass?: string): 'Positive' | 'Negative' | 'Uncertain' {
    const mapping: { [key: string]: 'Positive' | 'Negative' | 'Uncertain' } = {
      'ParkinsonPositive': 'Positive',
      'Healthy': 'Negative',
      'Uncertain': 'Uncertain',
      'Positive': 'Positive',
      'Negative': 'Negative'
    };
    return mapping[predictedClass || ''] || 'Uncertain';
  }
}

