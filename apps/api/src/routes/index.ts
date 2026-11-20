import { Router } from 'express';
import type { AccountsRepository } from '../repositories/AccountsRepository.js';
import { createAnalyticsController } from '../controllers/analyticsController.js';
import { createAuthController } from '../controllers/authController.js';
import { createHealthController } from '../controllers/healthController.js';
import { createUploadsController } from '../controllers/uploadsController.js';
import {
  createAuthMiddleware,
  requireRole,
  type AuthOptions,
} from '../middleware/auth.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { AnalyticsService } from '../services/AnalyticsService.js';
import { UploadService } from '../services/UploadService.js';

export type ApiRouterOptions = {
  repository: AccountsRepository;
  auth: AuthOptions;
};

export function createApiRouter(options: ApiRouterOptions): Router {
  const { repository: repo, auth } = options;
  const router = Router();
  const uploadService = new UploadService(repo);
  const analyticsService = new AnalyticsService(repo);
  const uploads = createUploadsController(uploadService);
  const analytics = createAnalyticsController(analyticsService);
  const health = createHealthController(repo);
  const authCtrl = createAuthController();
  const requireAuth = createAuthMiddleware(auth);

  // Public health probe (no auth) for load balancers / Cloud Run.
  router.get('/health', health.health);

  router.use(requireAuth);

  router.get('/me', authCtrl.me);

  router.get('/uploads', uploads.list);
  router.post(
    '/uploads',
    requireRole('admin'),
    uploadMiddleware.single('file'),
    uploads.create,
  );

  router.get('/dashboard', analytics.dashboard);
  router.get('/bases', analytics.listBases);
  router.get('/bases/:id/analytics', analytics.baseAnalytics);
  router.get('/bases/:id/accounts', analytics.baseAccounts);
  router.get('/trends', analytics.trends);

  return router;
}
