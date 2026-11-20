import { type AllowedStatus, AllowedStatusSchema } from './types.js';

const ALLOWED = AllowedStatusSchema.options;

/** Collapse punctuation/spacing so variants of the same status match. */
function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIASES: Record<string, AllowedStatus> = {
  p2p: 'P2P',
  'promise to pay': 'P2P',
  'promise 2 pay': 'P2P',
  escalated: 'Escalated',
  escalate: 'Escalated',
  'legal demand letter requested': 'Legal Demand Letter Requested',
  'legal demand requested': 'Legal Demand Letter Requested',
  'demand letter requested': 'Legal Demand Letter Requested',
  'legal demand letter sent': 'Legal Demand Letter Sent',
  'legal demand sent': 'Legal Demand Letter Sent',
  'demand letter sent': 'Legal Demand Letter Sent',
  'payment collected': 'Payment Collected',
  collected: 'Payment Collected',
  'sent to collections': 'Sent to Collections',
  'sent to collection': 'Sent to Collections',
  collections: 'Sent to Collections',
  collection: 'Sent to Collections',
};

/**
 * Map free-text AccStatus values to one of the six allowed statuses.
 * Returns null when the value is empty or unrecognized.
 */
export function normalizeStatus(raw: string | null | undefined): AllowedStatus | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const exact = ALLOWED.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;

  const key = normalizeKey(trimmed);
  if (ALIASES[key]) return ALIASES[key]!;

  // Fuzzy: if the key contains a known phrase, prefer longer matches first.
  const ordered = Object.entries(ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, status] of ordered) {
    if (key === alias || key.includes(alias)) {
      return status;
    }
  }

  return null;
}

export const ALLOWED_STATUSES: readonly AllowedStatus[] = ALLOWED;
