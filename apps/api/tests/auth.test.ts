import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  assertAllowedDomain,
  DomainForbiddenError,
  parseAdminEmails,
  resolveRole,
  userFromTokenPayload,
} from '../src/auth/roles.js';
import type { TokenPayload, VerifyIdToken } from '../src/auth/types.js';
import { createApp } from '../src/app.js';
import { InMemoryAccountsRepository } from '../src/repositories/InMemoryAccountsRepository.js';
import { buildSyntheticWorkbook } from './fixtures/buildSyntheticWorkbook.js';

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

const outsiderPayload: TokenPayload = {
  email: 'someone@gmail.com',
  emailVerified: true,
  name: 'Outsider',
  picture: null,
  hd: null,
  sub: 'sub-out',
};

function mockVerifier(map: Record<string, TokenPayload>): VerifyIdToken {
  return async (token: string) => {
    const payload = map[token];
    if (!payload) throw new Error('bad token');
    return payload;
  };
}

function buildAuthedApp(verifyIdToken: VerifyIdToken) {
  const repo = new InMemoryAccountsRepository();
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
      verifyIdToken,
    },
  });
  return { app, repo };
}

describe('role helpers', () => {
  it('parses admin email allowlist', () => {
    const set = parseAdminEmails(' Admin@Zerorez.com , ops@zerorez.com ');
    expect(set.has('admin@zerorez.com')).toBe(true);
    expect(set.has('ops@zerorez.com')).toBe(true);
    expect(resolveRole('admin@zerorez.com', set)).toBe('admin');
    expect(resolveRole('viewer@zerorez.com', set)).toBe('viewer');
  });

  it('rejects emails outside the allowed domain', () => {
    expect(() => assertAllowedDomain('a@gmail.com', 'zerorez.com')).toThrow(
      DomainForbiddenError,
    );
    expect(() => assertAllowedDomain('a@zerorez.com', 'zerorez.com')).not.toThrow();
  });

  it('builds user from token payload with role', () => {
    const user = userFromTokenPayload(adminPayload, {
      allowedDomain: 'zerorez.com',
      adminEmails: parseAdminEmails('admin@zerorez.com'),
    });
    expect(user.role).toBe('admin');
    expect(user.email).toBe('admin@zerorez.com');
  });
});

describe('auth middleware + upload role gate', () => {
  const verify = mockVerifier({
    'token-admin': adminPayload,
    'token-viewer': viewerPayload,
    'token-out': outsiderPayload,
  });

  it('GET /api/health stays public', async () => {
    const { app } = buildAuthedApp(verify);
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects protected routes without a bearer token', async () => {
    const { app } = buildAuthedApp(verify);
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects invalid tokens', async () => {
    const { app } = buildAuthedApp(verify);
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer token-unknown');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects users outside the company domain', async () => {
    const { app } = buildAuthedApp(verify);
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer token-out');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns role on GET /api/me', async () => {
    const { app } = buildAuthedApp(verify);
    const admin = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer token-admin');
    expect(admin.status).toBe(200);
    expect(admin.body.user.role).toBe('admin');
    expect(admin.body.user.email).toBe('admin@zerorez.com');

    const viewer = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer token-viewer');
    expect(viewer.status).toBe(200);
    expect(viewer.body.user.role).toBe('viewer');
  });

  it('allows admin to POST /api/uploads and forbids viewer', async () => {
    const { app } = buildAuthedApp(verify);
    const workbook = await buildSyntheticWorkbook();

    const denied = await request(app)
      .post('/api/uploads')
      .set('Authorization', 'Bearer token-viewer')
      .field('cutoffDate', '2026-11-18')
      .field('stageMode', 'date')
      .attach('file', workbook, 'synthetic.xlsx');
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');

    const allowed = await request(app)
      .post('/api/uploads')
      .set('Authorization', 'Bearer token-admin')
      .field('cutoffDate', '2026-11-18')
      .field('stageMode', 'date')
      .attach('file', workbook, 'synthetic.xlsx');
    expect(allowed.status).toBe(201);
    expect(allowed.body.upload.uploaded_by).toBe('admin@zerorez.com');
  });

  it('lets viewers read dashboard data', async () => {
    const { app } = buildAuthedApp(verify);
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', 'Bearer token-viewer');
    expect(res.status).toBe(200);
    expect(res.body.kpis).toBeDefined();
  });
});
