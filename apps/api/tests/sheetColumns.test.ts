import { describe, expect, it } from 'vitest';
import type { Account, Snapshot, Upload } from '@zerorez/shared';
import {
  accountToRow,
  rowToAccount,
  rowToSnapshot,
  rowToUpload,
  snapshotToRow,
  uploadToRow,
} from '../src/repositories/sheetColumns.js';

describe('sheetColumns round-trip', () => {
  it('round-trips accounts', () => {
    const account: Account = {
      id: 'Dallas|INV-1',
      base: 'Dallas',
      segment: 'C',
      client_name: 'Acme',
      company_name: 'Acme Co',
      service_date: '2026-10-01',
      amount_due: 125.5,
      paid_amount: 10,
      invoice_number: 'INV-1',
      status: 'P2P',
      next_action: 'Call',
      next_action_date: '2026-11-20',
      acc_notes: 'note',
      bm_notes: null,
      upload_id: 'u1',
      first_seen: '2026-11-01T00:00:00.000Z',
      last_seen: '2026-11-19T00:00:00.000Z',
      resolved_at: null,
    };
    const back = rowToAccount(accountToRow(account));
    expect(back).toMatchObject({
      id: 'Dallas|INV-1',
      amount_due: 125.5,
      paid_amount: 10,
      status: 'P2P',
      bm_notes: null,
      resolved_at: null,
    });
  });

  it('round-trips uploads with JSON warnings', () => {
    const upload: Upload = {
      id: 'u1',
      filename: 'file.xlsx',
      uploaded_at: '2026-11-19T00:00:00.000Z',
      uploaded_by: null,
      cutoff_date: '2026-11-18',
      stage_mode: 'date',
      rows_read: 10,
      rows_loaded: 8,
      warnings: ['Skipped unknown sheet "Summary"'],
    };
    expect(rowToUpload(uploadToRow(upload))).toEqual(upload);
  });

  it('round-trips snapshots', () => {
    const snapshot: Snapshot = {
      upload_id: 'u1',
      cutoff_date: '2026-11-18',
      base: 'Dallas',
      segment: 'R',
      stage: 3,
      accounts: 4,
      amount: 999.99,
    };
    expect(rowToSnapshot(snapshotToRow(snapshot))).toEqual(snapshot);
  });
});
