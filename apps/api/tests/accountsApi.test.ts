import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Account, Upload } from '@zerorez/shared';
import {
  parseAdminEmails,
} from '../src/auth/roles.js';
import type { TokenPayload, VerifyIdToken } from '../src/auth/types.js';
import { createApp } from '../src/app.js';
import { InMemoryAccountsRepository } from '../src/repositories/InMemoryAccountsRepository.js';

const adminPayload: TokenPayload = {
  email: 'admin@zerorez.com',
  emailVerified: true,
  name: 'Admin User',
  picture: null,
  hd: 'zerorez.com',
  sub: 'sub-admin',
};

const viewerPayload: TokenPayload = {
  email: 'viewer@zerorez.com',
  emailVerified: true,
  name: 'Viewer User',
  picture: null,
  hd: 'zerorez.com',
  sub: 'sub-viewer',
};

function mockVerifier(map: Record<string, TokenPayload>): VerifyIdToken {
  return async (token: string) => {
    const payload = map[token];
    if (!payload) throw new Error('bad token');
    return payload;
  };
}

function account(
  partial: Partial<Account> &
    Pick<Account, 'id' | 'base' | 'segment' | 'client_name' | 'service_date' | 'amount_due'>,
): Account {
  return {
    paid_amount: 0,
    resolved_at: null,
    status: null,
    last_contacted: null,
    next_action: null,
    next_action_date: null,
    acc_notes: null,
    ...partial,
  };
}

function buildApp() {
  const repo = new InMemoryAccountsRepository();
  const upload: Upload = {
    id: 'up-1',
    filename: 'seed.xlsx',
    uploaded_at: '2026-11-18T12:00:00.000Z',
    uploaded_by: null,
    cutoff_date: '2026-11-18',
    stage_mode: 'date',
    rows_read: 1,
    rows_loaded: 1,
    warnings: [],
  };
  repo.seed({
    uploads: [upload],
    accounts: [
      account({
        id: 'Dallas|INV-1',
        base: 'Dallas',
        segment: 'C',
        client_name: 'Big Co',
        service_date: '2026-09-29',
        amount_due: 4000,
        status: 'P2P',
        next_action: 'Call',
        next_action_date: '2026-11-10',
        last_contacted: '2026-11-01',
        acc_notes: 'Old note',
      }),
    ],
  });

  const verify = mockVerifier({
    'token-admin': adminPayload,
    'token-viewer': viewerPayload,
  });

  const app = createApp({
    repository: repo,
    corsOrigin: '*',
    disableRateLimit: true,
    auth: {
      disabled: false,
      policy: {
        allowedDomain: 'zerorez.com',
        adminEmails: parseAdminEmails('admin@zerorez.com'),
      },
      verifyIdToken: verify,
    },
  });

  return { app, repo };
}

describe('PATCH /api/accounts/:id (Phase 7)', () => {
  it('admin can edit CRM fields and records an audit change', async () => {
    const { app, repo } = buildApp();
    const res = await request(app)
      .patch(`/api/accounts/${encodeURIComponent('Dallas|INV-1')}`)
      .set('Authorization', 'Bearer token-admin')
      .send({
        status: 'Escalated',
        next_action: 'Legal review',
        next_action_date: '2026-11-25',
        notes: 'Customer disputed invoice',
        last_contacted: '2026-11-19',
      });

    expect(res.status).toBe(200);
    expect(res.body.account.status).toBe('Escalated');
    expect(res.body.account.next_action).toBe('Legal review');
    expect(res.body.account.next_action_date).toBe('2026-11-25');
    expect(res.body.account.acc_notes).toBe('Customer disputed invoice');
    expect(res.body.account.last_contacted).toBe('2026-11-19');
    expect(res.body.account.updated_by).toBe('admin@zerorez.com');
    expect(res.body.account.updated_at).toBeTruthy();
    expect(res.body.change.changed_by).toBe('admin@zerorez.com');
    expect(res.body.change.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'status', from: 'P2P', to: 'Escalated' }),
        expect.objectContaining({ field: 'notes', from: 'Old note', to: 'Customer disputed invoice' }),
      ]),
    );

    const stored = await repo.listAccounts();
    expect(stored[0]?.status).toBe('Escalated');
    const changes = await repo.listAccountChanges('Dallas|INV-1');
    expect(changes).toHaveLength(1);
  });

  it('viewer cannot PATCH accounts', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .patch(`/api/accounts/${encodeURIComponent('Dallas|INV-1')}`)
      .set('Authorization', 'Bearer token-viewer')
      .send({ status: 'Escalated' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 for unknown account', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .patch(`/api/accounts/${encodeURIComponent('Dallas|MISSING')}`)
      .set('Authorization', 'Bearer token-admin')
      .send({ status: 'P2P' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects empty PATCH body', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .patch(`/api/accounts/${encodeURIComponent('Dallas|INV-1')}`)
      .set('Authorization', 'Bearer token-admin')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists account change history', async () => {
    const { app } = buildApp();
    await request(app)
      .patch(`/api/accounts/${encodeURIComponent('Dallas|INV-1')}`)
      .set('Authorization', 'Bearer token-admin')
      .send({ status: 'Escalated' });

    const res = await request(app)
      .get(`/api/accounts/${encodeURIComponent('Dallas|INV-1')}/changes`)
      .set('Authorization', 'Bearer token-admin');
    expect(res.status).toBe(200);
    expect(res.body.changes).toHaveLength(1);
    expect(res.body.changes[0].changes[0].field).toBe('status');
  });
});
