import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { FileUploadService } from '../../services/file-upload.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { AnalysisResult, UserTestRecord, UserTestRecordRequest } from '../../models/api.models';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-voice-input',
  templateUrl: './voice-input.component.html',
  styleUrls: ['./voice-input.component.scss']
})
export class VoiceInputComponent implements OnInit, OnDestroy, AfterViewInit {
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

  // Parsed voice feature values from voiceFeaturesJson
  voiceFeatures: { [key: string]: number } | null = null;
  objectKeys = Object.keys;
  @ViewChild('voiceFeaturesChart') voiceFeaturesChartRef?: ElementRef<HTMLCanvasElement>;
  private voiceFeaturesChart: Chart | null = null;
  
  // Error handling
  error: string = '';
  private errorAutoCloseTimer: any = null;

  // Test record tracking
  existingTestRecordId: number | null = null;
  currentUser: any = null;

  constructor(
    private fileUploadService: FileUploadService,
    private apiService: ApiService,
    private authService: AuthService,
    private messageService: MessageService,
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
    if (this.voiceFeaturesChart) {
      this.voiceFeaturesChart.destroy();
      this.voiceFeaturesChart = null;
    }
    this.clearErrorTimer();
  }

  ngAfterViewInit(): void {
    if (this.voiceFeatures) {
      this.updateVoiceFeaturesChart();
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
        this.setError('Invalid file type. Please select an audio file (.wav, .mp3, .m4a, etc.)');
        return;
      }
      
      // Validate file size (100 MB max)
      if (file.size > 100 * 1024 * 1024) {
        this.setError('File size exceeds 100 MB limit.');
        return;
      }
      
      this.selectedFile = file;
      this.setError('');
    }
  }

  // Remove selected file
  removeFile(): void {
    this.selectedFile = null;
    this.setError('');
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
      this.setError('Please select a voice file first.');
      return;
    }

    // Validate file using service
    const validation = this.fileUploadService.validateFile(this.selectedFile, 'voice');
    if (!validation.valid) {
      this.setError(validation.error || 'Invalid file.');
      return;
    }

    try {
      this.isUploading = true;
      this.isProcessing = true;
      this.setError('');

      // ⭐ Convert WebM files to WAV before uploading
      let fileToUpload = this.selectedFile;
      
      if (this.selectedFile.type.includes('webm') || this.selectedFile.name.toLowerCase().endsWith('.webm')) {
        console.log('🔄 Converting uploaded WebM file to WAV format...');
        try {
          const fileBlob = new Blob([this.selectedFile], { type: this.selectedFile.type });
          const wavBlob = await this.convertWebMToWAV(fileBlob);
          console.log('✅ Conversion complete. WAV size:', wavBlob.size, 'bytes');
          
          fileToUpload = new File(
            [wavBlob],
            this.selectedFile.name.replace(/\.webm$/i, '.wav'),
            { type: 'audio/wav' }
          );
        } catch (conversionError) {
          console.error('❌ WebM to WAV conversion failed:', conversionError);
          console.warn('⚠️ Uploading as original WebM format');
          // Continue with original file if conversion fails
        }
      }

      // Step 1: Upload file
      const uploadResponse = await this.fileUploadService.uploadFile(
        fileToUpload,
        'voice',
        this.sessionId
      ).toPromise();

      console.log('✅ File uploaded:', uploadResponse);

      // Step 2: ⭐ CRITICAL: Process analysis immediately after upload
      const analysisResponse = await this.apiService.processAnalysis({
        sessionId: this.sessionId,  // ⚠️ MUST match upload sessionId
        hasVoiceData: true,
        hasGaitData: false,
        voiceFileId: this.fileUploadService.parseFileIdFromUploadBody(uploadResponse)
      }).toPromise();

      console.log('✅ Analysis complete:', analysisResponse);
      
      // Step 3: Verify analysis was successful
      if (!analysisResponse) {
        this.setError('Analysis completed but no results were returned.');
        return;
      }

      // Validate analysis response
      if (analysisResponse.isSimulation) {
        console.warn('⚠️ ML service not available - using simulation');
      }

      if (analysisResponse.riskPercent == null && analysisResponse.riskPercent !== 0) {
        console.error('❌ Analysis failed - riskPercent is null');
        this.setError('Analysis processing failed. Please try again.');
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
        this.setError('Analysis completed, but failed to save test record. Results are displayed below.');
      }

    } catch (error: any) {
      console.error('Error:', error);
      const msg = error.error?.message || error.message || 'Failed to process voice file. Please try again.';
      this.setError(msg);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: msg,
        life: 8000
      });
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
      this.setError('Microphone access is required to record voice. Please enable microphone permissions.');
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
      // Allow a clean second recording attempt without manual reset.
      this.deleteRecording();

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
      this.setError('');

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
      this.setError(error.message || 'Failed to start recording. Please check microphone permissions.');
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
    this.setError('');
  }

  async restartRecording(): Promise<void> {
    this.deleteRecording();
    await this.startRecording();
  }

  // Play recording preview
  playRecording(): void {
    if (this.recordedAudioUrl) {
      const audio = new Audio(this.recordedAudioUrl);
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        this.setError('Failed to play recording preview.');
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

  // Upload recorded audio
  async uploadRecordedAudio(): Promise<void> {
    if (!this.recordedAudio) {
      this.setError('No recording available. Please record first.');
      return;
    }

    try {
      this.isUploading = true;
      this.isProcessing = true;
      this.setError('');

      // ⭐ Convert WebM to WAV before uploading
      console.log('🔄 Converting WebM to WAV format...');
      let audioFile: File;
      
      try {
        const wavBlob = await this.convertWebMToWAV(this.recordedAudio);
        console.log('✅ Conversion complete. WAV size:', wavBlob.size, 'bytes');
        audioFile = new File([wavBlob], `recording-${Date.now()}.wav`, { type: 'audio/wav' });
      } catch (conversionError) {
        console.error('❌ WebM to WAV conversion failed:', conversionError);
        // Fallback: upload as original format if conversion fails
        console.warn('⚠️ Falling back to original format');
        const mimeType = this.getSupportedMimeType() || 'audio/webm';
        audioFile = new File([this.recordedAudio], `recording-${Date.now()}.${mimeType.includes('webm') ? 'webm' : 'wav'}`, { type: mimeType });
      }

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
        hasGaitData: false,
        voiceFileId: this.fileUploadService.parseFileIdFromUploadBody(uploadResponse)
      }).toPromise();

      console.log('✅ Analysis complete:', analysisResponse);
      
      // Step 3: Verify analysis was successful
      if (!analysisResponse) {
        this.setError('Analysis completed but no results were returned.');
        return;
      }

      // Validate analysis response
      if (analysisResponse.isSimulation) {
        console.warn('⚠️ ML service not available - using simulation');
      }

      if (analysisResponse.riskPercent == null && analysisResponse.riskPercent !== 0) {
        console.error('❌ Analysis failed - riskPercent is null');
        this.setError('Analysis processing failed. Please try again.');
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
        this.setError('Analysis completed, but failed to save test record. Results are displayed below.');
      }

    } catch (error: any) {
      console.error('Error:', error);
      const msg = error.error?.message || error.message || 'Failed to process recording. Please try again.';
      this.setError(msg);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: msg,
        life: 8000
      });
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

    // Parse raw voice feature JSON if available
    if (response && response.voiceFeaturesJson) {
      try {
        this.voiceFeatures = JSON.parse(response.voiceFeaturesJson);
      } catch (error) {
        console.error('Error parsing voiceFeaturesJson:', error);
        this.voiceFeatures = null;
      }
    } else {
      this.voiceFeatures = null;
    }

    if (this.voiceFeatures) {
      this.updateVoiceFeaturesChart();
    }

    // Clear any previous errors if analysis succeeded
    if (response.riskPercent !== null && response.riskPercent !== undefined) {
      // Only clear error if it's not a test record save error
      if (!this.error.includes('failed to save test record')) {
        this.setError('');
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
    this.voiceFeatures = null;
    this.setError('');
    this.existingTestRecordId = null;  // Reset test record ID for new analysis
    this.generateSessionId();
  }

  // Navigate to test records
  navigateToTestRecords(): void {
    this.router.navigate(['/test-records']);
  }

  private updateVoiceFeaturesChart(): void {
    if (!this.voiceFeatures || !this.voiceFeaturesChartRef) {
      return;
    }

    const entries = Object.entries(this.voiceFeatures);
    const labels = entries.map(([key]) => key);
    const data = entries.map(([, value]) => Number(value));

    const ctx = this.voiceFeaturesChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.voiceFeaturesChart) {
      this.voiceFeaturesChart.data.labels = labels;
      this.voiceFeaturesChart.data.datasets[0].data = data;
      this.voiceFeaturesChart.update();
      return;
    }

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

      if (analysisResponse.sessionId && this.existingTestRecordId) {
        try {
          await this.apiService
            .linkAnalysisToTestRecord(analysisResponse.sessionId, this.existingTestRecordId)
            .toPromise();
          console.log(
            `✅ Test record ${this.existingTestRecordId} linked to analysis session ${analysisResponse.sessionId}`
          );
        } catch (linkErr) {
          console.warn('Could not link analysis to test record', linkErr);
        }
      }

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

  private clearErrorTimer(): void {
    if (this.errorAutoCloseTimer) {
      clearTimeout(this.errorAutoCloseTimer);
      this.errorAutoCloseTimer = null;
    }
  }

  private setError(message: string, autoCloseMs = 5000): void {
    this.clearErrorTimer();
    this.error = message;
    if (message) {
      this.errorAutoCloseTimer = setTimeout(() => {
        this.error = '';
        this.errorAutoCloseTimer = null;
      }, autoCloseMs);
    }
  }
}

