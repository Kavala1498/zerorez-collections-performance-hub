import { describe, expect, it } from 'vitest';
import type { Account, Snapshot, Upload } from '@zerorez/shared';
import { InMemoryAccountsRepository } from '../src/repositories/InMemoryAccountsRepository.js';
import {
  AnalyticsService,
  SEVERITY_COLORS,
  daysBetween,
  severityFromCriticalShare,
} from '../src/services/AnalyticsService.js';

function account(partial: Partial<Account> & Pick<Account, 'id' | 'base' | 'segment' | 'client_name' | 'service_date' | 'amount_due'>): Account {
  return {
    paid_amount: 0,
    resolved_at: null,
    status: null,
    last_contacted: null,
    ...partial,
  };
}

function seedRepo(opts?: {
  accounts?: Account[];
  uploads?: Upload[];
  snapshots?: Snapshot[];
}): InMemoryAccountsRepository {
  const repo = new InMemoryAccountsRepository();
  repo.seed({
    accounts: opts?.accounts ?? [],
    uploads: opts?.uploads ?? [
      {
        id: 'up-1',
        filename: 'seed.xlsx',
        uploaded_at: '2026-11-18T12:00:00.000Z',
        uploaded_by: null,
        cutoff_date: '2026-11-18',
        stage_mode: 'date',
        rows_read: 3,
        rows_loaded: 3,
        warnings: [],
      },
    ],
    snapshots: opts?.snapshots ?? [],
  });
  return repo;
}

describe('severityFromCriticalShare', () => {
  it('maps critical / warning / ok thresholds', () => {
    expect(severityFromCriticalShare(0.51)).toBe('critical');
    expect(severityFromCriticalShare(0.5)).toBe('warning');
    expect(severityFromCriticalShare(0.21)).toBe('warning');
    expect(severityFromCriticalShare(0.2)).toBe('ok');
    expect(severityFromCriticalShare(0)).toBe('ok');
    expect(SEVERITY_COLORS.critical).toBe('#C8412A');
    expect(SEVERITY_COLORS.warning).toBe('#E8923A');
    expect(SEVERITY_COLORS.ok).toBe('#8FBF8A');
  });
});

describe('daysBetween', () => {
  it('computes inclusive calendar day difference', () => {
    expect(daysBetween('2026-11-03', '2026-11-18')).toBe(15);
    expect(daysBetween('2026-11-19', '2026-11-18')).toBe(-1);
  });
});

