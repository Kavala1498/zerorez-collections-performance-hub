import { useNavigate } from 'react-router-dom';
import type { AlertsResponse } from '../api/types';
import { formatMoney } from '../lib/format';

type Props = {
  data: AlertsResponse | undefined;
  /** When true, hide the base column (already on a base page). */
  hideBase?: boolean;
};

export function AlertsBanner({ data, hideBase = false }: Props) {
  const navigate = useNavigate();
  if (!data || data.alerts.length === 0) return null;

  return (
    <div className="card alerts-card">
      <h2>
        Critical stage alerts
        <span className="pill alerts-count">{data.alerts.length}</span>
      </h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Accounts that moved into stage 4 or 5 between cutoffs{' '}
        <strong>{data.previousCutoffDate}</strong> and <strong>{data.currentCutoffDate}</strong>.
      </p>
      <div className="wrap">
        <table className="data alerts-table" style={{ minWidth: hideBase ? 520 : 640 }}>
          <thead>
            <tr>
              {!hideBase ? <th style={{ textAlign: 'left' }}>Base</th> : null}
              <th style={{ textAlign: 'left' }}>Client</th>
              <th>Amount</th>
              <th>Previous</th>
              <th>Now</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.alerts.map((a) => (
              <tr
                key={a.accountId}
                onClick={() => {
                  if (!hideBase) navigate(`/bases/${encodeURIComponent(a.base)}`);
                }}
                style={{ cursor: hideBase ? 'default' : 'pointer' }}
              >
                {!hideBase ? <td className="n">{a.base}</td> : null}
                <td className="n">
                  {a.clientName}
                  {a.companyName ? (
                    <small
                      style={{
                        display: 'block',
                        fontWeight: 400,
                        color: 'var(--mu)',
                      }}
                    >
                      {a.companyName}
                    </small>
                  ) : null}
                </td>
                <td>{formatMoney(a.amountDue)}</td>
                <td>{a.previousStage != null ? `Stage ${a.previousStage}` : 'Not overdue'}</td>
                <td>
                  <span className="alert-stage">Stage {a.currentStage}</span>
                </td>
                <td>{a.status || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
