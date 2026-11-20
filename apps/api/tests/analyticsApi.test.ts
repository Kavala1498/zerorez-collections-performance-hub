import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Account, Snapshot, Upload } from '@zerorez/shared';
import { createApp } from '../src/app.js';
import { InMemoryAccountsRepository } from '../src/repositories/InMemoryAccountsRepository.js';

function account(
  partial: Partial<Account> &
    Pick<Account, 'id' | 'base' | 'segment' | 'client_name' | 'service_date' | 'amount_due'>,
): Account {
  return {
    paid_amount: 0,
    resolved_at: null,
    status: null,
    last_contacted: null,
    ...partial,
  };
}

function buildApp() {
  const repo = new InMemoryAccountsRepository();
  const upload: Upload = {
    id: 'up-1',
    filename: 'seed.xlsx',
    uploaded_at: '2026-11-18T12:00:00.000Z',
    uploaded_by: null,
    cutoff_date: '2026-11-18',
    stage_mode: 'date',
    rows_read: 4,
    rows_loaded: 4,
    warnings: [],
  };
  const snapshots: Snapshot[] = [
    {
      upload_id: 'up-1',
      cutoff_date: '2026-11-18',
      base: 'Dallas',
      segment: 'C',
      stage: 4,
      accounts: 1,
      amount: 4000,
    },
    {
      upload_id: 'up-1',
      cutoff_date: '2026-11-18',
      base: 'Dallas',
      segment: 'C',
      stage: 1,
      accounts: 1,
      amount: 1000,
    },
    {
      upload_id: 'up-1',
      cutoff_date: '2026-11-18',
      base: 'Phoenix',
      segment: 'R',
      stage: 2,
      accounts: 1,
      amount: 500,
    },
  ];
  repo.seed({
    uploads: [upload],
    snapshots,
    accounts: [
      account({
        id: 'Dallas|1',
        base: 'Dallas',
        segment: 'C',
        client_name: 'Big Co',
        service_date: '2026-09-29',
        amount_due: 4000,
        status: 'Escalated',
      }),
      account({
        id: 'Dallas|2',
        base: 'Dallas',
        segment: 'C',
        client_name: 'Small Co',
        service_date: '2026-11-03',
        amount_due: 1000,
      }),
      account({
        id: 'Phoenix|1',
        base: 'Phoenix',
        segment: 'R',
        client_name: 'Home Owner',
        service_date: '2026-10-29',
        amount_due: 500,
      }),
      account({
        id: 'BayArea|future',
        base: 'BayArea',
        segment: 'C',
        client_name: 'Not Due',
        service_date: '2026-12-01',
        amount_due: 100,
      }),
    ],
  });
  return { app: createApp({ repository: repo, corsOrigin: '*' }), repo };
}

describe('analytics API (in-memory)', () => {
  const { app } = buildApp();

  it('GET /api/dashboard returns KPIs, stages, bases, insights', async () => {
    const res = await request(app).get('/api/dashboard?segment=all');
    expect(res.status).toBe(200);
    expect(res.body.segment).toBe('all');
    expect(res.body.cutoffDate).toBe('2026-11-18');
    expect(res.body.kpis.overdueAmount).toBe(5500);
    expect(res.body.kpis.overdueAccounts).toBe(3);
    expect(res.body.stages).toHaveLength(5);
    expect(res.body.bases).toHaveLength(14);
    expect(res.body.insights.length).toBeGreaterThan(0);
    const dallas = res.body.bases.find((b: { id: string }) => b.id === 'Dallas');
    expect(dallas.severity).toBe('critical');
  });

  it('GET /api/dashboard?segment=C filters commercial', async () => {
    const res = await request(app).get('/api/dashboard').query({ segment: 'C' });
    expect(res.status).toBe(200);
    expect(res.body.kpis.overdueAmount).toBe(5000);
    expect(res.body.kpis.overdueAccounts).toBe(2);
  });

  it('GET /api/bases returns 14 bases with severity colors', async () => {
    const res = await request(app).get('/api/bases');
    expect(res.status).toBe(200);
    expect(res.body.bases).toHaveLength(14);
    const dallas = res.body.bases.find((b: { id: string }) => b.id === 'Dallas');
    expect(dallas.severityColor).toBe('#C8412A');
    const phoenix = res.body.bases.find((b: { id: string }) => b.id === 'Phoenix');
    expect(phoenix.severity).toBe('ok');
    expect(phoenix.severityColor).toBe('#8FBF8A');
  });

  it('GET /api/bases/:id/analytics returns base KPIs and ranking', async () => {
    const res = await request(app).get('/api/bases/Dallas/analytics');
    expect(res.status).toBe(200);
    expect(res.body.base.id).toBe('Dallas');
    expect(res.body.kpis.rank).toBe(1);
    expect(res.body.kpis.overdueAmount).toBe(5000);
    expect(res.body.ranking.length).toBe(14);
    expect(res.body.bySegment.C.overdueAccounts).toBe(2);
  });

  it('GET /api/bases/:id/accounts lists open accounts with stage', async () => {
    const res = await request(app).get('/api/bases/Dallas/accounts?segment=C');
    expect(res.status).toBe(200);
    expect(res.body.accounts).toHaveLength(2);
    expect(res.body.accounts[0].amount_due).toBeGreaterThanOrEqual(res.body.accounts[1].amount_due);
    expect(res.body.accounts[0].stage).toBeTruthy();
  });

  it('GET /api/trends returns snapshot evolution', async () => {
    const res = await request(app).get('/api/trends?segment=all');
    expect(res.status).toBe(200);
    expect(res.body.points).toHaveLength(1);
    expect(res.body.points[0].overdueAmount).toBe(5500);
    expect(res.body.points[0].stages).toHaveLength(5);
  });

  it('rejects invalid segment with unified error format', async () => {
    const res = await request(app).get('/api/dashboard?segment=X');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBeTruthy();
  });

  it('returns 404 for unknown base id', async () => {
    const res = await request(app).get('/api/bases/Richmond/analytics');
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Unknown base: Richmond',
    });
  });

  it('resolves base aliases in path params', async () => {
    const res = await request(app).get('/api/bases/DFW/analytics');
    expect(res.status).toBe(200);
    expect(res.body.base.id).toBe('Dallas');
  });
});
