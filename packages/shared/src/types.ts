import { z } from 'zod';

export const SegmentSchema = z.enum(['C', 'R']);
export type Segment = z.infer<typeof SegmentSchema>;

export const AllowedStatusSchema = z.enum([
  'P2P',
  'Escalated',
  'Legal Demand Letter Requested',
  'Legal Demand Letter Sent',
  'Payment Collected',
  'Sent to Collections',
]);
export type AllowedStatus = z.infer<typeof AllowedStatusSchema>;

export const StageModeSchema = z.enum(['date', 'label']);
export type StageMode = z.infer<typeof StageModeSchema>;

export const AccountSchema = z.object({
  id: z.string().min(1),
  base: z.string().min(1),
  segment: SegmentSchema,
  client_name: z.string().min(1),
  company_name: z.string().nullable().optional(),
  service_date: z.string().min(1),
  amount_due: z.number(),
  paid_amount: z.number().default(0),
  invoice_number: z.string().nullable().optional(),
  client_url: z.string().nullable().optional(),
  invoice_url: z.string().nullable().optional(),
  technician: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  accountability: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  last_contacted: z.string().nullable().optional(),
  next_action: z.string().nullable().optional(),
  next_action_date: z.string().nullable().optional(),
  acc_notes: z.string().nullable().optional(),
  bm_notes: z.string().nullable().optional(),
  upload_id: z.string().nullable().optional(),
  first_seen: z.string().nullable().optional(),
  last_seen: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  /** Last CRM editor (email). Set by PATCH /api/accounts/:id. */
  updated_by: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});
export type Account = z.infer<typeof AccountSchema>;

/** One field mutation recorded by an account PATCH. */
export const AccountChangeEntrySchema = z.object({
  field: z.string().min(1),
  from: z.string().nullable(),
  to: z.string().nullable(),
});
export type AccountChangeEntry = z.infer<typeof AccountChangeEntrySchema>;

/** Audit row for CRM account edits (Sheets tab `account_changes`). */
export const AccountChangeSchema = z.object({
  id: z.string().min(1),
  account_id: z.string().min(1),
  changed_at: z.string().min(1),
  changed_by: z.string().min(1),
  changes: z.array(AccountChangeEntrySchema).min(1),
});
export type AccountChange = z.infer<typeof AccountChangeSchema>;

export const UploadSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  uploaded_at: z.string().min(1),
  uploaded_by: z.string().nullable().optional(),
  cutoff_date: z.string().min(1),
  stage_mode: StageModeSchema,
  rows_read: z.number().int().nonnegative(),
  rows_loaded: z.number().int().nonnegative(),
  warnings: z.array(z.string()).default([]),
});
export type Upload = z.infer<typeof UploadSchema>;

export const SnapshotSchema = z.object({
  upload_id: z.string().min(1),
  cutoff_date: z.string().min(1),
  base: z.string().min(1),
  segment: SegmentSchema,
  stage: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  accounts: z.number().int().nonnegative(),
  amount: z.number(),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

/** Account fields required by insight rules (stage already computed). */
export type InsightAccount = {
  base: string;
  segment: Segment;
  client_name: string;
  amount_due: number;
  paid_amount: number;
  status?: string | null;
  last_contacted?: string | null;
  /** 1–5 when past due; null/undefined when not overdue. */
  stage: number | null;
};
