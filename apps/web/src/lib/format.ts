/** Money with cents (en-US style, matching reference). */
export function formatMoney(n: number): string {
  return (
    '$' +
    n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Rounded money without cents. */
export function formatMoney0(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

/** Compact sidebar amount like `$12.5k` / `$148k`. */
export function formatCompactK(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '$0k';
  if (n >= 10_000) return `$${Math.round(n / 1000)}k`;
  return `$${(n / 1000).toFixed(1)}k`;
}

export function formatPercent(share: number, digits = 1): string {
  return `${(share * 100).toFixed(digits)}%`;
}

export function segmentLabel(seg: 'all' | 'C' | 'R'): string {
  if (seg === 'C') return 'Commercial';
  if (seg === 'R') return 'Residential';
  return 'All';
}

export function accountSegmentLabel(seg: 'C' | 'R'): string {
  return seg === 'C' ? 'Commercial' : 'Residential';
}
