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
  /** Inclusive upper bound; null means unbounded (61+). */
  max: number | null;
  stage: StageId;
};

/** Five delinquency stages with labels, actions, and brand colors. */
export const STAGES: readonly StageDefinition[] = [
  {
    id: 1,
    label: '1–15 DPD',
    responsibleAction: 'Alejandro contacts the customer',
    color: '#8FBF8A',
  },
  {
    id: 2,
    label: '16–30 DPD',
    responsibleAction: 'Alejandro contacts the BM',
    color: '#F4B26E',
  },
  {
    id: 3,
    label: '31–45 DPD',
    responsibleAction: 'BM contacts the customer',
    color: '#E8923A',
  },
  {
    id: 4,
    label: '46–60 DPD',
    responsibleAction: 'ROM notified',
    color: '#E06A6A',
  },
  {
    id: 5,
    label: 'Over 61 DPD',
    responsibleAction: 'Collection review with Kathryn',
    color: '#C8412A',
  },
] as const;

/** Default stage windows: 0–15, 16–30, 31–45, 46–60, 61+. */
export const DEFAULT_STAGE_WINDOWS: readonly StageWindow[] = [
  { min: 0, max: 15, stage: 1 },
  { min: 16, max: 30, stage: 2 },
  { min: 31, max: 45, stage: 3 },
  { min: 46, max: 60, stage: 4 },
  { min: 61, max: null, stage: 5 },
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

export function getStage(stageId: StageId): StageDefinition {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) {
    throw new Error(`Unknown stage id: ${stageId}`);
  }
  return stage;
}
