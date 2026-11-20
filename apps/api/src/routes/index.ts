import { Router } from 'express';
import type { AccountsRepository } from '../repositories/AccountsRepository.js';
import { createHealthController } from '../controllers/healthController.js';
import { createUploadsController } from '../controllers/uploadsController.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { UploadService } from '../services/UploadService.js';

export function createApiRouter(repo: AccountsRepository): Router {
  const router = Router();
  const uploadService = new UploadService(repo);
  const uploads = createUploadsController(uploadService);
  const health = createHealthController(repo);

  router.get('/health', health.health);
  router.get('/uploads', uploads.list);
  router.post('/uploads', uploadMiddleware.single('file'), uploads.create);

  return router;
}
