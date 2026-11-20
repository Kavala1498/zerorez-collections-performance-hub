import {
  AllowedStatusSchema,
  normalizeStatus,
  type Account,
  type AccountChange,
  type AccountChangeEntry,
} from '@zerorez/shared';
import { z } from 'zod';
import { AppError } from '../errors/AppError.js';
import type { AccountsRepository } from '../repositories/AccountsRepository.js';

const OptionalDateSchema = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()])
  .optional();

const OptionalTextSchema = z.union([z.string(), z.null()]).optional();

/**
 * PATCH body for CRM-editable account fields.
 * `notes` maps to `acc_notes`.
 */
export const AccountPatchSchema = z
  .object({
    status: z.union([AllowedStatusSchema, z.literal(''), z.null()]).optional(),
    next_action: OptionalTextSchema,
    next_action_date: OptionalDateSchema,
    notes: OptionalTextSchema,
    acc_notes: OptionalTextSchema,
    last_contacted: OptionalDateSchema,
  })
  .refine(
    (body) =>
      body.status !== undefined ||
      body.next_action !== undefined ||
      body.next_action_date !== undefined ||
      body.notes !== undefined ||
      body.acc_notes !== undefined ||
      body.last_contacted !== undefined,
    { message: 'At least one editable field is required' },
  );

export type AccountPatch = z.infer<typeof AccountPatchSchema>;

const EDITABLE_FIELDS = [
  'status',
  'next_action',
  'next_action_date',
  'acc_notes',
  'last_contacted',
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizePatch(body: AccountPatch): Partial<Record<EditableField, string | null>> {
  const out: Partial<Record<EditableField, string | null>> = {};

  if (body.status !== undefined) {
    if (body.status == null || body.status === '') {
      out.status = null;
    } else {
      const normalized = normalizeStatus(body.status) ?? AllowedStatusSchema.parse(body.status);
      out.status = normalized;
    }
  }

  if (body.next_action !== undefined) {
    out.next_action = emptyToNull(body.next_action);
  }

  if (body.next_action_date !== undefined) {
    out.next_action_date = emptyToNull(body.next_action_date);
  }

  if (body.notes !== undefined || body.acc_notes !== undefined) {
    const raw = body.notes !== undefined ? body.notes : body.acc_notes;
    out.acc_notes = emptyToNull(raw ?? null);
  }

  if (body.last_contacted !== undefined) {
    out.last_contacted = emptyToNull(body.last_contacted);
  }

  return out;
}

function asComparable(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

export class AccountService {
  constructor(private readonly repo: AccountsRepository) {}

  async patchAccount(
    accountIdRaw: string,
    body: unknown,
    actor: { email: string },
  ): Promise<{ account: Account; change: AccountChange }> {
    const accountId = decodeURIComponent(accountIdRaw);
    const patch = normalizePatch(AccountPatchSchema.parse(body));
    const accounts = await this.repo.listAccounts();
    const existing = accounts.find((a) => a.id === accountId);
    if (!existing) {
      throw new AppError('NOT_FOUND', `Account not found: ${accountId}`, 404);
    }

    const fieldChanges: AccountChangeEntry[] = [];
    const updated: Account = { ...existing };

    for (const field of EDITABLE_FIELDS) {
      if (!(field in patch)) continue;
      const nextValue = patch[field] ?? null;
      const prevValue = asComparable(existing[field]);
      const nextComparable = asComparable(nextValue);
      if (prevValue === nextComparable) continue;
      updated[field] = nextValue;
      fieldChanges.push({
        field: field === 'acc_notes' ? 'notes' : field,
        from: prevValue,
        to: nextComparable,
      });
    }

    if (fieldChanges.length === 0) {
      return {
        account: existing,
        change: {
          id: `noop-${accountId}`,
          account_id: accountId,
          changed_at: existing.updated_at ?? new Date().toISOString(),
          changed_by: existing.updated_by ?? actor.email,
          changes: [],
        },
      };
    }

    const changedAt = new Date().toISOString();
    updated.updated_by = actor.email;
    updated.updated_at = changedAt;

    const change: AccountChange = {
      id: `${accountId}|${changedAt}`,
      account_id: accountId,
      changed_at: changedAt,
      changed_by: actor.email,
      changes: fieldChanges,
    };

    await this.repo.persistAccountPatch({ account: updated, changes: [change] });
    return { account: updated, change };
  }

  async listChanges(accountIdRaw: string): Promise<AccountChange[]> {
    const accountId = decodeURIComponent(accountIdRaw);
    const accounts = await this.repo.listAccounts();
    if (!accounts.some((a) => a.id === accountId)) {
      throw new AppError('NOT_FOUND', `Account not found: ${accountId}`, 404);
    }
    const changes = await this.repo.listAccountChanges(accountId);
    return changes.sort((a, b) => b.changed_at.localeCompare(a.changed_at));
  }
}
