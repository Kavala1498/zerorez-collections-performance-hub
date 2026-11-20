export type StageId = 1 | 2 | 3 | 4 | 5;

export type StageDefinition = {
  id: StageId;
  label: string;
  responsibleAction: string;
  color: string;
};

export type StageWindow = {
  /** Inclusive lower bound of days past due. */
  min: number;
  /** Inclusive upper bound; null means unbounded (64+). */
  max: number | null;
  stage: StageId;
};

/** Five delinquency stages with labels, actions, and brand colors. */
export const STAGES: readonly StageDefinition[] = [
  {
    id: 1,
    label: '0–14 DPD',
    responsibleAction: 'Alejandro contacts the customer',
    color: '#8FBF8A',
  },
  {
    id: 2,
    label: '15–29 DPD',
    responsibleAction: 'Alejandro contacts the BM',
    color: '#F4B26E',
  },
  {
    id: 3,
    label: '30–48 DPD',
    responsibleAction: 'BM contacts the customer',
    color: '#E8923A',
  },
  {
    id: 4,
    label: '49–63 DPD',
    responsibleAction: 'ROM notified',
    color: '#E06A6A',
  },
  {
    id: 5,
    label: 'Over 63 DPD',
    responsibleAction: 'Collection review with Kathryn',
    color: '#C8412A',
  },
] as const;

/** Default stage windows: 0–14, 15–29, 30–48, 49–63, 64+. */
export const DEFAULT_STAGE_WINDOWS: readonly StageWindow[] = [
  { min: 0, max: 14, stage: 1 },
  { min: 15, max: 29, stage: 2 },
  { min: 30, max: 48, stage: 3 },
  { min: 49, max: 63, stage: 4 },
  { min: 64, max: null, stage: 5 },
] as const;

/**
 * Map days past due to a stage id.
 * Negative days → not overdue (null). Windows are inclusive on both ends.
 */
export function stageFromDays(
  days: number,
  windows: readonly StageWindow[] = DEFAULT_STAGE_WINDOWS,
): StageId | null {
  if (!Number.isFinite(days) || days < 0) {
    return null;
  }
  for (const window of windows) {
    const withinMax = window.max === null || days <= window.max;
    if (days >= window.min && withinMax) {
      return window.stage;
    }
  }
  return null;
}

/**
 * Map an Excel "Aging bucket" label to a stage id.
 * Supports the product windows (0–14 … 64+) and common legacy phrasing.
 */
export function stageFromAgingLabel(raw: string | null | undefined): StageId | null {
  const s = String(raw ?? '').toLowerCase();
  if (!s.trim()) return null;

  if (
    s.includes('over 63') ||
    s.includes('64+') ||
    s.includes('over 60') ||
    s.includes('61+') ||
    s.includes('over 61')
  ) {
    return 5;
  }
  if (
    s.includes('49 to 63') ||
    s.includes('49-63') ||
    s.includes('49 – 63') ||
    s.includes('46 to 60') ||
    s.includes('46-60')
  ) {
    return 4;
  }
  if (
    s.includes('30 to 48') ||
    s.includes('30-48') ||
    s.includes('31 to 45') ||
    s.includes('31-45')
  ) {
    return 3;
  }
  if (
    s.includes('15 to 29') ||
    s.includes('15-29') ||
    s.includes('16 to 30') ||
    s.includes('16-30')
  ) {
    return 2;
  }
  if (
    s.includes('0 to 14') ||
    s.includes('0-14') ||
    s.includes('to 14') ||
    s.includes('1 to 15') ||
    s.includes('to 15')
  ) {
    return 1;
  }
  return null;
}

export function getStage(stageId: StageId): StageDefinition {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) {
    throw new Error(`Unknown stage id: ${stageId}`);
  }
  return stage;
}
