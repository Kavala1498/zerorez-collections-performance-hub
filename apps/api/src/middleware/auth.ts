import type { RequestHandler } from 'express';
import { DomainForbiddenError, userFromTokenPayload, type RolePolicy } from '../auth/roles.js';
import type { AuthUser, VerifyIdToken } from '../auth/types.js';
import { AppError } from '../errors/AppError.js';

export type AuthOptions = {
  disabled: boolean;
  /** Dev/test user when auth is disabled. */
  bypassUser: AuthUser;
  policy: RolePolicy;
  verifyIdToken: VerifyIdToken | null;
};

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export function createAuthMiddleware(options: AuthOptions): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (options.disabled) {
        req.user = { ...options.bypassUser };
        next();
        return;
      }

      if (!options.verifyIdToken) {
        throw new AppError(
          'INTERNAL_ERROR',
          'Google OAuth is not configured (GOOGLE_OAUTH_CLIENT_ID)',
          500,
        );
      }

      const token = bearerToken(req.header('authorization'));
      if (!token) {
        throw new AppError('UNAUTHORIZED', 'Sign-in required', 401);
      }

      let payload;
      try {
        payload = await options.verifyIdToken(token);
      } catch {
        throw new AppError('UNAUTHORIZED', 'Invalid or expired Google token', 401);
      }

      try {
        req.user = userFromTokenPayload(payload, options.policy);
      } catch (err) {
        if (err instanceof DomainForbiddenError) {
          throw new AppError('FORBIDDEN', err.message, 403);
        }
        throw err;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Require an authenticated user (runs after createAuthMiddleware). */
export const requireUser: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(new AppError('UNAUTHORIZED', 'Sign-in required', 401));
    return;
  }
  next();
};

export function requireRole(...roles: AuthUser['role'][]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError('UNAUTHORIZED', 'Sign-in required', 401));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(
        new AppError(
          'FORBIDDEN',
          'You do not have permission to perform this action',
          403,
        ),
      );
      return;
    }
    next();
  };
}
