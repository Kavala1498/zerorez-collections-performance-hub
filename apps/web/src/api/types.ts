import type { Account, Segment, StageId, Upload } from '@zerorez/shared';

export type AnalyticsSegment = 'all' | Segment;

export type SeverityLevel = 'critical' | 'warning' | 'ok';

export type StageBucket = {
  id: StageId;
  label: string;
  color: string;
  responsibleAction: string;
  accounts: number;
  amount: number;
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

export type PortfolioKpis = {
  overdueAmount: number;
  overdueAccounts: number;
  averagePerAccount: number;
  over45Amount: number;
  over45Share: number;
  highestBase: { id: string; name: string; amount: number } | null;
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

export type AccountWithStage = Account & {
  daysPastDue: number | null;
  stage: StageId | null;
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

export type UploadResult = {
  upload: Upload;
  rowsRead: number;
  rowsLoaded: number;
  warnings: string[];
  snapshotsCreated: number;
  accountsOpen: number;
  accountsResolved: number;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
