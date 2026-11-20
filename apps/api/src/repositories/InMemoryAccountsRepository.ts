import type { Account, Snapshot, Upload } from '@zerorez/shared';
import type {
  AccountsRepository,
  HealthStatus,
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
  private readonly accountsCache: TtlCache<Account[]>;
  private readonly uploadsCache: TtlCache<Upload[]>;

  constructor(ttlMs = 60_000) {
    this.accountsCache = new TtlCache(ttlMs);
    this.uploadsCache = new TtlCache(ttlMs);
  }

  /** Seed helpers for tests. */
  seed(data: { accounts?: Account[]; uploads?: Upload[]; snapshots?: Snapshot[] }): void {
    if (data.accounts) this.accounts = structuredClone(data.accounts);
    if (data.uploads) this.uploads = structuredClone(data.uploads);
    if (data.snapshots) this.snapshots = structuredClone(data.snapshots);
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

  async persistUpload(payload: PersistUploadPayload): Promise<void> {
    this.accounts = structuredClone(payload.accounts);
    this.uploads = [...this.uploads, structuredClone(payload.upload)];
    this.snapshots = [...this.snapshots, ...structuredClone(payload.snapshots)];
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
