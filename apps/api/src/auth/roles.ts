import type { AuthUser, TokenPayload, UserRole } from './types.js';

export type RolePolicy = {
  allowedDomain: string;
  adminEmails: Set<string>;
};

export function parseAdminEmails(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 0) return '';
  return email.slice(at + 1).toLowerCase();
}

export function resolveRole(email: string, adminEmails: Set<string>): UserRole {
  return adminEmails.has(email.trim().toLowerCase()) ? 'admin' : 'viewer';
}

export function assertAllowedDomain(email: string, allowedDomain: string): void {
  const domain = emailDomain(email);
  const expected = allowedDomain.trim().toLowerCase();
  if (!expected) return;
  if (domain !== expected) {
    throw new DomainForbiddenError(
      `Sign-in is limited to @${expected} accounts`,
    );
  }
}

export class DomainForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainForbiddenError';
  }
}

export function userFromTokenPayload(
  payload: TokenPayload,
  policy: RolePolicy,
): AuthUser {
  const email = payload.email.trim().toLowerCase();
  if (!payload.emailVerified) {
    throw new DomainForbiddenError('Email address is not verified');
  }
  assertAllowedDomain(email, policy.allowedDomain);

  // Prefer hosted-domain claim when Google Workspace returns it.
  if (payload.hd && policy.allowedDomain) {
    const hd = payload.hd.trim().toLowerCase();
    const expected = policy.allowedDomain.trim().toLowerCase();
    if (hd !== expected) {
      throw new DomainForbiddenError(
        `Sign-in is limited to @${expected} accounts`,
      );
    }
  }

  return {
    email,
    name: payload.name,
    picture: payload.picture,
    role: resolveRole(email, policy.adminEmails),
    sub: payload.sub,
  };
}
