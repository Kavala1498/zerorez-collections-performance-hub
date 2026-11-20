import type {
  AnalyticsSegment,
  ApiErrorBody,
  BaseAccountsResponse,
  BaseAnalyticsResponse,
  BasesListResponse,
  DashboardResponse,
  UploadResult,
  UploadsListResponse,
} from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

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

function segmentQuery(segment: AnalyticsSegment): string {
  return `segment=${encodeURIComponent(segment)}`;
}

export async function fetchDashboard(segment: AnalyticsSegment): Promise<DashboardResponse> {
  const res = await fetch(`${API_BASE}/api/dashboard?${segmentQuery(segment)}`);
  return parseJson(res);
}

export async function fetchBases(segment: AnalyticsSegment = 'all'): Promise<BasesListResponse> {
  const res = await fetch(`${API_BASE}/api/bases?${segmentQuery(segment)}`);
  return parseJson(res);
}

export async function fetchBaseAnalytics(
  baseId: string,
  segment: AnalyticsSegment,
): Promise<BaseAnalyticsResponse> {
  const res = await fetch(
    `${API_BASE}/api/bases/${encodeURIComponent(baseId)}/analytics?${segmentQuery(segment)}`,
  );
  return parseJson(res);
}

export async function fetchBaseAccounts(
  baseId: string,
  segment: AnalyticsSegment = 'all',
): Promise<BaseAccountsResponse> {
  const res = await fetch(
    `${API_BASE}/api/bases/${encodeURIComponent(baseId)}/accounts?${segmentQuery(segment)}`,
  );
  return parseJson(res);
}

export async function fetchUploads(): Promise<UploadsListResponse> {
  const res = await fetch(`${API_BASE}/api/uploads`);
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

  const res = await fetch(`${API_BASE}/api/uploads`, {
    method: 'POST',
    body: form,
  });
  return parseJson(res);
}
