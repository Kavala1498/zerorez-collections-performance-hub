import {
  BASES,
  STAGES,
  buildInsights,
  resolveBaseId,
  stageFromDays,
  type Account,
  type InsightAccount,
  type Segment,
  type Snapshot,
  type StageId,
  type Upload,
} from '@zerorez/shared';
import { z } from 'zod';
import { AppError } from '../errors/AppError.js';
import type { AccountsRepository } from '../repositories/AccountsRepository.js';

/** Query segment: all portfolio, Commercial only, or Residential only. */
export const AnalyticsSegmentSchema = z.enum(['all', 'C', 'R']);
export type AnalyticsSegment = z.infer<typeof AnalyticsSegmentSchema>;

export const SegmentQuerySchema = z.object({
  segment: AnalyticsSegmentSchema.default('all'),
});

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

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundShare(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10_000) / 10_000;
}

export function daysBetween(serviceDate: string, cutoffDate: string): number {
  const service = Date.parse(serviceDate);
  const cutoff = Date.parse(cutoffDate);
  if (!Number.isFinite(service) || !Number.isFinite(cutoff)) return Number.NaN;
  return Math.floor((cutoff - service) / 86_400_000);
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

function resolveCatalogBaseId(raw: string): string | null {
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

export class AnalyticsService {
  constructor(private readonly repo: AccountsRepository) {}

  async getDashboard(segment: AnalyticsSegment) {
    const ctx = await this.loadContext(segment);
    const stages = this.aggregateStages(ctx.enriched);
    const byBase = this.summarizeBases(ctx.enriched);
    const kpis = this.portfolioKpis(ctx.enriched, byBase);
    const insights = buildInsights(this.toInsightAccounts(ctx.enriched), {
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

  async listBases(segment: AnalyticsSegment) {
    const ctx = await this.loadContext(segment);
    const bases = this.summarizeBases(ctx.enriched);
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

  async getBaseAnalytics(baseIdRaw: string, segment: AnalyticsSegment) {
    const baseId = resolveCatalogBaseId(baseIdRaw);
    if (!baseId) {
      throw new AppError('NOT_FOUND', `Unknown base: ${baseIdRaw}`, 404);
    }

    const ctx = await this.loadContext(segment);
    const company = this.summarizeBases(ctx.enriched);
    const companyTotal = company.reduce((s, b) => s + b.overdueAmount, 0);

    const forBase = ctx.enriched.filter((e) => e.account.base === baseId);
    const stages = this.aggregateStages(forBase);
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

    const commercial = this.aggregateStages(forBase.filter((e) => e.account.segment === 'C'));
    const residential = this.aggregateStages(forBase.filter((e) => e.account.segment === 'R'));

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
      insights: buildInsights(this.toInsightAccounts(forBase)),
    };
  }

  async listBaseAccounts(baseIdRaw: string, segment: AnalyticsSegment) {
    const baseId = resolveCatalogBaseId(baseIdRaw);
    if (!baseId) {
      throw new AppError('NOT_FOUND', `Unknown base: ${baseIdRaw}`, 404);
    }

    const ctx = await this.loadContext(segment);
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

  async getTrends(segment: AnalyticsSegment) {
    const [snapshots, uploads] = await Promise.all([
      this.repo.listSnapshots(),
      this.repo.listUploads(),
    ]);
    const uploadById = new Map(uploads.map((u) => [u.id, u]));
    const filtered = snapshots.filter((s) => matchesSegment(s.segment, segment));

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

    return { segment, points };
  }

  private async loadContext(segment: AnalyticsSegment): Promise<{
    cutoffDate: string | null;
    enriched: Enriched[];
  }> {
    const [accounts, uploads] = await Promise.all([
      this.repo.listAccounts(),
      this.repo.listUploads(),
    ]);
    const cutoffDate = latestCutoff(uploads);
    if (!cutoffDate) {
      return { cutoffDate: null, enriched: [] };
    }

    const enriched: Enriched[] = [];
    for (const account of accounts) {
      if (account.resolved_at) continue;
      if (!matchesSegment(account.segment, segment)) continue;
      const days = daysBetween(account.service_date, cutoffDate);
      const stage = Number.isFinite(days) ? stageFromDays(days) : null;
      enriched.push({
        account,
        stage,
        daysPastDue: Number.isFinite(days) ? days : null,
        amount: account.amount_due,
      });
    }
    return { cutoffDate, enriched };
  }

  private aggregateStages(rows: Enriched[]): StageBucket[] {
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

  private summarizeBases(rows: Enriched[]): BaseSummary[] {
    return BASES.map((base) => {
      const forBase = rows.filter((e) => e.account.base === base.id);
      const stages = this.aggregateStages(forBase);
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

  private portfolioKpis(rows: Enriched[], bases: BaseSummary[]): PortfolioKpis {
    const stages = this.aggregateStages(rows);
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

  private toInsightAccounts(rows: Enriched[]): InsightAccount[] {
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
}

function latestCutoff(uploads: Upload[]): string | null {
  if (uploads.length === 0) return null;
  const sorted = [...uploads].sort((a, b) => {
    const byUploaded = b.uploaded_at.localeCompare(a.uploaded_at);
    if (byUploaded !== 0) return byUploaded;
    return b.cutoff_date.localeCompare(a.cutoff_date);
  });
  return sorted[0]?.cutoff_date ?? null;
}
