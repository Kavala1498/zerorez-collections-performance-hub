import { describe, expect, it } from 'vitest';
import { ALLOWED_STATUSES, normalizeStatus } from '../src/status.js';

describe('normalizeStatus', () => {
  it('exposes the six allowed statuses', () => {
    expect(ALLOWED_STATUSES).toEqual([
      'P2P',
      'Escalated',
      'Legal Demand Letter Requested',
      'Legal Demand Letter Sent',
      'Payment Collected',
      'Sent to Collections',
    ]);
  });

  it('returns exact allowed values case-insensitively', () => {
    expect(normalizeStatus('p2p')).toBe('P2P');
    expect(normalizeStatus('Escalated')).toBe('Escalated');
    expect(normalizeStatus('LEGAL DEMAND LETTER SENT')).toBe('Legal Demand Letter Sent');
  });

  it('maps common aliases', () => {
    expect(normalizeStatus('Promise to Pay')).toBe('P2P');
    expect(normalizeStatus('escalate')).toBe('Escalated');
    expect(normalizeStatus('Demand Letter Requested')).toBe('Legal Demand Letter Requested');
    expect(normalizeStatus('Demand Letter Sent')).toBe('Legal Demand Letter Sent');
    expect(normalizeStatus('Collected')).toBe('Payment Collected');
    expect(normalizeStatus('Sent to Collection')).toBe('Sent to Collections');
  });

  it('returns null for empty or unknown values', () => {
    expect(normalizeStatus(null)).toBeNull();
    expect(normalizeStatus(undefined)).toBeNull();
    expect(normalizeStatus('')).toBeNull();
    expect(normalizeStatus('   ')).toBeNull();
    expect(normalizeStatus('Weird Custom Status')).toBeNull();
  });
});
