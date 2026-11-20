import { formatMoney0 } from '../lib/format';
import type { TrendPoint } from '@zerorez/shared';

type Props = {
  title?: string;
  points: TrendPoint[];
};

/** Simple SVG line chart of past-due amount across upload snapshots. */
export function TrendsChart({ title = 'Past-due trend', points }: Props) {
  if (points.length === 0) {
    return (
      <div className="card">
        <h2>{title}</h2>
        <p className="hint">Upload at least once to build a trend from snapshots.</p>
      </div>
    );
  }

  const width = 640;
  const height = 180;
  const padX = 28;
  const padY = 18;
  const amounts = points.map((p) => p.overdueAmount);
  const max = Math.max(...amounts, 1);
  const min = 0;
  const spanX = Math.max(points.length - 1, 1);

  const coords = points.map((p, i) => {
    const x = padX + (i / spanX) * (width - padX * 2);
    const y =
      height - padY - ((p.overdueAmount - min) / (max - min || 1)) * (height - padY * 2);
    return { x, y, point: p };
  });

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const area =
    coords.length > 0
      ? `${line} L ${coords[coords.length - 1]!.x.toFixed(1)} ${(height - padY).toFixed(1)} L ${coords[0]!.x.toFixed(1)} ${(height - padY).toFixed(1)} Z`
      : '';

  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="trend-chart">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--navy)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--navy)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((t) => {
            const y = height - padY - t * (height - padY * 2);
            return (
              <line
                key={t}
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                className="trend-grid"
              />
            );
          })}
          <path d={area} fill="url(#trendFill)" />
          <path d={line} className="trend-line" fill="none" />
          {coords.map((c) => (
            <circle key={c.point.uploadId} cx={c.x} cy={c.y} r={4.5} className="trend-dot" />
          ))}
        </svg>
      </div>
      <div className="trend-legend">
        {points.map((p) => (
          <div key={p.uploadId}>
            <strong>{p.cutoffDate}</strong>
            <span>
              {formatMoney0(p.overdueAmount)} · {p.overdueAccounts} accounts
            </span>
          </div>
        ))}
      </div>
      {points.length < 2 ? (
        <p className="hint">A second upload will show how this base is moving over time.</p>
      ) : null}
    </div>
  );
}
