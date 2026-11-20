import multer from 'multer';
import { AppError } from '../errors/AppError.js';

const MAX_BYTES = 10 * 1024 * 1024;

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const okMime =
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/octet-stream' ||
      file.mimetype === '';
    if (name.endsWith('.xlsx') && okMime) {
      cb(null, true);
      return;
    }
    cb(new AppError('UNSUPPORTED_MEDIA', 'Only .xlsx files are accepted', 415));
  },
});
