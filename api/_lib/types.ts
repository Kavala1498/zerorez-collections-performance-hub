export type StageMode = 'date' | 'label';

/** Portfolio blob persisted in payload jsonb. */
export type PortfolioState = {
  accounts: unknown[];
  uploads: unknown[];
  snapshots: unknown[];
};

/** Metadata + portfolio stored as the shared "latest upload" snapshot. */
export type SnapshotRecord = {
  id: string;
  createdAt: string;
  cutoffDate: string;
  stageMode: StageMode;
  filename: string | null;
  uploadedAt: string;
  warnings: string[];
  payload: PortfolioState;
};

export type SnapshotPostBody = {
  cutoffDate: string;
  stageMode: StageMode;
  uploadedAt: string;
  filename: string;
  warnings?: string[];
  accounts: unknown[];
  uploads?: unknown[];
  snapshots?: unknown[];
};

export type SnapshotLatestResponse = {
  id: string;
  createdAt: string;
  cutoffDate: string;
  stageMode: StageMode;
  filename: string | null;
  uploadedAt: string;
  warnings: string[];
  accounts: unknown[];
  uploads: unknown[];
  snapshots: unknown[];
};

export type ApiErrorBody = {
  error: { code: string; message: string };
};
