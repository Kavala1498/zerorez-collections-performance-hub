import type { Account, Snapshot, Upload } from '@zerorez/shared';

export type HealthStatus = {
  ok: boolean;
  repository: 'memory' | 'sheets';
  spreadsheetId?: string;
  message?: string;
};

export type PersistUploadPayload = {
  /** Full accounts sheet after merge (including resolved). */
  accounts: Account[];
  upload: Upload;
  /** Snapshot rows for this upload only (appended). */
  snapshots: Snapshot[];
};

/**
 * Persistence boundary for accounts / uploads / snapshots.
 * Controllers and services never talk to Google Sheets directly.
 */
export interface AccountsRepository {
  listAccounts(): Promise<Account[]>;
  listUploads(): Promise<Upload[]>;
  listSnapshots(): Promise<Snapshot[]>;
  /** Atomically replace accounts, append upload + snapshots, invalidate cache. */
  persistUpload(payload: PersistUploadPayload): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  invalidateCache(): void;
}
