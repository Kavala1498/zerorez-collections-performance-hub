import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';
import { UploadMetaSchema, type UploadService } from '../services/UploadService.js';

export function createUploadsController(service: UploadService): {
  list: RequestHandler;
  create: RequestHandler;
} {
  const list: RequestHandler = async (_req, res, next) => {
    try {
      const uploads = await service.listUploads();
      res.json({ uploads });
    } catch (err) {
      next(err);
    }
  };

  const create: RequestHandler = async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        throw new AppError('BAD_REQUEST', 'Missing .xlsx file field "file"', 400);
      }

      const meta = UploadMetaSchema.parse({
        cutoffDate: req.body?.cutoffDate,
        stageMode: req.body?.stageMode ?? 'date',
        uploadedBy: req.user?.email ?? req.body?.uploadedBy,
      });

      const result = await service.processUpload(
        { buffer: file.buffer, originalname: file.originalname },
        meta,
      );

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  return { list, create };
}
