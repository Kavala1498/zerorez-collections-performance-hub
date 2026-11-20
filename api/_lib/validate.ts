import { z } from 'zod';
import type { SnapshotPostBody } from './types.js';

/** Lightweight payload check — avoids pulling exceljs via @zerorez/shared into serverless. */
const SnapshotPostBodySchema = z.object({
  cutoffDate: z.string().min(1),
  stageMode: z.enum(['date', 'label']),
  uploadedAt: z.string().min(1),
  filename: z.string().min(1),
  warnings: z.array(z.string()).optional(),
  accounts: z.array(z.record(z.unknown())),
  uploads: z.array(z.record(z.unknown())).optional(),
  snapshots: z.array(z.record(z.unknown())).optional(),
});

export function parseSnapshotPostBody(
  raw: unknown,
): { ok: true; data: SnapshotPostBody } | { ok: false; message: string; details?: unknown } {
  const parsed = SnapshotPostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Invalid snapshot payload',
      details: parsed.error.flatten(),
    };
  }
  return { ok: true, data: parsed.data as SnapshotPostBody };
}
