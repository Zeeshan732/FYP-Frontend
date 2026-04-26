/**
 * Live record flow: weak extraction → show error (no override). Strong extraction → apply liveRecordOverride.
 * Voice model has 22 features; we require a strong majority before override.
 */
export const MIN_VOICE_NUMERIC_FEATURE_KEYS = 18;

/** Strong enough to allow live-record override UI. */
export function hasSufficientVoiceFeaturesJson(
  voiceFeaturesJson: string | null | undefined
): boolean {
  if (!voiceFeaturesJson || !String(voiceFeaturesJson).trim()) {
    return false;
  }
  try {
    const o = JSON.parse(voiceFeaturesJson) as Record<string, unknown>;
    if (!o || typeof o !== 'object' || Array.isArray(o)) {
      return false;
    }
    let n = 0;
    for (const v of Object.values(o)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        n++;
      } else if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) {
        n++;
      }
    }
    return n >= MIN_VOICE_NUMERIC_FEATURE_KEYS;
  } catch {
    return false;
  }
}

/** True → block override and show “weak extraction” error. */
export function isWeakVoiceExtractionForLiveRecord(
  voiceFeaturesJson: string | null | undefined
): boolean {
  return !hasSufficientVoiceFeaturesJson(voiceFeaturesJson);
}
