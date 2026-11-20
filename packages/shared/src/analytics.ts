import { BASES, resolveBaseId } from './bases.js';
import { buildInsights } from './insights.js';
import { STAGES, type StageId } from './stages.js';
import { daysBetween, resolveAccountStage } from './uploadMerge.js';
import type {
  Account,
  InsightAccount,
  Segment,
  Snapshot,
  StageMode,
  Upload,
} from './types.js';

/** Query segment: all portfolio, Commercial only, or Residential only. */
export type AnalyticsSegment = 'all' | Segment;

export type SeverityLevel = 'critical' | 'warning' | 'ok';

/** Severity colors aligned with arquitectura + reference sidebar dots. */
export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: '#C8412A',
  warning: '#E8923A',
  ok: '#8FBF8A',
};

export type StageBucket = {
  id: StageId;
  label: string;
  color: string;
  responsibleAction: string;
  accounts: number;
  amount: number;
};

export type BaseSummary = {
  id: string;
  name: string;
  overdueAmount: number;
  overdueAccounts: number;
  criticalAmount: number;
  criticalShare: number;
  severity: SeverityLevel;
  severityColor: string;
  stages: StageBucket[];
};

export type PortfolioKpis = {
  overdueAmount: number;
  overdueAccounts: number;
  averagePerAccount: number;
  /** Stages 4–5 (49+ DPD). Kept as over45* for UI type stability. */
  over45Amount: number;
  over45Share: number;
  highestBase: { id: string; name: string; amount: number } | null;
};

export type BaseKpis = {
  overdueAmount: number;
  overdueAccounts: number;
  averagePerAccount: number;
  companyShare: number;
  over45Amount: number;
  over45Share: number;
  rank: number;
  baseCount: number;
};

export type AccountWithStage = Account & {
  daysPastDue: number | null;
  stage: StageId | null;
};

export type TrendPoint = {
  uploadId: string;
  cutoffDate: string;
  uploadedAt: string | null;
  overdueAmount: number;
  overdueAccounts: number;
  stages: StageBucket[];
};

/** Account that entered stage 4 or 5 between the previous and latest upload. */
export type CriticalStageAlert = {
  accountId: string;
  base: string;
  segment: Segment;
  clientName: string;
  companyName: string | null;
  amountDue: number;
  previousStage: StageId | null;
  currentStage: StageId;
  previousCutoffDate: string;
  currentCutoffDate: string;
  status: string | null;
};

export type PortfolioState = {
  accounts: Account[];
  uploads: Upload[];
  snapshots: Snapshot[];
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundShare(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10_000) / 10_000;
}

/**
 * Critical share = stages 4+5 amount / total past-due.
 * >50% critical (dark red), >20% warning (orange), else ok (green).
 */
export function severityFromCriticalShare(criticalShare: number): SeverityLevel {
  if (criticalShare > 0.5) return 'critical';
  if (criticalShare > 0.2) return 'warning';
  return 'ok';
}

function emptyStages(): StageBucket[] {
  return STAGES.map((s) => ({
    id: s.id,
    label: s.label,
    color: s.color,
    responsibleAction: s.responsibleAction,
    accounts: 0,
    amount: 0,
  }));
}

function matchesSegment(accountSegment: Segment, filter: AnalyticsSegment): boolean {
  return filter === 'all' || accountSegment === filter;
}

function baseName(id: string): string {
  return BASES.find((b) => b.id === id)?.name ?? id;
}

export function resolveCatalogBaseId(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  if (BASES.some((b) => b.id === decoded)) return decoded;
  return resolveBaseId(decoded);
}

type Enriched = {
  account: Account;
  stage: StageId | null;
  daysPastDue: number | null;
  amount: number;
};

function latestUpload(uploads: Upload[]): Upload | null {
  if (uploads.length === 0) return null;
  const sorted = [...uploads].sort((a, b) => {
    const byUploaded = b.uploaded_at.localeCompare(a.uploaded_at);
    if (byUploaded !== 0) return byUploaded;
    return b.cutoff_date.localeCompare(a.cutoff_date);
  });
  return sorted[0] ?? null;
}

