import { useSearchParams } from 'react-router-dom';
import type { AnalyticsSegment } from '../api/types';

const VALID: AnalyticsSegment[] = ['all', 'C', 'R'];

export function useSegment(): [AnalyticsSegment, (seg: AnalyticsSegment) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('segment') ?? 'all';
  const segment: AnalyticsSegment = VALID.includes(raw as AnalyticsSegment)
    ? (raw as AnalyticsSegment)
    : 'all';

  const setSegment = (seg: AnalyticsSegment) => {
    const next = new URLSearchParams(params);
    if (seg === 'all') next.delete('segment');
    else next.set('segment', seg);
    setParams(next, { replace: true });
  };

  return [segment, setSegment];
}
