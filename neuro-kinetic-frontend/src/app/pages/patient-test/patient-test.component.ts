import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { FileUploadService } from '../../services/file-upload.service';
import { Router } from '@angular/router';
import { UserTestRecordRequest, UserTestRecord } from '../../models/api.models';
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
  error = '';
  
  // User info
  currentUser: any = null;

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
            
            // Now create test record with uploaded file URL
            const testRecord: UserTestRecordRequest = {
              userName: this.currentUser?.email || 'Anonymous',
              userId: this.currentUser?.id,
              status: 'Pending',
              testResult: 'Uncertain',
              accuracy: 0,
              voiceRecordingUrl: uploadResponse?.fileUrl || uploadResponse?.filePath,
              analysisNotes: 'Test submitted - awaiting analysis'
            };

            // Create test record
            this.apiService.createUserTestRecord(testRecord).subscribe({
              next: (record: UserTestRecord) => {
                // Poll for status updates until completed
                setTimeout(() => {
                  this.processTestResult(record);
                }, 2000);
              },
              error: (error) => {
                console.error('Error creating test record:', error);
                this.error = 'Failed to save test record. Please try again.';
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
    // For now, we do a single fetch and then stop, so the UI doesn't loop forever.
    this.apiService.getUserTestRecord(record.id).subscribe({
      next: (updatedRecord) => {
        this.testResult = updatedRecord;
        this.testCompleted = true;
        this.isProcessing = false;

        if (updatedRecord.status !== 'Completed') {
          // Backend is still processing asynchronously – show a friendly message.
          this.error = 'Test submitted. Results will be available once processing completes.';
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

  startNewTest() {
    this.testStarted = false;
    this.testCompleted = false;
    this.testResult = null;
    this.audioBlob = null;
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    this.recordingTime = 0;
    this.error = '';
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
}

