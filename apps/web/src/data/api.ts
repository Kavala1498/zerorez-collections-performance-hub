import type { Account, PortfolioState, Snapshot, StageMode, Upload } from '@zerorez/shared';

export type SnapshotLatest = {
  id: string;
  createdAt: string;
  cutoffDate: string;
  stageMode: StageMode;
  filename: string | null;
  uploadedAt: string;
  warnings: string[];
  accounts: Account[];
  uploads: Upload[];
  snapshots: Snapshot[];
};

export type SnapshotPostPayload = {
  cutoffDate: string;
  stageMode: StageMode;
  uploadedAt: string;
  filename: string;
  warnings: string[];
  accounts: Account[];
  uploads: Upload[];
  snapshots: Snapshot[];
};

export type ApiHealth = {
  ok: boolean;
  store: 'postgres' | 'memory';
  uploadPinRequired: boolean;
};

function apiBase(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';
  return raw.replace(/\/$/, '');
}

function url(path: string): string {
  return `${apiBase()}${path}`;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    return new ApiError(
      res.status,
      body.error?.code ?? 'ERROR',
      body.error?.message ?? res.statusText,
    );
  } catch {
    return new ApiError(res.status, 'ERROR', res.statusText || 'Request failed');
  }
}

export async function fetchHealth(): Promise<ApiHealth> {
  const res = await fetch(url('/api/health'));
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as ApiHealth;
}

/** GET latest shared snapshot. Returns null when none exists (404). */
export async function fetchLatestSnapshot(): Promise<SnapshotLatest | null> {
  const res = await fetch(url('/api/snapshots/latest'));
  if (res.status === 404) return null;
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as SnapshotLatest;
}

export async function postSnapshot(
  payload: SnapshotPostPayload,
  pin: string | null,
): Promise<SnapshotLatest> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (pin) headers['x-upload-pin'] = pin;
  const res = await fetch(url('/api/snapshots'), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as SnapshotLatest;
}

export async function deleteLatestSnapshot(pin: string | null): Promise<void> {
  const headers: Record<string, string> = {};
  if (pin) headers['x-upload-pin'] = pin;
  const res = await fetch(url('/api/snapshots/latest'), {
    method: 'DELETE',
    headers,
  });
  if (res.status === 404) return;
  if (res.status === 204) return;
  if (!res.ok) throw await parseError(res);
}

export function latestToPortfolio(latest: SnapshotLatest): PortfolioState {
  return {
    accounts: latest.accounts ?? [],
    uploads: latest.uploads ?? [],
    snapshots: latest.snapshots ?? [],
  };
}

const PIN_KEY = 'zr_upload_pin';

export function loadStoredPin(): string {
  try {
    return sessionStorage.getItem(PIN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveStoredPin(pin: string): void {
  try {
    if (pin) sessionStorage.setItem(PIN_KEY, pin);
    else sessionStorage.removeItem(PIN_KEY);
  } catch {
    // ignore
  }
}
