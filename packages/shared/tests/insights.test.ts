import { describe, expect, it } from 'vitest';
import { buildInsights } from '../src/insights.js';
import type { InsightAccount } from '../src/types.js';

function acct(partial: Partial<InsightAccount> & Pick<InsightAccount, 'client_name' | 'amount_due'>): InsightAccount {
  return {
    base: partial.base ?? 'Dallas',
    segment: partial.segment ?? 'C',
    client_name: partial.client_name,
    amount_due: partial.amount_due,
    paid_amount: partial.paid_amount ?? 0,
    status: partial.status ?? null,
    last_contacted: partial.last_contacted ?? null,
    stage: partial.stage === undefined ? 2 : partial.stage,
  };
}

describe('buildInsights', () => {
  it('returns an empty list when there are no past-due accounts', () => {
    expect(buildInsights([])).toEqual([]);
    expect(
      buildInsights([
        acct({ client_name: 'Future', amount_due: 100, stage: null }),
        acct({ client_name: 'Also future', amount_due: 50, stage: null }),
      ]),
    ).toEqual([]);
  });

  it('reports top-5 concentration and commercial/residential weight', () => {
    const accounts: InsightAccount[] = [
      acct({ client_name: 'Alpha', amount_due: 5000, base: 'Dallas', segment: 'C', stage: 2 }),
      acct({ client_name: 'Beta', amount_due: 3000, base: 'Phoenix', segment: 'C', stage: 1 }),
      acct({ client_name: 'Gamma', amount_due: 2000, base: 'Denver', segment: 'R', stage: 2 }),
      acct({ client_name: 'Delta', amount_due: 1000, base: 'Tulsa', segment: 'R', stage: 1 }),
      acct({ client_name: 'Epsilon', amount_due: 500, base: 'SoCal', segment: 'C', stage: 2 }),
      acct({ client_name: 'Zeta', amount_due: 100, base: 'Raleigh', segment: 'C', stage: 1 }),
    ];
    const result = buildInsights(accounts);
    expect(result[0]).toContain('The 5 largest accounts');
    expect(result[0]).toContain('Alpha');
    expect(result[0]).toContain('$11,500');
    expect(result.some((line) => line.includes('Commercial is') && line.includes('Residential'))).toBe(
      true,
    );
  });

  it('flags 49+-day accounts without last contact', () => {
    const accounts = [
      acct({
        client_name: 'Late One',
        amount_due: 1000,
        stage: 4,
        last_contacted: null,
      }),
      acct({
        client_name: 'Late Two',
        amount_due: 500,
        stage: 5,
        last_contacted: '2026-10-01',
      }),
      acct({ client_name: 'Fresh', amount_due: 200, stage: 1 }),
    ];
    const line = buildInsights(accounts).find((l) => l.includes('49+ days'));
    expect(line).toBeDefined();
    expect(line).toContain('2 accounts');
    expect(line).toContain('1 of them');
    expect(line).toContain('no last-contact date');
  });

  it('flags 30+-day accounts with no status', () => {
    const accounts = [
      acct({ client_name: 'No Status', amount_due: 800, stage: 3, status: null }),
      acct({ client_name: 'Has Status', amount_due: 400, stage: 3, status: 'P2P' }),
      acct({ client_name: 'Early', amount_due: 200, stage: 2, status: null }),
    ];
    const line = buildInsights(accounts).find((l) => l.includes('no status assigned'));
    expect(line).toContain('1 accounts 30+ days');
    expect(line).toContain('$800');
  });

  it('flags legal/collections and partial payments when present', () => {
    const accounts = [
      acct({
        client_name: 'Legal Co',
        amount_due: 2000,
        stage: 5,
        status: 'Legal Demand Letter Sent',
        paid_amount: 250,
      }),
      acct({
        client_name: 'Collections Co',
        amount_due: 1000,
        stage: 4,
        status: 'Sent to Collections',
        paid_amount: 0,
      }),
    ];
    const result = buildInsights(accounts);
    expect(result.some((l) => l.includes('legal or collections'))).toBe(true);
    expect(result.some((l) => l.includes('partial payments totaling $250'))).toBe(true);
  });

  it('includes top-3 base concentration when requested', () => {
    const accounts = [
      acct({ client_name: 'A', amount_due: 5000, base: 'Pittsburgh', stage: 5 }),
      acct({ client_name: 'B', amount_due: 3000, base: 'Minnesota', stage: 4 }),
      acct({ client_name: 'C', amount_due: 2000, base: 'Phoenix', stage: 3 }),
      acct({ client_name: 'D', amount_due: 500, base: 'Tulsa', stage: 2 }),
    ];
    const result = buildInsights(accounts, { includeBaseConcentration: true });
    const line = result.find((l) => l.includes('Pittsburgh holds'));
    expect(line).toBeDefined();
    expect(line).toContain('Minnesota');
    expect(line).toContain('Phoenix');
  });

  it('omits base concentration unless opted in', () => {
    const accounts = [
      acct({ client_name: 'A', amount_due: 5000, base: 'Pittsburgh', stage: 5 }),
      acct({ client_name: 'B', amount_due: 3000, base: 'Minnesota', stage: 4 }),
      acct({ client_name: 'C', amount_due: 2000, base: 'Phoenix', stage: 3 }),
    ];
    const result = buildInsights(accounts);
    expect(result.every((l) => !l.includes('holds'))).toBe(true);
  });
});
