import { Router } from 'express';
import type { AccountsRepository } from '../repositories/AccountsRepository.js';
import { createAnalyticsController } from '../controllers/analyticsController.js';
import { createHealthController } from '../controllers/healthController.js';
import { createUploadsController } from '../controllers/uploadsController.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { AnalyticsService } from '../services/AnalyticsService.js';
import { UploadService } from '../services/UploadService.js';

export function createApiRouter(repo: AccountsRepository): Router {
  const router = Router();
  const uploadService = new UploadService(repo);
  const analyticsService = new AnalyticsService(repo);
  const uploads = createUploadsController(uploadService);
  const analytics = createAnalyticsController(analyticsService);
  const health = createHealthController(repo);

  router.get('/health', health.health);
  router.get('/uploads', uploads.list);
  router.post('/uploads', uploadMiddleware.single('file'), uploads.create);

  router.get('/dashboard', analytics.dashboard);
  router.get('/bases', analytics.listBases);
  router.get('/bases/:id/analytics', analytics.baseAnalytics);
  router.get('/bases/:id/accounts', analytics.baseAccounts);
  router.get('/trends', analytics.trends);

  return router;
}
