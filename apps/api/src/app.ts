import express from 'express';
import type { AccountsRepository } from './repositories/AccountsRepository.js';
import { createApiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './errors/errorHandler.js';
import { getEnv } from './config/env.js';

export type CreateAppOptions = {
  repository: AccountsRepository;
  corsOrigin?: string;
};

export function createApp(options: CreateAppOptions): express.Express {
  const app = express();
  const corsOrigin = options.corsOrigin ?? getEnv().CORS_ORIGIN;

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use('/api', createApiRouter(options.repository));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
