import type { Account, AccountChange, Snapshot, Upload } from '@zerorez/shared';

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

export type PersistAccountPatchPayload = {
  /** Full updated account row. */
  account: Account;
  /** Audit entries for this patch (appended). */
  changes: AccountChange[];
};

/**
 * Persistence boundary for accounts / uploads / snapshots.
 * Controllers and services never talk to Google Sheets directly.
 */
export interface AccountsRepository {
  listAccounts(): Promise<Account[]>;
  listUploads(): Promise<Upload[]>;
  listSnapshots(): Promise<Snapshot[]>;
  listAccountChanges(accountId?: string): Promise<AccountChange[]>;
  /** Atomically replace accounts, append upload + snapshots, invalidate cache. */
  persistUpload(payload: PersistUploadPayload): Promise<void>;
  /** Update one account and append change-log rows. */
  persistAccountPatch(payload: PersistAccountPatchPayload): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  invalidateCache(): void;
}
