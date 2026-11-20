import type {
  Account,
  AccountChange,
  AllowedStatus,
  Segment,
  StageId,
  Upload,
} from '@zerorez/shared';

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

export type TrendPoint = {
  uploadId: string;
  cutoffDate: string;
  uploadedAt: string | null;
  overdueAmount: number;
  overdueAccounts: number;
  stages: StageBucket[];
};

export type TrendsResponse = {
  segment: AnalyticsSegment;
  base: { id: string; name: string } | null;
  points: TrendPoint[];
};

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

export type AlertsResponse = {
  segment: AnalyticsSegment;
  base: { id: string; name: string } | null;
  previousCutoffDate: string | null;
  currentCutoffDate: string | null;
  alerts: CriticalStageAlert[];
};

export type AccountPatch = {
  status?: AllowedStatus | '' | null;
  next_action?: string | null;
  next_action_date?: string | null;
  notes?: string | null;
  last_contacted?: string | null;
};

export type AccountPatchResponse = {
  account: Account;
  change: AccountChange;
};

export type AccountChangesResponse = {
  accountId: string;
  changes: AccountChange[];
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
