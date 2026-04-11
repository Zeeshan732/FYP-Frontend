import { Injectable } from '@angular/core';

/**
 * Client-side preparation for finger-tap video uploads.
 *
 * Azure App Service / IIS often limits request bodies to ~28–30MB. Phone camera MP4s
 * can be 40–80MB uncompressed, causing HTTP 413 before the ML service runs.
 * We normalize to ~480×854 H.264 + capped bitrate so uploads stay under limits and
 * match the heuristic model’s portrait-ish framing.
 */

/** Hard reject — cannot process in browser reasonably */
export const FT_HARD_MAX_BYTES = 100 * 1024 * 1024;

/** Above this, Azure may return 413 — compress first (safety margin under ~28MB IIS). */
export const FT_COMPRESS_THRESHOLD_BYTES = 20 * 1024 * 1024;

/** Normalize larger-but-valid uploads to a small file for faster transfer + consistency */
export const FT_NORMALIZE_THRESHOLD_BYTES = 10 * 1024 * 1024;

export const FT_MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
export const FT_MAX_DURATION_SEC = 20;
export const FT_WARN_DURATION_SEC = 30;

const INPUT_NAME = 'ft_in.mp4';
const OUTPUT_NAME = 'ft_out.mp4';

export interface VideoValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable({ providedIn: 'root' })
export class FingerTapVideoPrepService {
  private ffmpeg: import('@ffmpeg/ffmpeg').FFmpeg | null = null;

  /** True if we should run FFmpeg before upload (large file or long duration). */
  shouldCompressApprox(file: File, durationSec: number | null): boolean {
    if (file.size > FT_HARD_MAX_BYTES) {
      return false;
    }
    if (file.size > FT_COMPRESS_THRESHOLD_BYTES) {
      return true;
    }
    if (durationSec != null && durationSec > FT_MAX_DURATION_SEC) {
      return true;
    }
    if (file.size > FT_NORMALIZE_THRESHOLD_BYTES) {
      return true;
    }
    return false;
  }

  validateExtension(file: File): VideoValidationResult {
    const allowed = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!allowed.includes(ext)) {
      errors.push('Please use MP4, MOV, AVI, MKV, or WEBM.');
    }
    if (file.size === 0) {
      errors.push('This file is empty.');
    }
    if (file.size > FT_HARD_MAX_BYTES) {
      errors.push(`File is too large (${this.fmtMb(file.size)}). Maximum size is 100 MB.`);
    }
    return { ok: errors.length === 0, errors, warnings };
  }

  /** Read duration via metadata (required for long-video warnings). Caller must revoke URL if needed — we revoke inside. */
  getVideoDurationSec(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.playsInline = true;
      const done = (d: number) => {
        URL.revokeObjectURL(url);
        resolve(d);
      };
      const fail = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read video duration.'));
      };
      v.onloadedmetadata = () => {
        const d = v.duration;
        if (!Number.isFinite(d) || d <= 0) {
          fail();
          return;
        }
        done(d);
      };
      v.onerror = () => fail();
      v.src = url;
    });
  }

  durationWarnings(durationSec: number): string[] {
    const w: string[] = [];
    if (durationSec > FT_WARN_DURATION_SEC) {
      w.push(`Video is longer than ${FT_WARN_DURATION_SEC}s. For best results use a clip under ${FT_MAX_DURATION_SEC}s.`);
    } else if (durationSec > FT_MAX_DURATION_SEC) {
      w.push(`Videos longer than ${FT_MAX_DURATION_SEC}s will be trimmed for analysis.`);
    }
    return w;
  }

  /**
   * Transcode to portrait 480×854-ish, H.264, capped bitrate, max 20s (or 12s on retry).
   * Loads FFmpeg.wasm from /ffmpeg/* (copied from @ffmpeg/core at build time).
   */
  async compressForUpload(
    file: File,
    onProgress: (ratio: number, label: string) => void,
    opts?: { aggressive?: boolean }
  ): Promise<File> {
    const ffmpeg = await this.getFFmpeg();
    const { fetchFile } = await import('@ffmpeg/util');

    onProgress(0.02, 'Loading encoder…');

    await ffmpeg.writeFile(INPUT_NAME, await fetchFile(file));

    const maxSec = opts?.aggressive ? 12 : FT_MAX_DURATION_SEC;
    const crf = opts?.aggressive ? 32 : 28;

    onProgress(0.08, 'Optimizing video for analysis…');

    const args = [
      '-nostdin',
      '-y',
      '-i',
      INPUT_NAME,
      '-vf',
      'scale=480:854:force_original_aspect_ratio=decrease,pad=480:854:(ow-iw)/2:(oh-ih)/2,setsar=1',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      String(crf),
      '-maxrate',
      '600k',
      '-bufsize',
      '1200k',
      '-movflags',
      '+faststart',
      '-an',
      '-t',
      String(maxSec),
      OUTPUT_NAME
    ];

    const onFfmpegProgress = ({ progress: p }: { progress: number }) => {
      const ratio = 0.08 + Math.min(0.85, Math.max(0, p)) * 0.85;
      onProgress(ratio, 'Optimizing video for analysis…');
    };
    ffmpeg.on('progress', onFfmpegProgress);

    try {
      const code = await ffmpeg.exec(args);
      if (code !== 0) {
        throw new Error('Video encoding failed.');
      }
    } finally {
      ffmpeg.off('progress', onFfmpegProgress);
    }

    onProgress(0.94, 'Finalizing…');

    const outData = await ffmpeg.readFile(OUTPUT_NAME);
    if (!(outData instanceof Uint8Array)) {
      throw new Error('Unexpected FFmpeg output — expected binary video data.');
    }
    const u8 = outData;
    let blob = new Blob([u8], { type: 'video/mp4' });

    try {
      await ffmpeg.deleteFile(INPUT_NAME);
      await ffmpeg.deleteFile(OUTPUT_NAME);
    } catch {
      /* ignore */
    }

    if (blob.size > FT_MAX_OUTPUT_BYTES && !opts?.aggressive) {
      onProgress(0.5, 'Applying stronger compression…');
      return this.compressForUpload(
        new File([blob], 'ft-temp.mp4', { type: 'video/mp4' }),
        onProgress,
        { aggressive: true }
      );
    }

    const name = file.name.replace(/\.[^.]+$/, '') + '-optimized.mp4';
    onProgress(1, 'Done');
    return new File([blob], name, { type: 'video/mp4', lastModified: Date.now() });
  }

  private async getFFmpeg(): Promise<import('@ffmpeg/ffmpeg').FFmpeg> {
    if (this.ffmpeg) {
      return this.ffmpeg;
    }
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    const base = this.ffmpegAssetBase();
    const coreURL = await toBlobURL(`${base}ffmpeg-core.js`, 'text/javascript', true, () => {});
    const wasmURL = await toBlobURL(`${base}ffmpeg-core.wasm`, 'application/wasm', true, () => {});

    const ffmpeg = new FFmpeg();
    await ffmpeg.load({ coreURL, wasmURL });
    this.ffmpeg = ffmpeg;
    return ffmpeg;
  }

  /** Public URL folder for ffmpeg-core (see angular.json assets). */
  private ffmpegAssetBase(): string {
    if (typeof document === 'undefined') {
      return '/ffmpeg/';
    }
    const base = document.querySelector('base')?.getAttribute('href') || '/';
    try {
      return new URL('ffmpeg/', base).href;
    } catch {
      return '/ffmpeg/';
    }
  }

  fmtMb(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
