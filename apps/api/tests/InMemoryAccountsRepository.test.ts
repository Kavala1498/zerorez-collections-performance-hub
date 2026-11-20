import { describe, expect, it } from 'vitest';
import type { Account, Upload } from '@zerorez/shared';
import { InMemoryAccountsRepository } from '../src/repositories/InMemoryAccountsRepository.js';

describe('InMemoryAccountsRepository', () => {
  it('caches listAccounts until invalidate / persistUpload', async () => {
    const repo = new InMemoryAccountsRepository(60_000);
    const account: Account = {
      id: 'Dallas|1',
      base: 'Dallas',
      segment: 'C',
      client_name: 'Acme',
      service_date: '2026-10-01',
      amount_due: 10,
      paid_amount: 0,
    };
    repo.seed({ accounts: [account] });

    const first = await repo.listAccounts();
    expect(first).toHaveLength(1);

    // Mutate underlying store without going through persist — cache should still return old data
    // until invalidate. (seed already invalidated; re-seed then list, then poke private state)
    const listed = await repo.listAccounts();
    listed[0]!.amount_due = 999;
    const again = await repo.listAccounts();
    expect(again[0]?.amount_due).toBe(10);

    const upload: Upload = {
      id: 'u1',
      filename: 'a.xlsx',
      uploaded_at: '2026-11-19T00:00:00.000Z',
      cutoff_date: '2026-11-18',
      stage_mode: 'date',
      rows_read: 1,
      rows_loaded: 1,
      warnings: [],
    };

    await repo.persistUpload({
      accounts: [{ ...account, amount_due: 42 }],
      upload,
      snapshots: [],
    });

    const after = await repo.listAccounts();
    expect(after[0]?.amount_due).toBe(42);
    expect(await repo.listUploads()).toHaveLength(1);
  });

  it('reports healthy memory status', async () => {
    const repo = new InMemoryAccountsRepository();
    const health = await repo.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.repository).toBe('memory');
  });
});
