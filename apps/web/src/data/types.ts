import type {
  Account,
  AccountWithStage,
  AnalyticsSegment,
  BaseKpis,
  CriticalStageAlert,
  PortfolioKpis,
  SeverityLevel,
  StageBucket,
  TrendPoint,
  Upload,
} from '@zerorez/shared';

export type {
  Account,
  AccountWithStage,
  AnalyticsSegment,
  BaseKpis,
  CriticalStageAlert,
  PortfolioKpis,
  SeverityLevel,
  StageBucket,
  TrendPoint,
  Upload,
};

export type DashboardBaseRow = {
  id: string;
  name: string;
  overdueAmount: number;
  overdueAccounts: number;
  severity: SeverityLevel;
  severityColor: string;
  criticalShare: number;
  stages: StageBucket[];
};

export type DashboardResponse = {
  segment: AnalyticsSegment;
  cutoffDate: string | null;
  amountBasis: 'gross' | 'net';
  kpis: PortfolioKpis;
  stages: StageBucket[];
  bases: DashboardBaseRow[];
  insights: string[];
};

export type BasesListResponse = {
  segment: AnalyticsSegment;
  cutoffDate: string | null;
  bases: Array<{
    id: string;
    name: string;
    overdueAmount: number;
    overdueAccounts: number;
    criticalAmount: number;
    criticalShare: number;
    severity: SeverityLevel;
    severityColor: string;
  }>;
};

export type BaseAnalyticsResponse = {
  segment: AnalyticsSegment;
  cutoffDate: string | null;
  amountBasis: 'gross' | 'net';
  base: { id: string; name: string };
  kpis: BaseKpis;
  stages: StageBucket[];
  bySegment: {
    C: { overdueAmount: number; overdueAccounts: number; stages: StageBucket[] };
    R: { overdueAmount: number; overdueAccounts: number; stages: StageBucket[] };
  };
  ranking: Array<{ id: string; name: string; overdueAmount: number }>;
  insights: string[];
};

export type BaseAccountsResponse = {
  segment: AnalyticsSegment;
  cutoffDate: string | null;
  base: { id: string; name: string };
  accounts: AccountWithStage[];
};

export type UploadsListResponse = {
  uploads: Upload[];
};

export type TrendsResponse = {
  segment: AnalyticsSegment;
  base: { id: string; name: string } | null;
  points: TrendPoint[];
};

export type AlertsResponse = {
  segment: AnalyticsSegment;
  base: { id: string; name: string } | null;
  previousCutoffDate: string | null;
  currentCutoffDate: string | null;
  alerts: CriticalStageAlert[];
};
