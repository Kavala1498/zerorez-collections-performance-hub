import { createSnapshotStore } from './createStore.js';
import { readEnv } from './env.js';
import { assertUploadPin } from './pin.js';
import type { SnapshotStore } from './store.js';
import { toLatestResponse } from './store.js';
import { parseSnapshotPostBody } from './validate.js';

export type HandlerResult = {
  status: number;
  body: unknown;
};

function error(status: number, code: string, message: string): HandlerResult {
  return { status, body: { error: { code, message } } };
}

export async function handleGetLatest(store?: SnapshotStore): Promise<HandlerResult> {
  const s = store ?? createSnapshotStore();
  const latest = await s.getLatest();
  if (!latest) {
    return error(404, 'NOT_FOUND', 'No snapshot uploaded yet');
  }
  return { status: 200, body: toLatestResponse(latest) };
}

export async function handlePostSnapshot(input: {
  body: unknown;
  pin: string | null;
  store?: SnapshotStore;
}): Promise<HandlerResult> {
  const env = readEnv();
  const pinCheck = assertUploadPin(input.pin, env.uploadPin);
  if (!pinCheck.ok) {
    return error(pinCheck.status, pinCheck.code, pinCheck.message);
  }

  const parsed = parseSnapshotPostBody(input.body);
  if (!parsed.ok) {
    return {
      status: 400,
      body: { error: { code: 'BAD_REQUEST', message: parsed.message, details: parsed.details } },
    };
  }

  const s = input.store ?? createSnapshotStore();
  const saved = await s.save(parsed.data);
  return { status: 201, body: toLatestResponse(saved) };
}

export async function handleDeleteLatest(input: {
  pin: string | null;
  store?: SnapshotStore;
}): Promise<HandlerResult> {
  const env = readEnv();
  const pinCheck = assertUploadPin(input.pin, env.uploadPin);
  if (!pinCheck.ok) {
    return error(pinCheck.status, pinCheck.code, pinCheck.message);
  }
  const s = input.store ?? createSnapshotStore();
  const cleared = await s.clearLatest();
  if (!cleared) {
    return error(404, 'NOT_FOUND', 'No snapshot to clear');
  }
  return { status: 204, body: null };
}