describe('AnalyticsService', () => {
  it('computes dashboard KPIs, stages, severity, and insights', async () => {
    // cutoff 2026-11-18
    // Dallas C: 15 DPD → stage 1 ($1000); 50 DPD → stage 4 ($4000) → critical share 80%
    // Phoenix R: 20 DPD → stage 2 ($500)
    const repo = seedRepo({
      accounts: [
        account({
          id: 'Dallas|1',
          base: 'Dallas',
          segment: 'C',
          client_name: 'Big Co',
          service_date: '2026-09-29', // 50 days
          amount_due: 4000,
          status: 'Escalated',
        }),
        account({
          id: 'Dallas|2',
          base: 'Dallas',
          segment: 'C',
          client_name: 'Small Co',
          service_date: '2026-11-03', // 15 days
          amount_due: 1000,
        }),
        account({
          id: 'Phoenix|1',
          base: 'Phoenix',
          segment: 'R',
          client_name: 'Home Owner',
          service_date: '2026-10-29', // 20 days
          amount_due: 500,
          paid_amount: 50,
        }),
        account({
          id: 'Tulsa|gone',
          base: 'Tulsa',
          segment: 'C',
          client_name: 'Resolved',
          service_date: '2026-01-01',
          amount_due: 9999,
          resolved_at: '2026-11-01T00:00:00.000Z',
        }),
      ],
    });
    const service = new AnalyticsService(repo);

    const dash = await service.getDashboard('all');
    expect(dash.cutoffDate).toBe('2026-11-18');
    expect(dash.kpis.overdueAmount).toBe(5500);
    expect(dash.kpis.overdueAccounts).toBe(3);
    expect(dash.kpis.over45Amount).toBe(4000);
    expect(dash.kpis.highestBase?.id).toBe('Dallas');
    expect(dash.stages.find((s) => s.id === 1)?.accounts).toBe(1);
    expect(dash.stages.find((s) => s.id === 4)?.amount).toBe(4000);
    expect(dash.insights.length).toBeGreaterThan(0);

    const dallas = dash.bases.find((b) => b.id === 'Dallas');
    expect(dallas?.severity).toBe('critical');
    expect(dallas?.severityColor).toBe(SEVERITY_COLORS.critical);
    expect(dallas?.criticalShare).toBeCloseTo(0.8, 3);

    const phoenix = dash.bases.find((b) => b.id === 'Phoenix');
    expect(phoenix?.severity).toBe('ok');

    const commercial = await service.getDashboard('C');
    expect(commercial.kpis.overdueAmount).toBe(5000);
    expect(commercial.kpis.overdueAccounts).toBe(2);

    const residential = await service.getDashboard('R');
    expect(residential.kpis.overdueAmount).toBe(500);
    expect(residential.kpis.overdueAccounts).toBe(1);
  });

  it('returns base analytics ranking and company share', async () => {
    const repo = seedRepo({
      accounts: [
        account({
          id: 'Dallas|1',
          base: 'Dallas',
          segment: 'C',
          client_name: 'A',
          service_date: '2026-10-01',
          amount_due: 3000,
        }),
        account({
          id: 'Denver|1',
          base: 'Denver',
          segment: 'C',
          client_name: 'B',
          service_date: '2026-10-01',
          amount_due: 1000,
        }),
      ],
    });
    const service = new AnalyticsService(repo);
    const analytics = await service.getBaseAnalytics('Dallas', 'all');
    expect(analytics.base.id).toBe('Dallas');
    expect(analytics.kpis.overdueAmount).toBe(3000);
    expect(analytics.kpis.rank).toBe(1);
    expect(analytics.kpis.companyShare).toBeCloseTo(0.75, 3);
    expect(analytics.ranking[0]?.id).toBe('Dallas');
    expect(analytics.bySegment.C.overdueAmount).toBe(3000);
  });

  it('lists base accounts with stage and ignores resolved', async () => {
    const repo = seedRepo({
      accounts: [
        account({
          id: 'SoCal|1',
          base: 'SoCal',
          segment: 'C',
          client_name: 'Open',
          service_date: '2026-10-01',
          amount_due: 200,
        }),
        account({
          id: 'SoCal|2',
          base: 'SoCal',
          segment: 'C',
          client_name: 'Closed',
          service_date: '2026-01-01',
          amount_due: 900,
          resolved_at: '2026-11-01T00:00:00.000Z',
        }),
      ],
    });
    const service = new AnalyticsService(repo);
    const list = await service.listBaseAccounts('SoCal', 'all');
    expect(list.accounts).toHaveLength(1);
    expect(list.accounts[0]?.client_name).toBe('Open');
    expect(list.accounts[0]?.stage).toBeGreaterThanOrEqual(1);
  });

  it('aggregates trends from snapshots by upload', async () => {
    const repo = seedRepo({
      uploads: [
        {
          id: 'up-a',
          filename: 'a.xlsx',
          uploaded_at: '2026-10-01T00:00:00.000Z',
          uploaded_by: null,
          cutoff_date: '2026-10-01',
          stage_mode: 'date',
          rows_read: 1,
          rows_loaded: 1,
          warnings: [],
        },
        {
          id: 'up-b',
          filename: 'b.xlsx',
          uploaded_at: '2026-11-01T00:00:00.000Z',
          uploaded_by: null,
          cutoff_date: '2026-11-01',
          stage_mode: 'date',
          rows_read: 1,
          rows_loaded: 1,
          warnings: [],
        },
      ],
      snapshots: [
        {
          upload_id: 'up-a',
          cutoff_date: '2026-10-01',
          base: 'Dallas',
          segment: 'C',
          stage: 1,
          accounts: 2,
          amount: 100,
        },
        {
          upload_id: 'up-b',
          cutoff_date: '2026-11-01',
          base: 'Dallas',
          segment: 'C',
          stage: 2,
          accounts: 1,
          amount: 250,
        },
        {
          upload_id: 'up-b',
          cutoff_date: '2026-11-01',
          base: 'Phoenix',
          segment: 'R',
          stage: 1,
          accounts: 3,
          amount: 75,
        },
      ],
    });
    const service = new AnalyticsService(repo);
    const all = await service.getTrends('all');
    expect(all.points).toHaveLength(2);
    expect(all.points[0]?.cutoffDate).toBe('2026-10-01');
    expect(all.points[1]?.overdueAmount).toBe(325);

    const commercial = await service.getTrends('C');
    expect(commercial.points[1]?.overdueAmount).toBe(250);
  });

  it('throws NOT_FOUND for unknown bases', async () => {
    const service = new AnalyticsService(seedRepo());
    await expect(service.getBaseAnalytics('Richmond', 'all')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('returns empty dashboard when there are no uploads', async () => {
    const repo = seedRepo({ uploads: [], accounts: [] });
    const service = new AnalyticsService(repo);
    const dash = await service.getDashboard('all');
    expect(dash.cutoffDate).toBeNull();
    expect(dash.kpis.overdueAmount).toBe(0);
    expect(dash.insights).toEqual([]);
  });
});
