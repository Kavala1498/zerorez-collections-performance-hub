import {
  buildSnapshotsForUpload,
  mergeAccountsForUpload,
  parseWorkbook,
  type Account,
  type AllowedStatus,
  type PortfolioState,
  type StageMode,
  type Upload,
} from '@zerorez/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ApiError,
  deleteLatestSnapshot,
  fetchHealth,
  fetchLatestSnapshot,
  latestToPortfolio,
  loadStoredPin,
  postSnapshot,
  saveStoredPin,
} from './api';
import { clearPortfolio, loadPortfolio, savePortfolio } from './idb';

export type UploadResult = {
  upload: Upload;
  rowsRead: number;
  rowsLoaded: number;
  warnings: string[];
  snapshotsCreated: number;
  accountsOpen: number;
  accountsResolved: number;
};

export type AccountPatch = {
  status?: AllowedStatus | '' | null;
  next_action?: string | null;
  next_action_date?: string | null;
  notes?: string | null;
  last_contacted?: string | null;
};

type DataContextValue = {
  ready: boolean;
  state: PortfolioState;
  revision: number;
  /** True when data came from the shared API (not only local cache). */
  fromServer: boolean;
  /** True when UPLOAD_PIN is configured on the API. */
  uploadPinRequired: boolean;
  uploadWorkbook: (input: {
    file: File;
    cutoffDate: string;
    stageMode: StageMode;
    pin?: string;
  }) => Promise<UploadResult>;
  updateSettings: (input: {
    cutoffDate: string;
    stageMode: StageMode;
    pin?: string;
  }) => Promise<void>;
  clearData: (pin?: string) => Promise<void>;
  patchAccount: (accountId: string, patch: AccountPatch) => Promise<Account>;
};

const DataContext = createContext<DataContextValue | null>(null);

