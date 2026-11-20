import type { RequestHandler } from 'express';
import type { AccountsRepository } from '../repositories/AccountsRepository.js';

export function createHealthController(repo: AccountsRepository): {
  health: RequestHandler;
} {
  const health: RequestHandler = async (_req, res, next) => {
    try {
      const sheets = await repo.healthCheck();
      const status = sheets.ok ? 200 : 503;
      res.status(status).json({
        ok: sheets.ok,
        service: 'zerorez-api',
        sheets,
      });
    } catch (err) {
      next(err);
    }
  };

  return { health };
}
