import { beforeEach, describe, expect, it } from 'vitest';
import {
  handleDeleteLatest,
  handleGetLatest,
  handlePostSnapshot,
} from '../_lib/handlers.js';
import { MemorySnapshotStore, resetMemoryStore } from '../_lib/memoryStore.js';
import { assertUploadPin } from '../_lib/pin.js';

const sampleBody = {
  cutoffDate: '2026-11-18',
  stageMode: 'date' as const,
  uploadedAt: '2026-11-20T12:00:00.000Z',
  filename: 'synthetic.xlsx',
  warnings: ['ignored tab Other'],
  accounts: [
    {
      id: 'a1',
      base: 'Phoenix',
      segment: 'R',
      client_name: 'Test',
      service_date: '2026-10-01',
      amount_due: 100,
      paid_amount: 0,
    },
  ],
  uploads: [
    {
      id: 'u1',
      filename: 'synthetic.xlsx',
      uploaded_at: '2026-11-20T12:00:00.000Z',
      cutoff_date: '2026-11-18',
      stage_mode: 'date',
      rows_read: 1,
      rows_loaded: 1,
      warnings: [],
    },
  ],
  snapshots: [],
};

describe('MemorySnapshotStore', () => {
  let store: MemorySnapshotStore;

  beforeEach(() => {
    resetMemoryStore();
    store = new MemorySnapshotStore();
  });

  it('returns null when empty', async () => {
    expect(await store.getLatest()).toBeNull();
  });

  it('saves and returns latest portfolio payload', async () => {
    const saved = await store.save(sampleBody);
    expect(saved.filename).toBe('synthetic.xlsx');
    expect(saved.payload.accounts).toHaveLength(1);

    const latest = await store.getLatest();
    expect(latest?.id).toBe(saved.id);
    expect(latest?.payload.accounts[0]).toMatchObject({ id: 'a1', base: 'Phoenix' });
  });

  it('clearLatest empties the store', async () => {
    await store.save(sampleBody);
    expect(await store.clearLatest()).toBe(true);
    expect(await store.getLatest()).toBeNull();
  });
});

describe('snapshot handlers (memory)', () => {
  beforeEach(() => {
    resetMemoryStore();
    delete process.env.UPLOAD_PIN;
    delete process.env.DATABASE_URL;
  });

  it('GET latest → 404 when empty', async () => {
    const store = new MemorySnapshotStore();
    const res = await handleGetLatest(store);
    expect(res.status).toBe(404);
  });

  it('POST then GET returns accounts for all viewers', async () => {
    const store = new MemorySnapshotStore();
    const post = await handlePostSnapshot({ body: sampleBody, pin: null, store });
    expect(post.status).toBe(201);

    const get = await handleGetLatest(store);
    expect(get.status).toBe(200);
    const body = get.body as { accounts: unknown[]; filename: string };
    expect(body.filename).toBe('synthetic.xlsx');
    expect(body.accounts).toHaveLength(1);
  });

  it('POST without PIN fails when UPLOAD_PIN is set', async () => {
    process.env.UPLOAD_PIN = 'secret-pin';
    const store = new MemorySnapshotStore();
    const res = await handlePostSnapshot({ body: sampleBody, pin: null, store });
    expect(res.status).toBe(401);
  });

  it('POST with correct PIN succeeds when UPLOAD_PIN is set', async () => {
    process.env.UPLOAD_PIN = 'secret-pin';
    const store = new MemorySnapshotStore();
    const res = await handlePostSnapshot({
      body: sampleBody,
      pin: 'secret-pin',
      store,
    });
    expect(res.status).toBe(201);
  });

  it('DELETE requires PIN when configured and clears data', async () => {
    process.env.UPLOAD_PIN = 'secret-pin';
    const store = new MemorySnapshotStore();
    await handlePostSnapshot({ body: sampleBody, pin: 'secret-pin', store });

    const denied = await handleDeleteLatest({ pin: 'wrong', store });
    expect(denied.status).toBe(403);

    const ok = await handleDeleteLatest({ pin: 'secret-pin', store });
    expect(ok.status).toBe(204);
    expect((await handleGetLatest(store)).status).toBe(404);
  });

  it('rejects invalid POST body', async () => {
    const store = new MemorySnapshotStore();
    const res = await handlePostSnapshot({
      body: { filename: 'x.xlsx' },
      pin: null,
      store,
    });
    expect(res.status).toBe(400);
  });
});

describe('assertUploadPin', () => {
  it('allows when pin unset', () => {
    expect(assertUploadPin(null, null).ok).toBe(true);
  });

  it('requires pin when expected', () => {
    expect(assertUploadPin('', 'abc')).toMatchObject({ ok: false, status: 401 });
    expect(assertUploadPin('nope', 'abc')).toMatchObject({ ok: false, status: 403 });
    expect(assertUploadPin('abc', 'abc').ok).toBe(true);
  });
});
