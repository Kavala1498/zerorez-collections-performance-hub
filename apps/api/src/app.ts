import express from 'express';
import { parseAdminEmails } from './auth/roles.js';
import type { AuthUser, VerifyIdToken } from './auth/types.js';
import { createGoogleIdTokenVerifier } from './auth/verifyGoogleToken.js';
import { getEnv } from './config/env.js';
import { errorHandler, notFoundHandler } from './errors/errorHandler.js';
import type { AuthOptions } from './middleware/auth.js';
import { applySecurity } from './middleware/security.js';
import type { AccountsRepository } from './repositories/AccountsRepository.js';
import { createApiRouter } from './routes/index.js';

export type CreateAppOptions = {
  repository: AccountsRepository;
  corsOrigin?: string;
  /** Override auth (tests). When omitted, env + Google verifier are used. */
  auth?: Partial<AuthOptions> & {
    verifyIdToken?: VerifyIdToken | null;
  };
  disableRateLimit?: boolean;
};

function buildAuthOptions(overrides?: CreateAppOptions['auth']): AuthOptions {
  const env = getEnv();
  const disabled = overrides?.disabled ?? env.authDisabled;
  const bypassUser: AuthUser = overrides?.bypassUser ?? {
    email: env.AUTH_BYPASS_EMAIL.toLowerCase(),
    name: env.AUTH_BYPASS_NAME,
    picture: null,
    role: env.AUTH_BYPASS_ROLE,
    sub: null,
  };

  const policy = overrides?.policy ?? {
    allowedDomain: env.AUTH_ALLOWED_DOMAIN,
    adminEmails: parseAdminEmails(env.AUTH_ADMIN_EMAILS),
  };

  let verifyIdToken: VerifyIdToken | null = null;
  if (overrides && 'verifyIdToken' in overrides) {
    verifyIdToken = overrides.verifyIdToken ?? null;
  } else if (env.GOOGLE_OAUTH_CLIENT_ID) {
    verifyIdToken = createGoogleIdTokenVerifier(env.GOOGLE_OAUTH_CLIENT_ID);
  }

  return {
    disabled,
    bypassUser,
    policy,
    verifyIdToken,
  };
}

export function createApp(options: CreateAppOptions): express.Express {
  const app = express();
  const corsOrigin = options.corsOrigin ?? getEnv().CORS_ORIGIN;
  const auth = buildAuthOptions(options.auth);

  applySecurity(app, {
    corsOrigin,
    disableRateLimit: options.disableRateLimit ?? getEnv().NODE_ENV === 'test',
  });

  app.use(express.json({ limit: '1mb' }));
  app.use('/api', createApiRouter({ repository: options.repository, auth }));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