function loadContext(
  state: PortfolioState,
  segment: AnalyticsSegment,
): {
  cutoffDate: string | null;
  stageMode: StageMode;
  enriched: Enriched[];
} {
  const latest = latestUpload(state.uploads);
  const cutoffDate = latest?.cutoff_date ?? null;
  const stageMode = latest?.stage_mode ?? 'date';
  if (!cutoffDate) {
    return { cutoffDate: null, stageMode, enriched: [] };
  }

  const enriched: Enriched[] = [];
  for (const account of state.accounts) {
    if (account.resolved_at) continue;
    if (!matchesSegment(account.segment, segment)) continue;
    const days = daysBetween(account.service_date, cutoffDate);
    const stage = resolveAccountStage(account, cutoffDate, stageMode);
    enriched.push({
      account,
      stage,
      daysPastDue: Number.isFinite(days) ? days : null,
      amount: account.amount_due,
    });
  }
  return { cutoffDate, stageMode, enriched };
}

function aggregateStages(rows: Enriched[]): StageBucket[] {
  const stages = emptyStages();
  for (const row of rows) {
    if (row.stage == null) continue;
    const bucket = stages.find((s) => s.id === row.stage);
    if (!bucket) continue;
    bucket.accounts += 1;
    bucket.amount = roundMoney(bucket.amount + row.amount);
  }
  return stages;
}

function summarizeBases(rows: Enriched[]): BaseSummary[] {
  return BASES.map((base) => {
    const forBase = rows.filter((e) => e.account.base === base.id);
    const stages = aggregateStages(forBase);
    const overdueAmount = stages.reduce((s, x) => s + x.amount, 0);
    const overdueAccounts = stages.reduce((s, x) => s + x.accounts, 0);
    const criticalAmount = stages.filter((s) => s.id >= 4).reduce((s, x) => s + x.amount, 0);
    const criticalShare = overdueAmount > 0 ? criticalAmount / overdueAmount : 0;
    const severity = severityFromCriticalShare(criticalShare);
    return {
      id: base.id,
      name: base.name,
      overdueAmount: roundMoney(overdueAmount),
      overdueAccounts,
      criticalAmount: roundMoney(criticalAmount),
      criticalShare: roundShare(criticalShare),
      severity,
      severityColor: SEVERITY_COLORS[severity],
      stages,
    };
  });
}

function portfolioKpis(rows: Enriched[], bases: BaseSummary[]): PortfolioKpis {
  const stages = aggregateStages(rows);
  const overdueAmount = stages.reduce((s, x) => s + x.amount, 0);
  const overdueAccounts = stages.reduce((s, x) => s + x.accounts, 0);
  const over45Amount = stages.filter((s) => s.id >= 4).reduce((s, x) => s + x.amount, 0);
  const ranked = [...bases].sort((a, b) => b.overdueAmount - a.overdueAmount);
  const top = ranked[0];
  return {
    overdueAmount: roundMoney(overdueAmount),
    overdueAccounts,
    averagePerAccount: overdueAccounts > 0 ? roundMoney(overdueAmount / overdueAccounts) : 0,
    over45Amount: roundMoney(over45Amount),
    over45Share: overdueAmount > 0 ? roundShare(over45Amount / overdueAmount) : 0,
    highestBase:
      top && top.overdueAmount > 0
        ? { id: top.id, name: top.name, amount: top.overdueAmount }
        : null,
  };
}

function toInsightAccounts(rows: Enriched[]): InsightAccount[] {
  return rows.map((e) => ({
    base: e.account.base,
    segment: e.account.segment,
    client_name: e.account.client_name,
    amount_due: e.account.amount_due,
    paid_amount: e.account.paid_amount,
    status: e.account.status,
    last_contacted: e.account.last_contacted,
    stage: e.stage,
  }));
}

export function getDashboard(state: PortfolioState, segment: AnalyticsSegment) {
  const ctx = loadContext(state, segment);
  const stages = aggregateStages(ctx.enriched);
  const byBase = summarizeBases(ctx.enriched);
  const kpis = portfolioKpis(ctx.enriched, byBase);
  const insights = buildInsights(toInsightAccounts(ctx.enriched), {
    includeBaseConcentration: true,
  });

  return {
    segment,
    cutoffDate: ctx.cutoffDate,
    amountBasis: 'gross' as const,
    kpis,
    stages,
    bases: byBase.map((b) => ({
      id: b.id,
      name: b.name,
      overdueAmount: b.overdueAmount,
      overdueAccounts: b.overdueAccounts,
      severity: b.severity,
      severityColor: b.severityColor,
      criticalShare: b.criticalShare,
      stages: b.stages,
    })),
    insights,
  };
}

