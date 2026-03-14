import { Injectable } from '@angular/core';

/**
 * Pure frontend DSP (digital signal processing) math. No backend or ML calls.
 */
@Injectable({
  providedIn: 'root'
})
export class DspService {

  /** Root mean square of samples. */
  rms(samples: number[]): number {
    if (samples.length === 0) return 0;
    const sumSq = samples.reduce((acc, x) => acc + x * x, 0);
    return Math.sqrt(sumSq / samples.length);
  }

  /** Spectral centroid (magnitude-weighted center of spectrum). Assumes magnitudes.length = bin count. */
  spectralCentroid(magnitudes: number[], sampleRate: number, fftSize: number): number {
    if (magnitudes.length === 0) return 0;
    const binFreq = sampleRate / fftSize;
    let weighted = 0;
    let total = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      const f = i * binFreq;
      weighted += f * magnitudes[i];
      total += magnitudes[i];
    }
    return total === 0 ? 0 : weighted / total;
  }

  /** Zero crossing rate (per sample). */
  zeroCrossingRate(samples: number[]): number {
    if (samples.length < 2) return 0;
    let count = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i - 1] >= 0 && samples[i] < 0) || (samples[i - 1] < 0 && samples[i] >= 0))
        count++;
    }
    return count / (samples.length - 1);
  }

  /** Split signal into fixed-length frames (no overlap). Last frame may be shorter. */
  frameSegmentation(samples: number[], frameLength: number): number[][] {
    const frames: number[][] = [];
    for (let i = 0; i < samples.length; i += frameLength) {
      frames.push(samples.slice(i, i + frameLength));
    }
    return frames;
  }
}
