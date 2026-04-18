import type { ClinicalGaitForm } from './gait-clinical-form.types';

/** Expected header names (snake_case). */
export const GAIT_CSV_REQUIRED_COLUMNS = [
  'gait_velocity',
  'stride_length',
  'cadence',
  'step_time_variability',
  'force_asymmetry',
  'balance_score',
  'walking_speed',
  'step_length_difference'
] as const;

const MAX_CSV_BYTES = 256 * 1024; // 256 KB — plenty for a few numeric rows

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/** Minimal CSV split: commas, respects simple quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === ',') {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function parseNumber(raw: string, column: string): number {
  const t = raw.trim();
  if (t === '') {
    throw new Error(`Column "${column}" is empty.`);
  }
  const n = Number(t);
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    throw new Error(`Column "${column}" must be a valid number (got "${raw.trim()}").`);
  }
  return n;
}

export type GaitCsvParseResult =
  | { ok: true; values: ClinicalGaitForm; headerLine: string }
  | { ok: false; errors: string[] };

/**
 * Parse gait CSV: header row + at least one data row. Uses first data row only.
 * Does not persist files — text only.
 */
export function parseGaitCsvText(content: string): GaitCsvParseResult {
  const errors: string[] = [];

  if (!content || !content.trim()) {
    return { ok: false, errors: ['The file is empty.'] };
  }

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      ok: false,
      errors: [
        'CSV must include a header row and at least one data row.'
      ]
    };
  }

  const headerCells = splitCsvLine(lines[0]).map(normalizeHeader);
  const dataCells = splitCsvLine(lines[1]);

  const headerSet = new Set(headerCells.filter(Boolean));
  const missing: string[] = [];
  for (const req of GAIT_CSV_REQUIRED_COLUMNS) {
    if (!headerSet.has(req)) {
      missing.push(req);
    }
  }
  if (missing.length) {
    return {
      ok: false,
      errors: [
        `Missing required column(s): ${missing.join(', ')}.`,
        `Expected columns: ${GAIT_CSV_REQUIRED_COLUMNS.join(', ')}.`
      ]
    };
  }

  const colIndex = new Map<string, number>();
  headerCells.forEach((h, i) => {
    if (h) colIndex.set(h, i);
  });

  if (dataCells.length < headerCells.length) {
    errors.push(
      'The first data row has fewer values than columns. Check for missing commas or extra line breaks.'
    );
  }

  const getCell = (name: (typeof GAIT_CSV_REQUIRED_COLUMNS)[number]): string => {
    const i = colIndex.get(name);
    if (i === undefined) return '';
    return dataCells[i] ?? '';
  };

  try {
    const gaitVelocity = parseNumber(getCell('gait_velocity'), 'gait_velocity');
    const strideLength = parseNumber(getCell('stride_length'), 'stride_length');
    const cadence = parseNumber(getCell('cadence'), 'cadence');
    const stepTimeVariability = parseNumber(getCell('step_time_variability'), 'step_time_variability');
    const forceAsymmetry = parseNumber(getCell('force_asymmetry'), 'force_asymmetry');
    const balanceScore = parseNumber(getCell('balance_score'), 'balance_score');
    const walkingSpeed = parseNumber(getCell('walking_speed'), 'walking_speed');
    const stepLengthDifference = parseNumber(getCell('step_length_difference'), 'step_length_difference');

    const values: ClinicalGaitForm = {
      gaitVelocity,
      strideLength,
      cadence,
      stepTimeVariability,
      forceAsymmetry,
      balanceScore,
      walkingSpeed,
      stepLengthDifference
    };

    if (errors.length) {
      return { ok: false, errors };
    }

    return { ok: true, values, headerLine: lines[0] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, errors: [...errors, msg].filter(Boolean) };
  }
}

export function validateGaitCsvFile(file: File | null): string | null {
  if (!file) return 'No file selected.';
  const name = file.name.toLowerCase();
  if (!name.endsWith('.csv')) {
    return 'Only .csv files are accepted.';
  }
  if (file.size > MAX_CSV_BYTES) {
    return `File is too large (max ${MAX_CSV_BYTES / 1024} KB).`;
  }
  if (file.size === 0) {
    return 'The file is empty.';
  }
  return null;
}

export { MAX_CSV_BYTES };
