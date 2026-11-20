/**
 * Optional upload gate. When UPLOAD_PIN is unset, uploads are open
 * (documented risk for shared deployments).
 */
export function assertUploadPin(
  provided: string | null | undefined,
  expected: string | null,
): { ok: true } | { ok: false; status: number; code: string; message: string } {
  if (!expected) {
    return { ok: true };
  }
  const pin = (provided ?? '').trim();
  if (!pin) {
    return {
      ok: false,
      status: 401,
      code: 'PIN_REQUIRED',
      message: 'Upload PIN required. Send header x-upload-pin.',
    };
  }
  if (pin !== expected) {
    return {
      ok: false,
      status: 403,
      code: 'PIN_INVALID',
      message: 'Invalid upload PIN.',
    };
  }
  return { ok: true };
}

export function readPinFromHeaders(
  headers: Record<string, string | string[] | undefined> | Headers,
): string | null {
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get('x-upload-pin');
  }
  const raw = (headers as Record<string, string | string[] | undefined>)['x-upload-pin']
    ?? (headers as Record<string, string | string[] | undefined>)['X-Upload-Pin'];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}
