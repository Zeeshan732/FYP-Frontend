import { Injectable } from '@angular/core';

export interface SimulationInputs {
  mlRiskPercent: number;
  gaitScore: number;
  age: number;
  weightMl?: number;
  weightGait?: number;
  weightAge?: number;
}

export interface SimulationResult {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: { p5: number; p50: number; p95: number };
  iterations: number;
}

const DEFAULT_ITERATIONS = 1000;
const WEIGHT_ML = 0.7;
const WEIGHT_GAIT = 0.2;
const WEIGHT_AGE = 0.1;

/**
 * Monte Carlo and sensitivity simulation. No ML or backend calls.
 */
@Injectable({
  providedIn: 'root'
})
export class SimulationService {

  /** Logistic transform (same idea as backend). */
  private logistic(x: number, steepness: number = 0.08, midpoint: number = 50): number {
    return 100 / (1 + Math.exp(-steepness * (x - midpoint)));
  }

  /** Single adjusted risk from inputs (mirrors backend formula for UI). */
  computeAdjustedRisk(inputs: SimulationInputs): number {
    const wMl = inputs.weightMl ?? WEIGHT_ML;
    const wGait = inputs.weightGait ?? WEIGHT_GAIT;
    const wAge = inputs.weightAge ?? WEIGHT_AGE;
    const combined =
      wMl * Math.min(100, Math.max(0, inputs.mlRiskPercent)) +
      wGait * Math.min(100, Math.max(0, inputs.gaitScore)) +
      wAge * Math.min(100, Math.max(0, (inputs.age - 20) / 60 * 100));
    return Math.min(100, Math.max(0, this.logistic(combined)));
  }

  /** Monte Carlo: perturb inputs slightly each iteration and collect outputs. */
  runMonteCarlo(inputs: SimulationInputs, iterations: number = DEFAULT_ITERATIONS): SimulationResult {
    const results: number[] = [];
    const noise = 2; // small perturbation

    for (let i = 0; i < iterations; i++) {
      const perturbed: SimulationInputs = {
        ...inputs,
        mlRiskPercent: inputs.mlRiskPercent + (Math.random() - 0.5) * noise,
        gaitScore: inputs.gaitScore + (Math.random() - 0.5) * noise,
        age: Math.round(inputs.age + (Math.random() - 0.5) * 2)
      };
      results.push(this.computeAdjustedRisk(perturbed));
    }

    results.sort((a, b) => a - b);
    const sum = results.reduce((s, x) => s + x, 0);
    const mean = sum / results.length;
    const variance = results.reduce((s, x) => s + (x - mean) ** 2, 0) / results.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: Math.round(results[0] * 100) / 100,
      max: Math.round(results[results.length - 1] * 100) / 100,
      percentiles: {
        p5: Math.round(results[Math.floor(iterations * 0.05)] * 100) / 100,
        p50: Math.round(results[Math.floor(iterations * 0.5)] * 100) / 100,
        p95: Math.round(results[Math.floor(iterations * 0.95)] * 100) / 100
      },
      iterations
    };
  }

  /** Sensitivity: vary one input and return array of (inputValue, outputRisk). */
  sensitivityRecalculation(
    inputs: SimulationInputs,
    varying: 'mlRiskPercent' | 'gaitScore' | 'age',
    range: { min: number; max: number; steps: number }
  ): { inputValue: number; outputRisk: number }[] {
    const out: { inputValue: number; outputRisk: number }[] = [];
    const step = (range.max - range.min) / Math.max(1, range.steps - 1);
    for (let i = 0; i < range.steps; i++) {
      const val = range.min + i * step;
      const modified = { ...inputs, [varying]: val };
      out.push({ inputValue: Math.round(val * 100) / 100, outputRisk: Math.round(this.computeAdjustedRisk(modified) * 100) / 100 });
    }
    return out;
  }
}
