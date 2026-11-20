import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Account, Snapshot, Upload } from '@zerorez/shared';
import { createApp } from '../src/app.js';
import { InMemoryAccountsRepository } from '../src/repositories/InMemoryAccountsRepository.js';
import { AnalyticsService } from '../src/services/AnalyticsService.js';

function account(
  partial: Partial<Account> &
    Pick<Account, 'id' | 'base' | 'segment' | 'client_name' | 'service_date' | 'amount_due'>,
): Account {
  return {
    paid_amount: 0,
    resolved_at: null,
    status: null,
    ...partial,
  };
}

function twoUploads(): Upload[] {
  return [
    {
      id: 'up-old',
      filename: 'old.xlsx',
      uploaded_at: '2026-10-01T00:00:00.000Z',
      uploaded_by: null,
      cutoff_date: '2026-10-01',
      stage_mode: 'date',
      rows_read: 2,
      rows_loaded: 2,
      warnings: [],
    },
    {
      id: 'up-new',
      filename: 'new.xlsx',
      uploaded_at: '2026-11-18T00:00:00.000Z',
      uploaded_by: null,
      cutoff_date: '2026-11-18',
      stage_mode: 'date',
      rows_read: 2,
      rows_loaded: 2,
      warnings: [],
    },
  ];
}

describe('critical stage alerts (Phase 7)', () => {
  it('flags accounts that newly entered stage 4 or 5 between uploads', async () => {
    // service 2026-09-29:
    //   cutoff 2026-10-01 → 2 days → stage 1
    //   cutoff 2026-11-18 → 50 days → stage 4 (new critical → alert)
    // service 2026-08-01:
    //   both cutoffs → stage 5 (already critical) → no alert
    // service 2026-09-20 with earlier first cutoff where not yet overdue:
    //   cutoff 2026-09-15 → negative → null; later → stage 4
    const repo = new InMemoryAccountsRepository();
    repo.seed({
      uploads: [
        {
          id: 'up-old',
          filename: 'old.xlsx',
          uploaded_at: '2026-09-15T00:00:00.000Z',
          uploaded_by: null,
          cutoff_date: '2026-09-15',
          stage_mode: 'date',
          rows_read: 3,
          rows_loaded: 3,
          warnings: [],
        },
        {
          id: 'up-new',
          filename: 'new.xlsx',
          uploaded_at: '2026-11-18T00:00:00.000Z',
          uploaded_by: null,
          cutoff_date: '2026-11-18',
          stage_mode: 'date',
          rows_read: 3,
          rows_loaded: 3,
          warnings: [],
        },
      ],
      accounts: [
        account({
          id: 'Dallas|new-critical',
          base: 'Dallas',
          segment: 'C',
          client_name: 'Entered Critical',
          service_date: '2026-09-29',
          amount_due: 4000,
          status: 'Escalated',
        }),
        account({
          id: 'Phoenix|already',
          base: 'Phoenix',
          segment: 'C',
          client_name: 'Already Critical',
          service_date: '2026-07-01',
          amount_due: 9000,
        }),
        account({
          id: 'Dallas|still-ok',
          base: 'Dallas',
          segment: 'R',
          client_name: 'Still Early',
          service_date: '2026-11-10',
          amount_due: 200,
        }),
      ],
    });

    const service = new AnalyticsService(repo);
    const result = await service.getCriticalStageAlerts('all');
    expect(result.previousCutoffDate).toBe('2026-09-15');
    expect(result.currentCutoffDate).toBe('2026-11-18');
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]?.accountId).toBe('Dallas|new-critical');
    expect(result.alerts[0]?.previousStage).toBeNull();
    expect(result.alerts[0]?.currentStage).toBe(4);
  });

  it('GET /api/alerts returns the same payload', async () => {
    const repo = new InMemoryAccountsRepository();
    repo.seed({
      uploads: twoUploads(),
      accounts: [
        account({
          id: 'Dallas|new-critical',
          base: 'Dallas',
          segment: 'C',
          client_name: 'Entered Critical',
          service_date: '2026-09-29',
          amount_due: 4000,
        }),
      ],
    });
    const app = createApp({ repository: repo, corsOrigin: '*' });
    const res = await request(app).get('/api/alerts?segment=C');
    expect(res.status).toBe(200);
    expect(res.body.alerts).toHaveLength(1);
    expect(res.body.alerts[0].base).toBe('Dallas');
  });

  it('filters base trends from snapshots', async () => {
    const repo = new InMemoryAccountsRepository();
    const snapshots: Snapshot[] = [
      {
        upload_id: 'up-old',
        cutoff_date: '2026-10-01',
        base: 'Dallas',
        segment: 'C',
        stage: 1,
        accounts: 2,
        amount: 100,
      },
      {
        upload_id: 'up-new',
        cutoff_date: '2026-11-18',
        base: 'Dallas',
        segment: 'C',
        stage: 4,
        accounts: 1,
        amount: 4000,
      },
      {
        upload_id: 'up-new',
        cutoff_date: '2026-11-18',
        base: 'Phoenix',
        segment: 'C',
        stage: 2,
        accounts: 3,
        amount: 500,
      },
    ];
    repo.seed({ uploads: twoUploads(), snapshots, accounts: [] });
    const app = createApp({ repository: repo, corsOrigin: '*' });

    const res = await request(app).get('/api/bases/Dallas/trends?segment=all');
    expect(res.status).toBe(200);
    expect(res.body.base.id).toBe('Dallas');
    expect(res.body.points).toHaveLength(2);
    expect(res.body.points[1].overdueAmount).toBe(4000);

    const filtered = await request(app).get('/api/trends?segment=all&base=Phoenix');
    expect(filtered.status).toBe(200);
    expect(filtered.body.points).toHaveLength(1);
    expect(filtered.body.points[0].overdueAmount).toBe(500);
  });

  it('returns empty alerts when fewer than two uploads exist', async () => {
    const repo = new InMemoryAccountsRepository();
    repo.seed({
      uploads: [twoUploads()[0]!],
      accounts: [
        account({
          id: 'Dallas|x',
          base: 'Dallas',
          segment: 'C',
          client_name: 'X',
          service_date: '2026-01-01',
          amount_due: 1,
        }),
      ],
    });
    const service = new AnalyticsService(repo);
    const result = await service.getCriticalStageAlerts('all');
    expect(result.alerts).toEqual([]);
  });
});