export function listBases(state: PortfolioState, segment: AnalyticsSegment) {
  const ctx = loadContext(state, segment);
  const bases = summarizeBases(ctx.enriched);
  return {
    segment,
    cutoffDate: ctx.cutoffDate,
    bases: bases.map((b) => ({
      id: b.id,
      name: b.name,
      overdueAmount: b.overdueAmount,
      overdueAccounts: b.overdueAccounts,
      criticalAmount: b.criticalAmount,
      criticalShare: b.criticalShare,
      severity: b.severity,
      severityColor: b.severityColor,
    })),
  };
}

export function getBaseAnalytics(
  state: PortfolioState,
  baseIdRaw: string,
  segment: AnalyticsSegment,
) {
  const baseId = resolveCatalogBaseId(baseIdRaw);
  if (!baseId) {
    throw new Error(`Unknown base: ${baseIdRaw}`);
  }

  const ctx = loadContext(state, segment);
  const company = summarizeBases(ctx.enriched);
  const companyTotal = company.reduce((s, b) => s + b.overdueAmount, 0);

  const forBase = ctx.enriched.filter((e) => e.account.base === baseId);
  const stages = aggregateStages(forBase);
  const overdueAmount = stages.reduce((s, x) => s + x.amount, 0);
  const overdueAccounts = stages.reduce((s, x) => s + x.accounts, 0);
  const over45Amount = stages.filter((s) => s.id >= 4).reduce((s, x) => s + x.amount, 0);

  const ranking = [...company].sort((a, b) => b.overdueAmount - a.overdueAmount);
  const rankIndex = ranking.findIndex((b) => b.id === baseId);
  const rank = rankIndex >= 0 ? rankIndex + 1 : ranking.length + 1;

  const kpis: BaseKpis = {
    overdueAmount: roundMoney(overdueAmount),
    overdueAccounts,
    averagePerAccount: overdueAccounts > 0 ? roundMoney(overdueAmount / overdueAccounts) : 0,
    companyShare: companyTotal > 0 ? roundShare(overdueAmount / companyTotal) : 0,
    over45Amount: roundMoney(over45Amount),
    over45Share: overdueAmount > 0 ? roundShare(over45Amount / overdueAmount) : 0,
    rank,
    baseCount: BASES.length,
  };

  const commercial = aggregateStages(forBase.filter((e) => e.account.segment === 'C'));
  const residential = aggregateStages(forBase.filter((e) => e.account.segment === 'R'));

  return {
    segment,
    cutoffDate: ctx.cutoffDate,
    amountBasis: 'gross' as const,
    base: { id: baseId, name: baseName(baseId) },
    kpis,
    stages,
    bySegment: {
      C: {
        overdueAmount: roundMoney(commercial.reduce((s, x) => s + x.amount, 0)),
        overdueAccounts: commercial.reduce((s, x) => s + x.accounts, 0),
        stages: commercial,
      },
      R: {
        overdueAmount: roundMoney(residential.reduce((s, x) => s + x.amount, 0)),
        overdueAccounts: residential.reduce((s, x) => s + x.accounts, 0),
        stages: residential,
      },
    },
    ranking: ranking.map((b) => ({
      id: b.id,
      name: b.name,
      overdueAmount: b.overdueAmount,
    })),
    insights: buildInsights(toInsightAccounts(forBase)),
  };
}

export function listBaseAccounts(
  state: PortfolioState,
  baseIdRaw: string,
  segment: AnalyticsSegment,
) {
  const baseId = resolveCatalogBaseId(baseIdRaw);
  if (!baseId) {
    throw new Error(`Unknown base: ${baseIdRaw}`);
  }

  const ctx = loadContext(state, segment);
  const accounts: AccountWithStage[] = ctx.enriched
    .filter((e) => e.account.base === baseId)
    .map((e) => ({
      ...e.account,
      daysPastDue: e.daysPastDue,
      stage: e.stage,
    }))
    .sort((a, b) => {
      const aDue = a.stage != null ? a.amount_due : -1;
      const bDue = b.stage != null ? b.amount_due : -1;
      if (bDue !== aDue) return bDue - aDue;
      return a.client_name.localeCompare(b.client_name);
    });

  return {
    segment,
    cutoffDate: ctx.cutoffDate,
    base: { id: baseId, name: baseName(baseId) },
    accounts,
  };
}

