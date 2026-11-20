import type { Account, AccountChange, Snapshot, Upload } from '@zerorez/shared';
import type {
  AccountsRepository,
  HealthStatus,
  PersistAccountPatchPayload,
  PersistUploadPayload,
} from './AccountsRepository.js';
import { TtlCache } from './ttlCache.js';

/**
 * In-memory repository for unit/integration tests — no Google credentials.
 */
export class InMemoryAccountsRepository implements AccountsRepository {
  private accounts: Account[] = [];
  private uploads: Upload[] = [];
  private snapshots: Snapshot[] = [];
  private accountChanges: AccountChange[] = [];
  private readonly accountsCache: TtlCache<Account[]>;
  private readonly uploadsCache: TtlCache<Upload[]>;

  constructor(ttlMs = 60_000) {
    this.accountsCache = new TtlCache(ttlMs);
    this.uploadsCache = new TtlCache(ttlMs);
  }

  /** Seed helpers for tests. */
  seed(data: {
    accounts?: Account[];
    uploads?: Upload[];
    snapshots?: Snapshot[];
    accountChanges?: AccountChange[];
  }): void {
    if (data.accounts) this.accounts = structuredClone(data.accounts);
    if (data.uploads) this.uploads = structuredClone(data.uploads);
    if (data.snapshots) this.snapshots = structuredClone(data.snapshots);
    if (data.accountChanges) this.accountChanges = structuredClone(data.accountChanges);
    this.invalidateCache();
  }

  async listAccounts(): Promise<Account[]> {
    const cached = this.accountsCache.get();
    if (cached) return structuredClone(cached);
    const copy = structuredClone(this.accounts);
    this.accountsCache.set(copy);
    return structuredClone(copy);
  }

  async listUploads(): Promise<Upload[]> {
    const cached = this.uploadsCache.get();
    if (cached) return structuredClone(cached);
    const copy = structuredClone(this.uploads);
    this.uploadsCache.set(copy);
    return structuredClone(copy);
  }

  async listSnapshots(): Promise<Snapshot[]> {
    return structuredClone(this.snapshots);
  }

  async listAccountChanges(accountId?: string): Promise<AccountChange[]> {
    const rows = structuredClone(this.accountChanges);
    if (!accountId) return rows;
    return rows.filter((c) => c.account_id === accountId);
  }

  async persistUpload(payload: PersistUploadPayload): Promise<void> {
    this.accounts = structuredClone(payload.accounts);
    this.uploads = [...this.uploads, structuredClone(payload.upload)];
    this.snapshots = [...this.snapshots, ...structuredClone(payload.snapshots)];
    this.invalidateCache();
  }

  async persistAccountPatch(payload: PersistAccountPatchPayload): Promise<void> {
    const idx = this.accounts.findIndex((a) => a.id === payload.account.id);
    if (idx < 0) {
      this.accounts = [...this.accounts, structuredClone(payload.account)];
    } else {
      const next = [...this.accounts];
      next[idx] = structuredClone(payload.account);
      this.accounts = next;
    }
    this.accountChanges = [
      ...this.accountChanges,
      ...structuredClone(payload.changes),
    ];
    this.invalidateCache();
  }

  async healthCheck(): Promise<HealthStatus> {
    return { ok: true, repository: 'memory', message: 'In-memory repository ready' };
  }

  invalidateCache(): void {
    this.accountsCache.invalidate();
    this.uploadsCache.invalidate();
  }
}
