import { randomUUID } from 'node:crypto';
import { StageModeSchema, type StageMode, type Upload } from '@zerorez/shared';
import { z } from 'zod';
import { AppError } from '../errors/AppError.js';
import { parseWorkbook } from '../parsers/excelParser.js';
import type { AccountsRepository } from '../repositories/AccountsRepository.js';
import { buildSnapshotsForUpload, mergeAccountsForUpload } from './uploadMerge.js';

export const UploadMetaSchema = z.object({
  cutoffDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'cutoffDate must be YYYY-MM-DD'),
  stageMode: StageModeSchema.default('date'),
  uploadedBy: z.string().optional(),
});

export type UploadMeta = z.infer<typeof UploadMetaSchema>;

export type UploadResult = {
  upload: Upload;
  rowsRead: number;
  rowsLoaded: number;
  warnings: string[];
  snapshotsCreated: number;
  accountsOpen: number;
  accountsResolved: number;
};

export class UploadService {
  constructor(private readonly repo: AccountsRepository) {}

  async listUploads(): Promise<Upload[]> {
    const uploads = await this.repo.listUploads();
    return uploads.sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  }

  async processUpload(
    file: { buffer: Buffer; originalname: string },
    meta: UploadMeta,
  ): Promise<UploadResult> {
    if (!file?.buffer?.length) {
      throw new AppError('BAD_REQUEST', 'Missing .xlsx file', 400);
    }

    const parsedMeta = UploadMetaSchema.parse(meta);
    const parsed = await parseWorkbook(file.buffer);
    const uploadId = randomUUID();
    const nowIso = new Date().toISOString();

    const existing = await this.repo.listAccounts();
    const merged = mergeAccountsForUpload({
      existing,
      incoming: parsed.accounts,
      uploadId,
      nowIso,
    });

    const snapshots = buildSnapshotsForUpload({
      accounts: merged,
      uploadId,
      cutoffDate: parsedMeta.cutoffDate,
    });

    const upload: Upload = {
      id: uploadId,
      filename: file.originalname,
      uploaded_at: nowIso,
      uploaded_by: parsedMeta.uploadedBy ?? null,
      cutoff_date: parsedMeta.cutoffDate,
      stage_mode: parsedMeta.stageMode as StageMode,
      rows_read: parsed.stats.rowsRead,
      rows_loaded: parsed.stats.rowsLoaded,
      warnings: parsed.warnings,
    };

    await this.repo.persistUpload({
      accounts: merged,
      upload,
      snapshots,
    });

    return {
      upload,
      rowsRead: parsed.stats.rowsRead,
      rowsLoaded: parsed.stats.rowsLoaded,
      warnings: parsed.warnings,
      snapshotsCreated: snapshots.length,
      accountsOpen: merged.filter((a) => !a.resolved_at).length,
      accountsResolved: merged.filter((a) => a.resolved_at).length,
    };
  }
}