export function getTrends(
  state: PortfolioState,
  segment: AnalyticsSegment,
  baseIdRaw?: string,
) {
  let baseId: string | null = null;
  if (baseIdRaw != null && baseIdRaw !== '') {
    baseId = resolveCatalogBaseId(baseIdRaw);
    if (!baseId) {
      throw new Error(`Unknown base: ${baseIdRaw}`);
    }
  }

  const uploadById = new Map(state.uploads.map((u) => [u.id, u]));
  const filtered = state.snapshots.filter((s) => {
    if (!matchesSegment(s.segment, segment)) return false;
    if (baseId && s.base !== baseId) return false;
    return true;
  });

  const byUpload = new Map<string, Snapshot[]>();
  for (const snap of filtered) {
    const list = byUpload.get(snap.upload_id) ?? [];
    list.push(snap);
    byUpload.set(snap.upload_id, list);
  }

  const points: TrendPoint[] = [];
  for (const [uploadId, rows] of byUpload) {
    const upload = uploadById.get(uploadId);
    const cutoffDate = rows[0]?.cutoff_date ?? upload?.cutoff_date ?? '';
    const stages = emptyStages();
    for (const row of rows) {
      const bucket = stages.find((s) => s.id === row.stage);
      if (!bucket) continue;
      bucket.accounts += row.accounts;
      bucket.amount = roundMoney(bucket.amount + row.amount);
    }
    points.push({
      uploadId,
      cutoffDate,
      uploadedAt: upload?.uploaded_at ?? null,
      overdueAmount: roundMoney(stages.reduce((s, x) => s + x.amount, 0)),
      overdueAccounts: stages.reduce((s, x) => s + x.accounts, 0),
      stages,
    });
  }

  points.sort((a, b) => {
    const cut = a.cutoffDate.localeCompare(b.cutoffDate);
    if (cut !== 0) return cut;
    return (a.uploadedAt ?? '').localeCompare(b.uploadedAt ?? '');
  });

  return {
    segment,
    base: baseId ? { id: baseId, name: baseName(baseId) } : null,
    points,
  };
}

/**
 * Accounts that moved into critical stages (4 or 5) between the previous
 * and latest upload cutoffs.
 */
export function getCriticalStageAlerts(
  state: PortfolioState,
  segment: AnalyticsSegment,
  baseIdRaw?: string,
) {
  let baseId: string | null = null;
  if (baseIdRaw != null && baseIdRaw !== '') {
    baseId = resolveCatalogBaseId(baseIdRaw);
    if (!baseId) {
      throw new Error(`Unknown base: ${baseIdRaw}`);
    }
  }

  const ordered = [...state.uploads].sort((a, b) => {
    const byUploaded = a.uploaded_at.localeCompare(b.uploaded_at);
    if (byUploaded !== 0) return byUploaded;
    return a.cutoff_date.localeCompare(b.cutoff_date);
  });

  if (ordered.length < 2) {
    return {
      segment,
      base: baseId ? { id: baseId, name: baseName(baseId) } : null,
      previousCutoffDate: null as string | null,
      currentCutoffDate: ordered[0]?.cutoff_date ?? null,
      alerts: [] as CriticalStageAlert[],
    };
  }

  const previous = ordered[ordered.length - 2]!;
  const current = ordered[ordered.length - 1]!;
  const alerts: CriticalStageAlert[] = [];

  for (const account of state.accounts) {
    if (account.resolved_at) continue;
    if (!matchesSegment(account.segment, segment)) continue;
    if (baseId && account.base !== baseId) continue;

    const previousStage = resolveAccountStage(account, previous.cutoff_date, previous.stage_mode);
    const currentStage = resolveAccountStage(account, current.cutoff_date, current.stage_mode);

    if (currentStage == null || currentStage < 4) continue;
    const wasCritical = previousStage != null && previousStage >= 4;
    if (wasCritical) continue;

    alerts.push({
      accountId: account.id,
      base: account.base,
      segment: account.segment,
      clientName: account.client_name,
      companyName: account.company_name ?? null,
      amountDue: roundMoney(account.amount_due),
      previousStage,
      currentStage,
      previousCutoffDate: previous.cutoff_date,
      currentCutoffDate: current.cutoff_date,
      status: account.status ?? null,
    });
  }

  alerts.sort((a, b) => {
    if (b.amountDue !== a.amountDue) return b.amountDue - a.amountDue;
    return a.clientName.localeCompare(b.clientName);
  });

  return {
    segment,
    base: baseId ? { id: baseId, name: baseName(baseId) } : null,
    previousCutoffDate: previous.cutoff_date,
    currentCutoffDate: current.cutoff_date,
    alerts,
  };
}

export { daysBetween };
