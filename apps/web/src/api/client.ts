import type {
  AccountChangesResponse,
  AccountPatch,
  AccountPatchResponse,
  AlertsResponse,
  AnalyticsSegment,
  ApiErrorBody,
  BaseAccountsResponse,
  BaseAnalyticsResponse,
  BasesListResponse,
  DashboardResponse,
  TrendsResponse,
  UploadResult,
  UploadsListResponse,
} from './types';
import type { MeResponse } from '../auth/types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

let tokenProvider: (() => string | null) | null = null;

export function setAuthTokenProvider(provider: () => string | null): void {
  tokenProvider = provider;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorBody | null, fallback: string) {
    super(body?.error?.message ?? fallback);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error?.code ?? 'UNKNOWN';
    this.details = body?.error?.details;
  }
}

function authHeaders(): HeadersInit {
  const token = tokenProvider?.() ?? null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = null;
    }
  }
  if (!res.ok) {
    throw new ApiError(res.status, body as ApiErrorBody | null, res.statusText || 'Network error');
  }
  return body as T;
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const auth = authHeaders();
  for (const [k, v] of Object.entries(auth)) {
    headers.set(k, v);
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

function segmentQuery(segment: AnalyticsSegment): string {
  return `segment=${encodeURIComponent(segment)}`;
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await apiFetch('/api/me');
  return parseJson(res);
}

export async function fetchDashboard(segment: AnalyticsSegment): Promise<DashboardResponse> {
  const res = await apiFetch(`/api/dashboard?${segmentQuery(segment)}`);
  return parseJson(res);
}

export async function fetchBases(segment: AnalyticsSegment = 'all'): Promise<BasesListResponse> {
  const res = await apiFetch(`/api/bases?${segmentQuery(segment)}`);
  return parseJson(res);
}

export async function fetchBaseAnalytics(
  baseId: string,
  segment: AnalyticsSegment,
): Promise<BaseAnalyticsResponse> {
  const res = await apiFetch(
    `/api/bases/${encodeURIComponent(baseId)}/analytics?${segmentQuery(segment)}`,
  );
  return parseJson(res);
}

export async function fetchBaseAccounts(
  baseId: string,
  segment: AnalyticsSegment = 'all',
): Promise<BaseAccountsResponse> {
  const res = await apiFetch(
    `/api/bases/${encodeURIComponent(baseId)}/accounts?${segmentQuery(segment)}`,
  );
  return parseJson(res);
}

export async function fetchUploads(): Promise<UploadsListResponse> {
  const res = await apiFetch('/api/uploads');
  return parseJson(res);
}

export async function uploadWorkbook(input: {
  file: File;
  cutoffDate: string;
  stageMode: 'date' | 'label';
}): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('cutoffDate', input.cutoffDate);
  form.append('stageMode', input.stageMode);

  const res = await apiFetch('/api/uploads', {
    method: 'POST',
    body: form,
  });
  return parseJson(res);
}

export async function fetchTrends(
  segment: AnalyticsSegment,
  baseId?: string,
): Promise<TrendsResponse> {
  const params = new URLSearchParams({ segment });
  if (baseId) params.set('base', baseId);
  const res = await apiFetch(`/api/trends?${params.toString()}`);
  return parseJson(res);
}

export async function fetchBaseTrends(
  baseId: string,
  segment: AnalyticsSegment,
): Promise<TrendsResponse> {
  const res = await apiFetch(
    `/api/bases/${encodeURIComponent(baseId)}/trends?${segmentQuery(segment)}`,
  );
  return parseJson(res);
}

export async function fetchAlerts(
  segment: AnalyticsSegment,
  baseId?: string,
): Promise<AlertsResponse> {
  const params = new URLSearchParams({ segment });
  if (baseId) params.set('base', baseId);
  const res = await apiFetch(`/api/alerts?${params.toString()}`);
  return parseJson(res);
}

export async function patchAccount(
  accountId: string,
  patch: AccountPatch,
): Promise<AccountPatchResponse> {
  const res = await apiFetch(`/api/accounts/${encodeURIComponent(accountId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return parseJson(res);
}

export async function fetchAccountChanges(
  accountId: string,
): Promise<AccountChangesResponse> {
  const res = await apiFetch(`/api/accounts/${encodeURIComponent(accountId)}/changes`);
  return parseJson(res);
}
