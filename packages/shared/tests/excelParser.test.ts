import { describe, expect, it } from 'vitest';
import { parseWorkbook } from '../src/excelParser.js';
import { buildSyntheticWorkbook } from './fixtures/buildSyntheticWorkbook.js';

describe('parseWorkbook', () => {
  it('parses 3 bases with Residential and Commercial tables', async () => {
    const buffer = await buildSyntheticWorkbook();
    const { accounts, warnings, stats } = await parseWorkbook(buffer);

    expect(stats.sheetsMatched).toBe(3);
    expect(stats.sheetsSkipped).toBe(2);
    expect(warnings.some((w) => /Summary/i.test(w))).toBe(true);
    expect(warnings.some((w) => /Instructions/i.test(w))).toBe(true);

    const bases = new Set(accounts.map((a) => a.base));
    expect(bases).toEqual(new Set(['Dallas', 'Phoenix', 'SaltLakeCity']));

    const dallas = accounts.filter((a) => a.base === 'Dallas');
    expect(dallas.some((a) => a.segment === 'C')).toBe(true);
    expect(dallas.some((a) => a.segment === 'R')).toBe(true);

    const phoenix = accounts.filter((a) => a.base === 'Phoenix');
    expect(phoenix.some((a) => a.segment === 'C')).toBe(true);
    expect(phoenix.some((a) => a.segment === 'R')).toBe(true);

    const slc = accounts.filter((a) => a.base === 'SaltLakeCity');
    expect(slc.some((a) => a.segment === 'C')).toBe(true);
    expect(slc.some((a) => a.segment === 'R')).toBe(true);

    // Valid synthetic accounts: 2 Dallas (dup + total dropped), 2 Phoenix, 2 SLC (invalid dropped)
    expect(accounts).toHaveLength(6);
    expect(stats.rowsLoaded).toBe(6);
    expect(stats.rowsDuplicate).toBe(1);
    expect(stats.rowsInvalid).toBeGreaterThanOrEqual(2);

    const acme = accounts.find((a) => a.invoice_number === 'DAL-C-1001');
    expect(acme).toMatchObject({
      id: 'Dallas|DAL-C-1001',
      base: 'Dallas',
      segment: 'C',
      client_name: 'Acme Retail LLC',
      company_name: 'Acme Holdings',
      amount_due: 1250.5,
      paid_amount: 100,
      status: 'P2P',
      next_action: 'Call AP',
    });
    expect(acme?.service_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(acme?.next_action_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const jordan = accounts.find((a) => a.invoice_number === 'DAL-R-2001');
    expect(jordan?.segment).toBe('R');
    expect(jordan?.next_action_date).toBeNull();
    expect(jordan?.next_action).toBe('Follow up Friday');
    expect(warnings.some((w) => /next_action_date is text/i.test(w) && /Dallas/i.test(w))).toBe(
      true,
    );

    expect(accounts.some((a) => a.client_name === 'TOTAL')).toBe(false);
    expect(accounts.some((a) => a.invoice_number === 'SLC-R-INVALID')).toBe(false);
  });

  it('resolves sheet aliases and RESIDEN/COMMERCIAL segment titles', async () => {
    const buffer = await buildSyntheticWorkbook();
    const { accounts } = await parseWorkbook(buffer);

    expect(accounts.find((a) => a.invoice_number === 'PHX-C-3001')?.base).toBe('Phoenix');
    expect(accounts.find((a) => a.invoice_number === 'PHX-R-4001')?.segment).toBe('R');
    expect(accounts.find((a) => a.invoice_number === 'SLC-C-5001')?.status).toBe(
      'Sent to Collections',
    );
  });
});
