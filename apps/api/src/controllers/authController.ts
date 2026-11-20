import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';

export function createAuthController(): { me: RequestHandler } {
  const me: RequestHandler = (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', 'Sign-in required', 401);
      }
      res.json({
        user: {
          email: req.user.email,
          name: req.user.name,
          picture: req.user.picture,
          role: req.user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  return { me };
}
