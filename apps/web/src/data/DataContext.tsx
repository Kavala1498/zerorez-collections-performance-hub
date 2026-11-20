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
  uploadWorkbook: (input: {
    file: File;
    cutoffDate: string;
    stageMode: StageMode;
  }) => Promise<UploadResult>;
  updateSettings: (input: { cutoffDate: string; stageMode: StageMode }) => Promise<void>;
  clearData: () => Promise<void>;
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadPortfolio();
      if (cancelled) return;
      setState(loaded);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: PortfolioState) => {
    setState(next);
    setRevision((r) => r + 1);
    await savePortfolio(next);
  }, []);

  const uploadWorkbook = useCallback(
    async (input: { file: File; cutoffDate: string; stageMode: StageMode }) => {
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

      // Keep prior snapshots for trends; replace accounts with the merged set.
      const next: PortfolioState = {
        accounts: merged,
        uploads: [...state.uploads.filter((u) => u.id !== uploadId), upload],
        snapshots: [
          ...state.snapshots.filter((s) => s.upload_id !== uploadId),
          ...snapshots,
        ],
      };
      await persist(next);

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
    [persist, state.accounts, state.snapshots, state.uploads],
  );

  const updateSettings = useCallback(
    async (input: { cutoffDate: string; stageMode: StageMode }) => {
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
      await persist(next);
    },
    [persist, state],
  );

  const clearData = useCallback(async () => {
    await clearPortfolio();
    setState(EMPTY);
    setRevision((r) => r + 1);
  }, []);

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
      await persist({ ...state, accounts });
      return updated;
    },
    [persist, state],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      ready,
      state,
      revision,
      uploadWorkbook,
      updateSettings,
      clearData,
      patchAccount,
    }),
    [ready, state, revision, uploadWorkbook, updateSettings, clearData, patchAccount],
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
