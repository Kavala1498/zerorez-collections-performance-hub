export {
  BASES,
  BASE_IDS,
  normalizeBaseKey,
  resolveBaseId,
  type BaseDefinition,
} from './bases.js';

export {
  STAGES,
  DEFAULT_STAGE_WINDOWS,
  stageFromDays,
  stageFromAgingLabel,
  getStage,
  type StageId,
  type StageDefinition,
  type StageWindow,
} from './stages.js';

export {
  SegmentSchema,
  AllowedStatusSchema,
  StageModeSchema,
  AccountSchema,
  AccountChangeEntrySchema,
  AccountChangeSchema,
  UploadSchema,
  SnapshotSchema,
  type Segment,
  type AllowedStatus,
  type StageMode,
  type Account,
  type AccountChangeEntry,
  type AccountChange,
  type Upload,
  type Snapshot,
  type InsightAccount,
} from './types.js';

export { normalizeStatus, ALLOWED_STATUSES } from './status.js';

export { buildInsights, type BuildInsightsOptions } from './insights.js';

export {
  parseWorkbook,
  normalizeHeaderKey,
  type ParseStats,
  type ParseWorkbookResult,
} from './excelParser.js';

export {
  CRM_PRESERVE_FIELDS,
  mergeAccountsForUpload,
  buildSnapshotsForUpload,
  resolveAccountStage,
  daysBetween,
} from './uploadMerge.js';

export {
  SEVERITY_COLORS,
  severityFromCriticalShare,
  resolveCatalogBaseId,
  getDashboard,
  listBases,
  getBaseAnalytics,
  listBaseAccounts,
  getTrends,
  getCriticalStageAlerts,
  type AnalyticsSegment,
  type SeverityLevel,
  type StageBucket,
  type BaseSummary,
  type PortfolioKpis,
  type BaseKpis,
  type AccountWithStage,
  type TrendPoint,
  type CriticalStageAlert,
  type PortfolioState,
} from './analytics.js';
