import cors from 'cors';
import type { Express, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export type SecurityOptions = {
  corsOrigin: string;
  /** Skip rate limiting (tests). */
  disableRateLimit?: boolean;
};

export function applySecurity(app: Express, options: SecurityOptions): void {
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const origins = options.corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: origins.includes('*')
        ? true
        : origins.length === 1
          ? origins[0]
          : origins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );

  if (!options.disableRateLimit) {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests — try again later',
        },
      },
    });
    app.use(limiter);

    const uploadLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Upload rate limit exceeded — try again later',
        },
      },
    });
    app.use('/api/uploads', uploadLimiter as RequestHandler);
  }
}
