import { describe, expect, it } from 'vitest';
import { AccountSchema, SnapshotSchema, UploadSchema } from '../src/types.js';

describe('zod schemas', () => {
  it('parses a valid Account', () => {
    const account = AccountSchema.parse({
      id: 'Dallas|INV-100',
      base: 'Dallas',
      segment: 'C',
      client_name: 'Acme Corp',
      service_date: '2026-09-01',
      amount_due: 1250.5,
      paid_amount: 100,
      invoice_number: 'INV-100',
      status: 'P2P',
      last_contacted: '2026-10-01',
    });
    expect(account.id).toBe('Dallas|INV-100');
    expect(account.paid_amount).toBe(100);
  });

  it('rejects an Account missing required fields', () => {
    expect(() =>
      AccountSchema.parse({
        id: 'x',
        base: 'Dallas',
        segment: 'X',
        client_name: 'A',
        service_date: '2026-01-01',
        amount_due: 10,
      }),
    ).toThrow();
  });

  it('parses a valid Upload', () => {
    const upload = UploadSchema.parse({
      id: 'up-1',
      filename: 'AR.xlsx',
      uploaded_at: '2026-11-18T12:00:00Z',
      cutoff_date: '2026-11-18',
      stage_mode: 'date',
      rows_read: 100,
      rows_loaded: 95,
      warnings: ['Unknown tab: Richmond'],
    });
    expect(upload.rows_loaded).toBe(95);
    expect(upload.warnings).toHaveLength(1);
  });

  it('parses a valid Snapshot', () => {
    const snap = SnapshotSchema.parse({
      upload_id: 'up-1',
      cutoff_date: '2026-11-18',
      base: 'Phoenix',
      segment: 'R',
      stage: 3,
      accounts: 4,
      amount: 880,
    });
    expect(snap.stage).toBe(3);
  });
});
