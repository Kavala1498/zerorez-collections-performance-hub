import { describe, expect, it } from 'vitest';
import type { Account } from '@zerorez/shared';
import {
  buildSnapshotsForUpload,
  mergeAccountsForUpload,
} from '../src/services/uploadMerge.js';

function account(partial: Partial<Account> & Pick<Account, 'id' | 'base'>): Account {
  return {
    segment: 'C',
    client_name: 'Test Client',
    service_date: '2026-10-01',
    amount_due: 100,
    paid_amount: 0,
    ...partial,
  };
}

describe('mergeAccountsForUpload', () => {
  it('preserves CRM status/next_action/notes when Excel fields are empty', () => {
    const existing = [
      account({
        id: 'Dallas|INV-1',
        base: 'Dallas',
        status: 'P2P',
        next_action: 'Call AP',
        next_action_date: '2026-11-20',
        acc_notes: 'CRM note',
        bm_notes: 'BM note',
        first_seen: '2026-11-01T00:00:00.000Z',
        upload_id: 'old',
      }),
    ];
    const incoming = [
      account({
        id: 'Dallas|INV-1',
        base: 'Dallas',
        amount_due: 250,
        status: null,
        next_action: null,
        next_action_date: null,
        acc_notes: '',
        bm_notes: undefined,
      }),
    ];

    const merged = mergeAccountsForUpload({
      existing,
      incoming,
      uploadId: 'new-upload',
      nowIso: '2026-11-19T12:00:00.000Z',
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      id: 'Dallas|INV-1',
      amount_due: 250,
      status: 'P2P',
      next_action: 'Call AP',
      next_action_date: '2026-11-20',
      acc_notes: 'CRM note',
      bm_notes: 'BM note',
      first_seen: '2026-11-01T00:00:00.000Z',
      last_seen: '2026-11-19T12:00:00.000Z',
      upload_id: 'new-upload',
      resolved_at: null,
    });
  });

  it('sets resolved_at for open accounts missing from Excel', () => {
    const existing = [
      account({ id: 'Dallas|KEEP', base: 'Dallas' }),
      account({ id: 'Phoenix|GONE', base: 'Phoenix', status: 'Escalated' }),
      account({
        id: 'Tulsa|OLD',
        base: 'Tulsa',
        resolved_at: '2026-10-01T00:00:00.000Z',
      }),
    ];
    const incoming = [account({ id: 'Dallas|KEEP', base: 'Dallas', amount_due: 50 })];

    const merged = mergeAccountsForUpload({
      existing,
      incoming,
      uploadId: 'u2',
      nowIso: '2026-11-19T15:00:00.000Z',
    });

    const byId = Object.fromEntries(merged.map((a) => [a.id, a]));
    expect(byId['Dallas|KEEP']?.resolved_at).toBeNull();
    expect(byId['Phoenix|GONE']?.resolved_at).toBe('2026-11-19T15:00:00.000Z');
    expect(byId['Tulsa|OLD']?.resolved_at).toBe('2026-10-01T00:00:00.000Z');
  });

  it('clears resolved_at when a previously resolved account returns', () => {
    const existing = [
      account({
        id: 'Dallas|BACK',
        base: 'Dallas',
        resolved_at: '2026-10-01T00:00:00.000Z',
        first_seen: '2026-09-01T00:00:00.000Z',
      }),
    ];
    const incoming = [account({ id: 'Dallas|BACK', base: 'Dallas', amount_due: 10 })];

    const [merged] = mergeAccountsForUpload({
      existing,
      incoming,
      uploadId: 'u3',
      nowIso: '2026-11-19T15:00:00.000Z',
    });

    expect(merged?.resolved_at).toBeNull();
    expect(merged?.first_seen).toBe('2026-09-01T00:00:00.000Z');
  });
});

describe('buildSnapshotsForUpload', () => {
  it('aggregates open overdue accounts by base × segment × stage', () => {
    const accounts: Account[] = [
      account({
        id: 'Dallas|A',
        base: 'Dallas',
        segment: 'C',
        service_date: '2026-11-10', // 8 DPD → stage 1
        amount_due: 100,
      }),
      account({
        id: 'Dallas|B',
        base: 'Dallas',
        segment: 'C',
        service_date: '2026-11-05', // 13 DPD → stage 1
        amount_due: 50,
      }),
      account({
        id: 'Dallas|C',
        base: 'Dallas',
        segment: 'R',
        service_date: '2026-09-01', // 78 DPD → stage 5
        amount_due: 20,
      }),
      account({
        id: 'Phoenix|D',
        base: 'Phoenix',
        segment: 'C',
        service_date: '2026-11-20', // future / not overdue
        amount_due: 999,
      }),
      account({
        id: 'Dallas|E',
        base: 'Dallas',
        segment: 'C',
        service_date: '2026-10-01',
        amount_due: 40,
        resolved_at: '2026-11-01T00:00:00.000Z',
      }),
    ];

    const snapshots = buildSnapshotsForUpload({
      accounts,
      uploadId: 'snap-1',
      cutoffDate: '2026-11-18',
    });

    expect(snapshots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          upload_id: 'snap-1',
          base: 'Dallas',
          segment: 'C',
          stage: 1,
          accounts: 2,
          amount: 150,
        }),
        expect.objectContaining({
          base: 'Dallas',
          segment: 'R',
          stage: 5,
          accounts: 1,
          amount: 20,
        }),
      ]),
    );
    expect(snapshots.some((s) => s.base === 'Phoenix')).toBe(false);
    expect(snapshots).toHaveLength(2);
  });
});
