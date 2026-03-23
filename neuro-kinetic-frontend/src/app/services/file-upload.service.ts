import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpProgressEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FileUploadResponse, FileUploadRequest } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Extracts database file id from POST /fileupload/upload JSON.
   * Handles camelCase/PascalCase and numeric strings (defensive for different serializers).
   */
  parseFileIdFromUploadBody(body: unknown): number | undefined {
    if (body == null || typeof body !== 'object') {
      return undefined;
    }
    const o = body as Record<string, unknown>;
    const raw = o['fileId'] ?? o['FileId'];
    if (typeof raw === 'number' && raw > 0) {
      return raw;
    }
    if (typeof raw === 'string') {
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }
    return undefined;
  }

  /**
   * Upload a file to the server
   * @param file The file to upload
   * @param fileType Type of file: 'voice', 'gait', 'video', or 'image'
   * @param sessionId Optional session ID to associate the file with
   * @param description Optional description of the file
   * @returns Observable of FileUploadResponse
   */
  uploadFile(
    file: File,
    fileType: 'voice' | 'gait' | 'video' | 'image',
    sessionId?: string,
    description?: string
  ): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);
    
    if (sessionId) {
      formData.append('sessionId', sessionId);
    }
    
    if (description) {
      formData.append('description', description);
    }

    return this.http.post<FileUploadResponse>(
      `${this.apiUrl}/fileupload/upload`,
      formData
    );
  }

  /**
   * Upload a file with progress tracking
   * @param file The file to upload
   * @param fileType Type of file
   * @param sessionId Optional session ID
   * @param description Optional description
   * @returns Observable with progress events
   */
  uploadFileWithProgress(
    file: File,
    fileType: 'voice' | 'gait' | 'video' | 'image',
    sessionId?: string,
    description?: string
  ): Observable<HttpEvent<FileUploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);
    
    if (sessionId) {
      formData.append('sessionId', sessionId);
    }
    
    if (description) {
      formData.append('description', description);
    }

    return this.http.post<FileUploadResponse>(
      `${this.apiUrl}/fileupload/upload`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    );
  }

  /**
   * Download a file by ID
   * @param fileId The ID of the file to download
   * @returns Observable of Blob
   */
  downloadFile(fileId: number): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/fileupload/download/${fileId}`,
      { responseType: 'blob' }
    );
  }

  /**
   * Get file URL by ID
   * @param fileId The ID of the file
   * @returns Observable of string (URL)
   */
  getFileUrl(fileId: number): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/fileupload/url/${fileId}`);
  }

  /**
   * Get all files associated with a session
   * @param sessionId The session ID
   * @returns Observable of FileUploadResponse array
   */
  getFilesBySession(sessionId: string): Observable<FileUploadResponse[]> {
    return this.http.get<FileUploadResponse[]>(
      `${this.apiUrl}/fileupload/session/${encodeURIComponent(sessionId)}`
    );
  }

  /**
   * Get allowed file types
   * @returns Observable of allowed file types
   */
  getAllowedFileTypes(): Observable<{
    voice: string[];
    gait: string[];
    video: string[];
    image: string[];
    maxSize: number;
  }> {
    return this.http.get<{
      voice: string[];
      gait: string[];
      video: string[];
      image: string[];
      maxSize: number;
    }>(`${this.apiUrl}/fileupload/types`);
  }

  /**
   * Delete a file (Owner/Admin only)
   * @param fileId The ID of the file to delete
   * @returns Observable of void
   */
  deleteFile(fileId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/fileupload/${fileId}`);
  }

  /**
   * Validate file before upload
   * @param file The file to validate
   * @param fileType The type of file
   * @returns Validation result with error message if invalid
   */
  validateFile(file: File, fileType: 'voice' | 'gait' | 'video' | 'image'): {
    valid: boolean;
    error?: string;
  } {
    // Max file size: 100 MB
    const maxSize = 100 * 1024 * 1024; // 100 MB in bytes

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of 100 MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)} MB`
      };
    }

    // Validate file extension based on type
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    const allowedExtensions: Record<string, string[]> = {
      voice: ['wav', 'mp3', 'm4a', 'flac', 'ogg'],
      gait: ['mp4', 'avi', 'mov', 'mkv', 'webm'],
      video: ['mp4', 'avi', 'mov', 'mkv', 'webm'],
      image: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    };

    const allowed = allowedExtensions[fileType];
    if (!allowed || !extension || !allowed.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed extensions for ${fileType}: ${allowed.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Get file size in human-readable format
   * @param bytes File size in bytes
   * @returns Human-readable file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}


