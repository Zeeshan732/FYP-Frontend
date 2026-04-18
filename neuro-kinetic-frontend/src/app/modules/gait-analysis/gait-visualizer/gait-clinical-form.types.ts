/** Clinical gait parameters — shared by manual UI, CSV import, and model vector builder. */
export interface ClinicalGaitForm {
  gaitVelocity: number;
  strideLength: number;
  cadence: number;
  stepTimeVariability: number;
  forceAsymmetry: number;
  balanceScore: number;
  walkingSpeed: number;
  stepLengthDifference: number;
}
