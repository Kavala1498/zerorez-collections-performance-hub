import type { SnapshotPostBody, SnapshotRecord } from './types.js';
import { type SnapshotStore, toRecord } from './store.js';

/** Process-local store used when DATABASE_URL is unset (tests / local without Postgres). */
export class MemorySnapshotStore implements SnapshotStore {
  private records: SnapshotRecord[] = [];

  async getLatest(): Promise<SnapshotRecord | null> {
    if (this.records.length === 0) return null;
    return structuredClone(this.records[this.records.length - 1]!);
  }

  async save(input: SnapshotPostBody): Promise<SnapshotRecord> {
    const record = toRecord(input);
    this.records.push(record);
    return structuredClone(record);
  }

  async clearLatest(): Promise<boolean> {
    if (this.records.length === 0) return false;
    this.records = [];
    return true;
  }

  /** Test helper */
  seed(records: SnapshotRecord[]): void {
    this.records = structuredClone(records);
  }

  /** Test helper */
  all(): SnapshotRecord[] {
    return structuredClone(this.records);
  }
}

let singleton: MemorySnapshotStore | null = null;

export function getMemoryStore(): MemorySnapshotStore {
  if (!singleton) singleton = new MemorySnapshotStore();
  return singleton;
}

export function resetMemoryStore(): void {
  singleton = new MemorySnapshotStore();
}
