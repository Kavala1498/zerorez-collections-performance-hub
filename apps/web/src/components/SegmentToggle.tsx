import type { AnalyticsSegment } from '@zerorez/shared';

const OPTIONS: Array<{ value: AnalyticsSegment; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'C', label: 'Commercial' },
  { value: 'R', label: 'Residential' },
];

type Props = {
  value: AnalyticsSegment;
  onChange: (seg: AnalyticsSegment) => void;
};

export function SegmentToggle({ value, onChange }: Props) {
  return (
    <div className="seg" role="group" aria-label="Segment">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={value === opt.value ? 'on' : undefined}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
