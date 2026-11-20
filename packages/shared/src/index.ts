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
