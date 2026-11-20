import type { Account, AccountChange, Snapshot, Upload } from '@zerorez/shared';

export const ACCOUNT_COLUMNS = [
  'id',
  'base',
  'segment',
  'client_name',
  'company_name',
  'service_date',
  'amount_due',
  'paid_amount',
  'invoice_number',
  'client_url',
  'invoice_url',
  'technician',
  'status',
  'accountability',
  'terms',
  'last_contacted',
  'next_action',
  'next_action_date',
  'acc_notes',
  'bm_notes',
  'upload_id',
  'first_seen',
  'last_seen',
  'resolved_at',
  'updated_by',
  'updated_at',
] as const;

export const BASE_COLUMNS = ['id', 'name', 'aliases'] as const;

export const UPLOAD_COLUMNS = [
  'id',
  'filename',
  'uploaded_at',
  'uploaded_by',
  'cutoff_date',
  'stage_mode',
  'rows_read',
  'rows_loaded',
  'warnings',
] as const;

export const SNAPSHOT_COLUMNS = [
  'upload_id',
  'cutoff_date',
  'base',
  'segment',
  'stage',
  'accounts',
  'amount',
] as const;

export const SETTINGS_COLUMNS = ['key', 'value'] as const;

export const ACCOUNT_CHANGE_COLUMNS = [
  'id',
  'account_id',
  'changed_at',
  'changed_by',
  'changes',
] as const;

export const SHEET_TABS = [
  'accounts',
  'bases',
  'uploads',
  'snapshots',
  'settings',
  'account_changes',
] as const;

export type SheetTab = (typeof SHEET_TABS)[number];

function cell(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

function emptyToNull(value: string | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseNumber(value: string | undefined, fallback = 0): number {
  if (value == null || value.trim() === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseWarnings(raw: string | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // fall through — treat as pipe-separated
  }
  return raw.split('|').map((s) => s.trim()).filter(Boolean);
}

export function accountToRow(account: Account): string[] {
  return ACCOUNT_COLUMNS.map((col) => {
    const v = account[col as keyof Account];
    if (v == null) return '';
    return String(v);
  });
}

export function rowToAccount(row: string[]): Account {
  const get = (i: number) => row[i] ?? '';
  return {
    id: get(0),
    base: get(1),
    segment: (get(2) === 'R' ? 'R' : 'C') as Account['segment'],
    client_name: get(3),
    company_name: emptyToNull(get(4)),
    service_date: get(5),
    amount_due: parseNumber(get(6)),
    paid_amount: parseNumber(get(7), 0),
    invoice_number: emptyToNull(get(8)),
    client_url: emptyToNull(get(9)),
    invoice_url: emptyToNull(get(10)),
    technician: emptyToNull(get(11)),
    status: emptyToNull(get(12)),
    accountability: emptyToNull(get(13)),
    terms: emptyToNull(get(14)),
    last_contacted: emptyToNull(get(15)),
    next_action: emptyToNull(get(16)),
    next_action_date: emptyToNull(get(17)),
    acc_notes: emptyToNull(get(18)),
    bm_notes: emptyToNull(get(19)),
    upload_id: emptyToNull(get(20)),
    first_seen: emptyToNull(get(21)),
    last_seen: emptyToNull(get(22)),
    resolved_at: emptyToNull(get(23)),
    updated_by: emptyToNull(get(24)),
    updated_at: emptyToNull(get(25)),
  };
}

export function accountChangeToRow(change: AccountChange): string[] {
  return [
    change.id,
    change.account_id,
    change.changed_at,
    change.changed_by,
    JSON.stringify(change.changes),
  ];
}

export function rowToAccountChange(row: string[]): AccountChange {
  const get = (i: number) => row[i] ?? '';
  let changes: AccountChange['changes'] = [];
  const raw = get(4);
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        changes = parsed.map((entry) => {
          const e = entry as { field?: unknown; from?: unknown; to?: unknown };
          return {
            field: String(e.field ?? ''),
            from: e.from == null || e.from === '' ? null : String(e.from),
            to: e.to == null || e.to === '' ? null : String(e.to),
          };
        });
      }
    } catch {
      changes = [];
    }
  }
  return {
    id: get(0),
    account_id: get(1),
    changed_at: get(2),
    changed_by: get(3),
    changes,
  };
}

export function uploadToRow(upload: Upload): string[] {
  return [
    upload.id,
    upload.filename,
    upload.uploaded_at,
    upload.uploaded_by ?? '',
    upload.cutoff_date,
    upload.stage_mode,
    String(upload.rows_read),
    String(upload.rows_loaded),
    JSON.stringify(upload.warnings ?? []),
  ];
}

export function rowToUpload(row: string[]): Upload {
  const get = (i: number) => row[i] ?? '';
  return {
    id: get(0),
    filename: get(1),
    uploaded_at: get(2),
    uploaded_by: emptyToNull(get(3)),
    cutoff_date: get(4),
    stage_mode: get(5) === 'label' ? 'label' : 'date',
    rows_read: parseNumber(get(6), 0),
    rows_loaded: parseNumber(get(7), 0),
    warnings: parseWarnings(get(8)),
  };
}

export function snapshotToRow(snapshot: Snapshot): string[] {
  return [
    snapshot.upload_id,
    snapshot.cutoff_date,
    snapshot.base,
    snapshot.segment,
    String(snapshot.stage),
    String(snapshot.accounts),
    String(snapshot.amount),
  ];
}

export function rowToSnapshot(row: string[]): Snapshot {
  const get = (i: number) => row[i] ?? '';
  const stageNum = parseNumber(get(4), 1);
  const stage = ([1, 2, 3, 4, 5].includes(stageNum) ? stageNum : 1) as Snapshot['stage'];
  return {
    upload_id: get(0),
    cutoff_date: get(1),
    base: get(2),
    segment: get(3) === 'R' ? 'R' : 'C',
    stage,
    accounts: parseNumber(get(5), 0),
    amount: parseNumber(get(6), 0),
  };
}

export function headerRow(columns: readonly string[]): string[] {
  return columns.map(cell);
}
