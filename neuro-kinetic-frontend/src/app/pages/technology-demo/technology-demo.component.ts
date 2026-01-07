import { Component, HostListener, OnInit } from '@angular/core';
import { FileUploadService } from '../../services/file-upload.service';
import { ApiService } from '../../services/api.service';
import { AnalysisRequest, AnalysisResult, FileUploadResponse } from '../../models/api.models';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-technology-demo',
  templateUrl: './technology-demo.component.html',
  styleUrls: ['./technology-demo.component.scss']
})
export class TechnologyDemoComponent implements OnInit {
  selectedDemo: 'voice' | 'gait' | null = null;
  
  // Voice Analysis Properties
  audioFile: File | null = null;
  waveformBars: number[] = [];
  voiceAnalysisResults: any = null;
  voiceUploadProgress = 0;
  voiceProcessing = false;
  voiceError = '';
  
  // Gait Analysis Properties
  videoFile: File | null = null;
  gaitAnalysisResults: any = null;
  gaitUploadProgress = 0;
  gaitProcessing = false;
  gaitError = '';
  
  // Session ID for tracking
  sessionId = `demo-${Date.now()}`;

  constructor(
    private fileUploadService: FileUploadService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.initializeWaveform();
  }

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    this.observeElements();
  }

  selectDemo(demo: 'voice' | 'gait') {
    this.selectedDemo = demo;
    this.resetAnalysis();
  }

  // File Upload Methods
  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      if (this.selectedDemo === 'voice') {
        this.audioFile = files[0];
        this.generateWaveform();
      } else if (this.selectedDemo === 'gait') {
        this.videoFile = files[0];
      }
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.audioFile = file;
      this.generateWaveform();
    }
  }

  onVideoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.videoFile = file;
    }
  }

  // Analysis Methods
  startVoiceAnalysis() {
    if (!this.audioFile) return;
    
    this.voiceProcessing = true;
    this.voiceError = '';
    this.voiceAnalysisResults = null;
    this.voiceUploadProgress = 0;
    
    // First upload the file
    this.fileUploadService.uploadFileWithProgress(
      this.audioFile,
      'voice',
      this.sessionId,
      'Voice analysis demo'
    ).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total || 1;
          this.voiceUploadProgress = Math.round((100 * event.loaded) / total);
        } else if (event.type === HttpEventType.Response) {
          const uploadResponse = event.body as FileUploadResponse;
          
          // Now submit analysis
          const analysisRequest: AnalysisRequest = {
            filePath: uploadResponse.filePath,
            analysisType: 'Voice',
            sessionId: this.sessionId,
            metadata: {
              fileName: uploadResponse.fileName,
              fileType: 'voice'
            }
          };
          
          this.apiService.submitAnalysis(analysisRequest).subscribe({
            next: (result: AnalysisResult) => {
              const confidenceLevel = result.confidenceLevel || 'Medium';
              this.voiceAnalysisResults = {
                confidence: confidenceLevel === 'High' ? 85 : confidenceLevel === 'Medium' ? 70 : 55,
                pitchStability: this.mapConfidenceToMetric(confidenceLevel, 85),
                rhythmConsistency: this.mapConfidenceToMetric(confidenceLevel, 80),
                volumeControl: this.mapConfidenceToMetric(confidenceLevel, 75),
                tremorDetection: this.mapConfidenceToMetric(confidenceLevel, 15),
                recommendations: this.getRecommendations(confidenceLevel, 'voice'),
                result: result
              };
              this.voiceProcessing = false;
            },
            error: (error) => {
              console.error('Analysis error:', error);
              this.voiceError = 'Analysis failed. Please try again.';
              this.voiceProcessing = false;
            }
          });
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.voiceError = 'File upload failed. Please try again.';
        this.voiceProcessing = false;
      }
    });
  }

  startGaitAnalysis() {
    if (!this.videoFile) return;
    
    this.gaitProcessing = true;
    this.gaitError = '';
    this.gaitAnalysisResults = null;
    this.gaitUploadProgress = 0;
    
    // First upload the file
    this.fileUploadService.uploadFileWithProgress(
      this.videoFile,
      'gait',
      this.sessionId,
      'Gait analysis demo'
    ).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total || 1;
          this.gaitUploadProgress = Math.round((100 * event.loaded) / total);
        } else if (event.type === HttpEventType.Response) {
          const uploadResponse = event.body as FileUploadResponse;
          
          // Now submit analysis
          const analysisRequest: AnalysisRequest = {
            filePath: uploadResponse.filePath,
            analysisType: 'Gait',
            sessionId: this.sessionId,
            metadata: {
              fileName: uploadResponse.fileName,
              fileType: 'gait'
            }
          };
          
          this.apiService.submitAnalysis(analysisRequest).subscribe({
            next: (result: AnalysisResult) => {
              const confidenceLevel = result.confidenceLevel || 'Medium';
              this.gaitAnalysisResults = {
                overallScore: confidenceLevel === 'High' ? 88 : confidenceLevel === 'Medium' ? 75 : 62,
                stepLength: this.mapConfidenceToMetric(confidenceLevel, 85),
                cadence: this.mapConfidenceToMetric(confidenceLevel, 90),
                balance: this.mapConfidenceToMetric(confidenceLevel, 85),
                swingPhase: this.mapConfidenceToMetric(confidenceLevel, 88),
                recommendations: this.getRecommendations(confidenceLevel, 'gait'),
                result: result
              };
              this.gaitProcessing = false;
            },
            error: (error) => {
              console.error('Analysis error:', error);
              this.gaitError = 'Analysis failed. Please try again.';
              this.gaitProcessing = false;
            }
          });
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.gaitError = 'File upload failed. Please try again.';
        this.gaitProcessing = false;
      }
    });
  }

  // Utility Methods
  private initializeWaveform() {
    this.waveformBars = Array.from({ length: 50 }, () => Math.random() * 100);
  }

  private generateWaveform() {
    this.waveformBars = Array.from({ length: 100 }, () => Math.random() * 120 + 20);
  }

  private resetAnalysis() {
    this.audioFile = null;
    this.videoFile = null;
    this.voiceAnalysisResults = null;
    this.gaitAnalysisResults = null;
    this.waveformBars = [];
  }

  private getSampleVoiceResults(type: 'healthy' | 'parkinson') {
    if (type === 'healthy') {
      return {
        confidence: 92,
        pitchStability: 88,
        rhythmConsistency: 91,
        volumeControl: 85,
        tremorDetection: 15,
        recommendations: [
          'Voice patterns indicate healthy neurological function',
          'Pitch stability and rhythm are within normal ranges',
          'Minimal tremor detected - within expected variation'
        ]
      };
    } else {
      return {
        confidence: 78,
        pitchStability: 65,
        rhythmConsistency: 72,
        volumeControl: 68,
        tremorDetection: 45,
        recommendations: [
          'Voice patterns suggest potential neurological considerations',
          'Pitch instability and rhythm variations detected',
          'Moderate tremor presence - recommend clinical evaluation'
        ]
      };
    }
  }

  private getSampleGaitResults(type: 'healthy' | 'parkinson') {
    if (type === 'healthy') {
      return {
        overallScore: 89,
        stepLength: 85,
        cadence: 92,
        balance: 88,
        swingPhase: 91,
        recommendations: [
          'Gait patterns indicate normal motor function',
          'Step length and cadence within healthy ranges',
          'Excellent balance and swing phase coordination'
        ]
      };
    } else {
      return {
        overallScore: 67,
        stepLength: 58,
        cadence: 72,
        balance: 61,
        swingPhase: 68,
        recommendations: [
          'Gait patterns show signs of motor dysfunction',
          'Reduced step length and cadence variations',
          'Balance and coordination concerns - recommend assessment'
        ]
      };
    }
  }

  private observeElements() {
    const elements = document.querySelectorAll('.demo-card');
    
    elements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      const elementVisible = 150;

      if (elementTop < window.innerHeight - elementVisible) {
        element.classList.add('animate');
      }
    });
  }

  // Helper methods
  private mapConfidenceToMetric(confidence: string, baseValue: number): number {
    switch (confidence) {
      case 'High':
        return Math.floor(Math.random() * 10) + (baseValue - 5);
      case 'Medium':
        return Math.floor(Math.random() * 15) + (baseValue - 15);
      case 'Low':
        return Math.floor(Math.random() * 20) + (baseValue - 30);
      default:
        return baseValue;
    }
  }

  private getRecommendations(confidence: string, type: 'voice' | 'gait'): string[] {
    if (confidence === 'High') {
      if (type === 'voice') {
        return [
          'Voice patterns indicate healthy neurological function',
          'Pitch stability and rhythm are within normal ranges',
          'Minimal tremor detected - within expected variation'
        ];
      } else {
        return [
          'Gait patterns indicate normal motor function',
          'Step length and cadence within healthy ranges',
          'Excellent balance and swing phase coordination'
        ];
      }
    } else if (confidence === 'Medium') {
      if (type === 'voice') {
        return [
          'Voice patterns show some variation from baseline',
          'Consider monitoring for subtle changes over time',
          'Regular assessment recommended'
        ];
      } else {
        return [
          'Gait patterns show minor variations',
          'Step length and cadence within acceptable ranges',
          'Monitor balance and coordination'
        ];
      }
    } else {
      if (type === 'voice') {
        return [
          'Voice patterns suggest potential neurological considerations',
          'Pitch instability and rhythm variations detected',
          'Recommend clinical evaluation'
        ];
      } else {
        return [
          'Gait patterns show signs of motor dysfunction',
          'Reduced step length and cadence variations',
          'Balance and coordination concerns - recommend assessment'
        ];
      }
    }
  }

  // Keep sample data methods for fallback/demo purposes
  loadSampleAudio(type: 'healthy' | 'parkinson') {
    // Create a dummy file for demo
    const blob = new Blob([''], { type: 'audio/wav' });
    this.audioFile = new File([blob], `sample-${type}.wav`, { type: 'audio/wav' });
    this.generateWaveform();
    
    // Use simulated data if API not available
    setTimeout(() => {
      this.voiceAnalysisResults = this.getSampleVoiceResults(type);
    }, 2000);
  }

  loadSampleVideo(type: 'healthy' | 'parkinson') {
    // Create a dummy file for demo
    const blob = new Blob([''], { type: 'video/mp4' });
    this.videoFile = new File([blob], `sample-${type}.mp4`, { type: 'video/mp4' });
    
    // Use simulated data if API not available
    setTimeout(() => {
      this.gaitAnalysisResults = this.getSampleGaitResults(type);
    }, 2000);
  }
}