const EMPTY: PortfolioState = { accounts: [], uploads: [], snapshots: [] };

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `up-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PortfolioState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [fromServer, setFromServer] = useState(false);
  const [uploadPinRequired, setUploadPinRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let pinRequired = false;
      try {
        const health = await fetchHealth();
        pinRequired = health.uploadPinRequired;
      } catch {
        // API may be down during first paint; continue with cache / empty.
      }

      try {
        const latest = await fetchLatestSnapshot();
        if (cancelled) return;
        setUploadPinRequired(pinRequired);
        if (latest) {
          const portfolio = latestToPortfolio(latest);
          setState(portfolio);
          setFromServer(true);
          await savePortfolio(portfolio);
        } else {
          setState(EMPTY);
          setFromServer(true);
          await clearPortfolio();
        }
        setReady(true);
        return;
      } catch {
        // Fall back to IndexedDB cache only when the API is unreachable.
      }

      if (cancelled) return;
      const cached = await loadPortfolio();
      setUploadPinRequired(pinRequired);
      setState(cached);
      setFromServer(false);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistLocal = useCallback(async (next: PortfolioState) => {
    setState(next);
    setRevision((r) => r + 1);
    await savePortfolio(next);
  }, []);

  const pushSnapshot = useCallback(
    async (next: PortfolioState, meta: {
      cutoffDate: string;
      stageMode: StageMode;
      uploadedAt: string;
      filename: string;
      warnings: string[];
      pin?: string;
    }) => {
      const pin = (meta.pin ?? loadStoredPin()) || null;
      if (meta.pin) saveStoredPin(meta.pin);
      const saved = await postSnapshot(
        {
          cutoffDate: meta.cutoffDate,
          stageMode: meta.stageMode,
          uploadedAt: meta.uploadedAt,
          filename: meta.filename,
          warnings: meta.warnings,
          accounts: next.accounts,
          uploads: next.uploads,
          snapshots: next.snapshots,
        },
        pin,
      );
      const portfolio = latestToPortfolio(saved);
      setFromServer(true);
      await persistLocal(portfolio);
      return portfolio;
    },
    [persistLocal],
  );

  const uploadWorkbook = useCallback(
    async (input: {
      file: File;
      cutoffDate: string;
      stageMode: StageMode;
      pin?: string;
    }) => {
      const buffer = await input.file.arrayBuffer();
      const parsed = await parseWorkbook(buffer);
      const uploadId = newId();
      const nowIso = new Date().toISOString();

      const merged = mergeAccountsForUpload({
        existing: state.accounts,
        incoming: parsed.accounts,
        uploadId,
        nowIso,
      });

      const snapshots = buildSnapshotsForUpload({
        accounts: merged,
        uploadId,
        cutoffDate: input.cutoffDate,
        stageMode: input.stageMode,
      });

      const upload: Upload = {
        id: uploadId,
        filename: input.file.name,
        uploaded_at: nowIso,
        uploaded_by: null,
        cutoff_date: input.cutoffDate,
        stage_mode: input.stageMode,
        rows_read: parsed.stats.rowsRead,
        rows_loaded: parsed.stats.rowsLoaded,
        warnings: parsed.warnings,
      };

      const next: PortfolioState = {
        accounts: merged,
        uploads: [...state.uploads.filter((u) => u.id !== uploadId), upload],
        snapshots: [
          ...state.snapshots.filter((s) => s.upload_id !== uploadId),
          ...snapshots,
        ],
      };

      await pushSnapshot(next, {
        cutoffDate: input.cutoffDate,
        stageMode: input.stageMode,
        uploadedAt: nowIso,
        filename: input.file.name,
        warnings: parsed.warnings,
        pin: input.pin,
      });

      return {
        upload,
        rowsRead: parsed.stats.rowsRead,
        rowsLoaded: parsed.stats.rowsLoaded,
        warnings: parsed.warnings,
        snapshotsCreated: snapshots.length,
        accountsOpen: merged.filter((a) => !a.resolved_at).length,
        accountsResolved: merged.filter((a) => !!a.resolved_at).length,
      };
    },
    [pushSnapshot, state.accounts, state.snapshots, state.uploads],
  );

  const updateSettings = useCallback(
    async (input: { cutoffDate: string; stageMode: StageMode; pin?: string }) => {
      if (state.uploads.length === 0) return;
      const latest = [...state.uploads].sort((a, b) =>
        b.uploaded_at.localeCompare(a.uploaded_at),
      )[0]!;
      const updated: Upload = {
        ...latest,
        cutoff_date: input.cutoffDate,
        stage_mode: input.stageMode,
      };
      const snapshots = buildSnapshotsForUpload({
        accounts: state.accounts,
        uploadId: updated.id,
        cutoffDate: input.cutoffDate,
        stageMode: input.stageMode,
      });
      const next: PortfolioState = {
        accounts: state.accounts,
        uploads: state.uploads.map((u) => (u.id === updated.id ? updated : u)),
        snapshots: [
          ...state.snapshots.filter((s) => s.upload_id !== updated.id),
          ...snapshots,
        ],
      };
      await pushSnapshot(next, {
        cutoffDate: input.cutoffDate,
        stageMode: input.stageMode,
        uploadedAt: updated.uploaded_at,
        filename: updated.filename,
        warnings: updated.warnings ?? [],
        pin: input.pin,
      });
    },
    [pushSnapshot, state],
  );

  const clearData = useCallback(
    async (pin?: string) => {
      const resolved = (pin ?? loadStoredPin()) || null;
      if (pin) saveStoredPin(pin);
      try {
        await deleteLatestSnapshot(resolved);
        setFromServer(true);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          throw err;
        }
        // If API unreachable, still clear local cache.
      }
      await clearPortfolio();
      setState(EMPTY);
      setRevision((r) => r + 1);
    },
    [],
  );

  const patchAccount = useCallback(
    async (accountId: string, patch: AccountPatch) => {
      const nowIso = new Date().toISOString();
      let updated: Account | null = null;
      const accounts = state.accounts.map((a) => {
        if (a.id !== accountId) return a;
        updated = {
          ...a,
          status: patch.status === undefined ? a.status : patch.status || null,
          next_action:
            patch.next_action === undefined ? a.next_action : patch.next_action,
          next_action_date:
            patch.next_action_date === undefined
              ? a.next_action_date
              : patch.next_action_date,
          acc_notes: patch.notes === undefined ? a.acc_notes : patch.notes,
          last_contacted:
            patch.last_contacted === undefined ? a.last_contacted : patch.last_contacted,
          updated_by: 'local',
          updated_at: nowIso,
        };
        return updated;
      });
      if (!updated) {
        throw new Error(`Account not found: ${accountId}`);
      }
      const next = { ...state, accounts };
      const latestUpload = [...state.uploads].sort((a, b) =>
        b.uploaded_at.localeCompare(a.uploaded_at),
      )[0];
      if (latestUpload) {
        await pushSnapshot(next, {
          cutoffDate: latestUpload.cutoff_date,
          stageMode: latestUpload.stage_mode,
          uploadedAt: latestUpload.uploaded_at,
          filename: latestUpload.filename,
          warnings: latestUpload.warnings ?? [],
        });
      } else {
        await persistLocal(next);
      }
      return updated;
    },
    [persistLocal, pushSnapshot, state],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      ready,
      state,
      revision,
      fromServer,
      uploadPinRequired,
      uploadWorkbook,
      updateSettings,
      clearData,
      patchAccount,
    }),
    [
      ready,
      state,
      revision,
      fromServer,
      uploadPinRequired,
      uploadWorkbook,
      updateSettings,
      clearData,
      patchAccount,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within DataProvider');
  }
  return ctx;
}
