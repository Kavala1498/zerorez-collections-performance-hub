import { describe, expect, it } from 'vitest';
import type { Account, Snapshot, Upload } from '../src/types.js';
import {
  SEVERITY_COLORS,
  daysBetween,
  getBaseAnalytics,
  getDashboard,
  getTrends,
  listBaseAccounts,
  severityFromCriticalShare,
} from '../src/analytics.js';
import type { PortfolioState } from '../src/analytics.js';

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

function seed(opts?: {
  accounts?: Account[];
  uploads?: Upload[];
  snapshots?: Snapshot[];
}): PortfolioState {
  return {
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
  };
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

describe('analytics (pure)', () => {
  it('computes dashboard KPIs, stages, severity, and insights', () => {
    // cutoff 2026-11-18
    // Dallas C: 15 DPD → stage 2 ($1000); 50 DPD → stage 4 ($4000) → critical share 80%
    // Phoenix R: 20 DPD → stage 2 ($500)
    const state = seed({
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
          service_date: '2026-11-03', // 15 days → stage 2
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

    const dash = getDashboard(state, 'all');
    expect(dash.cutoffDate).toBe('2026-11-18');
    expect(dash.kpis.overdueAmount).toBe(5500);
    expect(dash.kpis.overdueAccounts).toBe(3);
    expect(dash.kpis.over45Amount).toBe(4000);
    expect(dash.kpis.highestBase?.id).toBe('Dallas');
    expect(dash.stages.find((s) => s.id === 2)?.accounts).toBe(2);
    expect(dash.stages.find((s) => s.id === 4)?.amount).toBe(4000);
    expect(dash.insights.length).toBeGreaterThan(0);

    const dallas = dash.bases.find((b) => b.id === 'Dallas');
    expect(dallas?.severity).toBe('critical');
    expect(dallas?.severityColor).toBe(SEVERITY_COLORS.critical);
    expect(dallas?.criticalShare).toBeCloseTo(0.8, 3);

    const phoenix = dash.bases.find((b) => b.id === 'Phoenix');
    expect(phoenix?.severity).toBe('ok');

    const commercial = getDashboard(state, 'C');
    expect(commercial.kpis.overdueAmount).toBe(5000);
    expect(commercial.kpis.overdueAccounts).toBe(2);

    const residential = getDashboard(state, 'R');
    expect(residential.kpis.overdueAmount).toBe(500);
    expect(residential.kpis.overdueAccounts).toBe(1);
  });

  it('returns base analytics ranking and company share', () => {
    const state = seed({
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
    const analytics = getBaseAnalytics(state, 'Dallas', 'all');
    expect(analytics.base.id).toBe('Dallas');
    expect(analytics.kpis.overdueAmount).toBe(3000);
    expect(analytics.kpis.rank).toBe(1);
    expect(analytics.kpis.companyShare).toBeCloseTo(0.75, 3);
    expect(analytics.ranking[0]?.id).toBe('Dallas');
    expect(analytics.bySegment.C.overdueAmount).toBe(3000);
  });

  it('lists base accounts with stage and ignores resolved', () => {
    const state = seed({
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
    const list = listBaseAccounts(state, 'SoCal', 'all');
    expect(list.accounts).toHaveLength(1);
    expect(list.accounts[0]?.client_name).toBe('Open');
    expect(list.accounts[0]?.stage).toBeGreaterThanOrEqual(1);
  });

  it('aggregates trends from snapshots by upload', () => {
    const state = seed({
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
    const all = getTrends(state, 'all');
    expect(all.points).toHaveLength(2);
    expect(all.points[0]?.cutoffDate).toBe('2026-10-01');
    expect(all.points[1]?.overdueAmount).toBe(325);

    const commercial = getTrends(state, 'C');
    expect(commercial.points[1]?.overdueAmount).toBe(250);

    const dallas = getTrends(state, 'all', 'Dallas');
    expect(dallas.base?.id).toBe('Dallas');
    expect(dallas.points[1]?.overdueAmount).toBe(250);
  });

  it('throws for unknown bases', () => {
    expect(() => getBaseAnalytics(seed(), 'Richmond', 'all')).toThrow(/Unknown base/);
  });

  it('returns empty dashboard when there are no uploads', () => {
    const dash = getDashboard(seed({ uploads: [], accounts: [] }), 'all');
    expect(dash.cutoffDate).toBeNull();
    expect(dash.kpis.overdueAmount).toBe(0);
    expect(dash.insights).toEqual([]);
  });
});
