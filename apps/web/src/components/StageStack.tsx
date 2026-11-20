import type { StageBucket } from '@zerorez/shared';
import { formatMoney0 } from '../lib/format';

type Props = {
  stages: StageBucket[];
  showAccounts?: boolean;
};

export function StageStack({ stages, showAccounts = false }: Props) {
  const total = stages.reduce((s, x) => s + x.amount, 0) || 1;

  return (
    <>
      <div className="stack" aria-hidden="true">
        {stages.map((x) => {
          const share = x.amount / total;
          return (
            <div
              key={x.id}
              style={{
                width: `${share * 100}%`,
                background: x.color,
              }}
            >
              {share > 0.06 ? `${(share * 100).toFixed(1)}%` : ''}
            </div>
          );
        })}
      </div>
      <div className="leg">
        {stages.map((x) => (
          <div key={x.id}>
            <i style={{ background: x.color }} />
            <div>
              <b>{x.label}</b> · {formatMoney0(x.amount)}
              {showAccounts ? ` · ${x.accounts} accounts` : null}
              <em>{x.responsibleAction}</em>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
