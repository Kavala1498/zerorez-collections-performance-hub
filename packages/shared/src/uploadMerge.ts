import { stageFromAgingLabel, stageFromDays, type StageId } from './stages.js';
import type { Account, Segment, Snapshot, StageMode } from './types.js';

/** CRM fields preserved when the Excel cell is empty on re-upload. */
export const CRM_PRESERVE_FIELDS = [
  'status',
  'next_action',
  'next_action_date',
  'acc_notes',
  'bm_notes',
] as const;

type CrmPreserveField = (typeof CRM_PRESERVE_FIELDS)[number];

function isEmpty(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.trim() === '');
}

export function daysBetween(serviceDate: string, cutoffDate: string): number {
  const service = Date.parse(serviceDate);
  const cutoff = Date.parse(cutoffDate);
  if (!Number.isFinite(service) || !Number.isFinite(cutoff)) return Number.NaN;
  return Math.floor((cutoff - service) / 86_400_000);
}

export function resolveAccountStage(
  account: Account,
  cutoffDate: string,
  stageMode: StageMode,
): StageId | null {
  if (stageMode === 'label') {
    return stageFromAgingLabel(account.aging_bucket);
  }
  const days = daysBetween(account.service_date, cutoffDate);
  return Number.isFinite(days) ? stageFromDays(days) : null;
}

/**
 * Merge incoming Excel accounts into the existing CRM set.
 * - Upsert by id
 * - Preserve CRM status / next_action / notes when Excel is empty
 * - Set resolved_at for previously open accounts missing from Excel
 * - Clear resolved_at when an account reappears
 */
export function mergeAccountsForUpload(params: {
  existing: Account[];
  incoming: Account[];
  uploadId: string;
  nowIso: string;
}): Account[] {
  const { existing, incoming, uploadId, nowIso } = params;
  const existingById = new Map(existing.map((a) => [a.id, a]));
  const incomingIds = new Set(incoming.map((a) => a.id));
  const result: Account[] = [];

  for (const row of incoming) {
    const prev = existingById.get(row.id);
    const merged: Account = { ...row };

    if (prev) {
      for (const field of CRM_PRESERVE_FIELDS) {
        if (isEmpty(merged[field as CrmPreserveField])) {
          merged[field] = prev[field] ?? null;
        }
      }
      merged.first_seen = prev.first_seen ?? nowIso;
    } else {
      merged.first_seen = nowIso;
    }

    merged.last_seen = nowIso;
    merged.upload_id = uploadId;
    merged.resolved_at = null;
    result.push(merged);
  }

  // Accounts not in this Excel: mark newly missing as resolved; keep prior resolved.
  for (const prev of existing) {
    if (incomingIds.has(prev.id)) continue;
    if (prev.resolved_at) {
      result.push({ ...prev });
      continue;
    }
    result.push({
      ...prev,
      resolved_at: nowIso,
    });
  }

  return result;
}

/**
 * Build snapshot rows for one upload: base × segment × stage (1–5).
 * Only open (unresolved) overdue accounts are counted; amount uses gross amount_due.
 */
export function buildSnapshotsForUpload(params: {
  accounts: Account[];
  uploadId: string;
  cutoffDate: string;
  stageMode?: StageMode;
}): Snapshot[] {
  const { accounts, uploadId, cutoffDate, stageMode = 'date' } = params;
  type Agg = { accounts: number; amount: number };
  const buckets = new Map<string, Agg>();

  for (const account of accounts) {
    if (account.resolved_at) continue;
    const stage = resolveAccountStage(account, cutoffDate, stageMode);
    if (stage == null) continue;

    const key = `${account.base}|${account.segment}|${stage}`;
    const agg = buckets.get(key) ?? { accounts: 0, amount: 0 };
    agg.accounts += 1;
    agg.amount += account.amount_due;
    buckets.set(key, agg);
  }

  const snapshots: Snapshot[] = [];
  for (const [key, agg] of buckets) {
    const [base, segment, stageStr] = key.split('|');
    if (!base || !segment || !stageStr) continue;
    snapshots.push({
      upload_id: uploadId,
      cutoff_date: cutoffDate,
      base,
      segment: segment as Segment,
      stage: Number(stageStr) as StageId,
      accounts: agg.accounts,
      amount: Math.round(agg.amount * 100) / 100,
    });
  }

  snapshots.sort((a, b) => {
    const baseCmp = a.base.localeCompare(b.base);
    if (baseCmp !== 0) return baseCmp;
    const segCmp = a.segment.localeCompare(b.segment);
    if (segCmp !== 0) return segCmp;
    return a.stage - b.stage;
  });

  return snapshots;
}
