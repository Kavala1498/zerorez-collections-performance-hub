import type { InsightAccount } from './types.js';

export type BuildInsightsOptions = {
  /** When true, append concentration across the top 3 bases (portfolio view). */
  includeBaseConcentration?: boolean;
};

function sumDue(accounts: readonly InsightAccount[]): number {
  return accounts.reduce((total, a) => total + a.amount_due, 0);
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function pct(part: number, total: number): string {
  if (total <= 0) return '0%';
  return `${((part / total) * 100).toFixed(0)}%`;
}

function isPastDue(account: InsightAccount): boolean {
  return account.stage != null && account.stage >= 1;
}

/**
 * Pure insight generator aligned with arquitectura §6 / MVP reference rules.
 * Expects accounts that already have a computed `stage` (null = not overdue).
 */
export function buildInsights(
  accounts: readonly InsightAccount[],
  options: BuildInsightsOptions = {},
): string[] {
  const pastDue = accounts.filter(isPastDue);
  if (pastDue.length === 0) return [];

  const insights: string[] = [];
  const total = sumDue(pastDue) || 1;

  // 1. Concentration in the 5 largest accounts
  const top5 = [...pastDue].sort((a, b) => b.amount_due - a.amount_due).slice(0, 5);
  const top5Sum = sumDue(top5);
  const largest = top5[0]!;
  insights.push(
    `The 5 largest accounts add up to ${money(top5Sum)} (${pct(top5Sum, total)} of the past-due amount). The largest is ${largest.client_name} at ${money(largest.amount_due)}.`,
  );

  // 2. Over 45 days (stages 4–5), including no last-contact callout
  const over45 = pastDue.filter((a) => a.stage != null && a.stage >= 4);
  const noContact = over45.filter((a) => !a.last_contacted);
  let over45Msg = `${over45.length} accounts are over 45 days past due, totaling ${money(sumDue(over45))} (${pct(sumDue(over45), total)}).`;
  if (noContact.length > 0) {
    over45Msg += ` ${noContact.length} of them (${money(sumDue(noContact))}) have no last-contact date.`;
  }
  insights.push(over45Msg);

  // 3. Over 30 days (stages 3+) with no status
  const noStatus = pastDue.filter(
    (a) => a.stage != null && a.stage >= 3 && !(a.status && String(a.status).trim()),
  );
  if (noStatus.length > 0) {
    insights.push(
      `${noStatus.length} accounts over 30 days (${money(sumDue(noStatus))}) have no status assigned.`,
    );
  }

  // 4. Legal or collections
  const legal = pastDue.filter((a) => /legal|collection/i.test(a.status || ''));
  if (legal.length > 0) {
    insights.push(
      `${legal.length} accounts (${money(sumDue(legal))}) are already in legal or collections.`,
    );
  }

  // 5. Partial payments
  const partial = pastDue.filter((a) => a.paid_amount > 0);
  if (partial.length > 0) {
    const paidTotal = partial.reduce((s, a) => s + a.paid_amount, 0);
    insights.push(
      `${partial.length} accounts have partial payments totaling ${money(paidTotal)}; past-due amounts shown are full invoiced totals, before those payments.`,
    );
  }

  // 6. Commercial vs Residential weight
  const commercial = pastDue.filter((a) => a.segment === 'C');
  const residential = pastDue.filter((a) => a.segment === 'R');
  insights.push(
    `Commercial is ${pct(sumDue(commercial), total)} of the past-due amount and Residential is ${pct(sumDue(residential), total)}.`,
  );

  // 7. Top 3 bases concentration (portfolio)
  if (options.includeBaseConcentration) {
    const byBase = new Map<string, number>();
    for (const account of pastDue) {
      byBase.set(account.base, (byBase.get(account.base) || 0) + account.amount_due);
    }
    const ranked = [...byBase.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length > 2) {
      const [first, second, third] = ranked;
      const top3Sum = first![1] + second![1] + third![1];
      insights.push(
        `${first![0]} holds ${pct(first![1], total)} of the total; together with ${second![0]} and ${third![0]} it reaches ${pct(top3Sum, total)}.`,
      );
    }
  }

  return insights;
}
