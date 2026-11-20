import type { SnapshotPostBody, SnapshotRecord } from './types.js';

export interface SnapshotStore {
  getLatest(): Promise<SnapshotRecord | null>;
  save(input: SnapshotPostBody): Promise<SnapshotRecord>;
  clearLatest(): Promise<boolean>;
}

export function newSnapshotId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `snap-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function toRecord(input: SnapshotPostBody, id = newSnapshotId()): SnapshotRecord {
  const warnings = input.warnings ?? [];
  return {
    id,
    createdAt: new Date().toISOString(),
    cutoffDate: input.cutoffDate,
    stageMode: input.stageMode,
    filename: input.filename,
    uploadedAt: input.uploadedAt,
    warnings,
    payload: {
      accounts: input.accounts,
      uploads: input.uploads ?? [],
      snapshots: input.snapshots ?? [],
    },
  };
}

export function toLatestResponse(record: SnapshotRecord) {
  return {
    id: record.id,
    createdAt: record.createdAt,
    cutoffDate: record.cutoffDate,
    stageMode: record.stageMode,
    filename: record.filename,
    uploadedAt: record.uploadedAt,
    warnings: record.warnings,
    accounts: record.payload.accounts,
    uploads: record.payload.uploads,
    snapshots: record.payload.snapshots,
  };
}
