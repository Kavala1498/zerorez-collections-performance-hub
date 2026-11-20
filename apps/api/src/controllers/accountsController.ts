import type { RequestHandler } from 'express';
import type { AccountService } from '../services/AccountService.js';
import { AppError } from '../errors/AppError.js';

export function createAccountsController(service: AccountService): {
  patch: RequestHandler;
  listChanges: RequestHandler;
} {
  const patch: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', 'Sign-in required', 401);
      }
      const accountId = String(req.params.id ?? '');
      const result = await service.patchAccount(accountId, req.body, {
        email: req.user.email,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  const listChanges: RequestHandler = async (req, res, next) => {
    try {
      const accountId = String(req.params.id ?? '');
      const changes = await service.listChanges(accountId);
      res.json({ accountId: decodeURIComponent(accountId), changes });
    } catch (err) {
      next(err);
    }
  };

  return { patch, listChanges };
}
