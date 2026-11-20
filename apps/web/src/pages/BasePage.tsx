import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchBaseAccounts, fetchBaseAnalytics } from '../api/client';
import { InsightsCard } from '../components/InsightsCard';
import { KpiCards } from '../components/KpiCards';
import { QueryState } from '../components/QueryState';
import { SegmentToggle } from '../components/SegmentToggle';
import { StageStack } from '../components/StageStack';
import { useSegment } from '../hooks/useSegment';
import {
  accountSegmentLabel,
  formatMoney,
  formatMoney0,
  formatPercent,
} from '../lib/format';
import type { StageBucket } from '../api/types';

function SegmentBars({
  title,
  overdueAmount,
  overdueAccounts,
  stages,
}: {
  title: string;
  overdueAmount: number;
  overdueAccounts: number;
  stages: StageBucket[];
}) {
  const mx = Math.max(...stages.map((x) => x.amount), 1);
  return (
    <div className="card">
      <h2>
        {title} · {formatMoney0(overdueAmount)}{' '}
        <span className="pill">{overdueAccounts} cuentas</span>
      </h2>
      {stages.map((x) => (
        <div className="row" key={x.id}>
          <span>{x.label}</span>
          <span
            className="b"
            style={{ width: `${(x.amount / mx) * 50}%`, background: x.color }}
          />
          <span className="v">
            {formatMoney0(x.amount)} · {x.accounts}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BasePage() {
  const { id = '' } = useParams();
  const [segment, setSegment] = useSegment();
  const navigate = useNavigate();
  const baseId = decodeURIComponent(id);

  const analytics = useQuery({
    queryKey: ['base-analytics', baseId, segment],
    queryFn: () => fetchBaseAnalytics(baseId, segment),
    enabled: !!baseId,
  });

  const accounts = useQuery({
    queryKey: ['base-accounts', baseId, 'all'],
    queryFn: () => fetchBaseAccounts(baseId, 'all'),
    enabled: !!baseId,
  });

  const data = analytics.data;
  const topAccounts = (accounts.data?.accounts ?? [])
    .filter((a) => a.stage != null)
    .slice(0, 10);

  const isEmpty =
    !!data && data.kpis.overdueAccounts === 0 && data.kpis.overdueAmount === 0 && !data.cutoffDate;

  return (
    <QueryState
      isLoading={analytics.isLoading}
      isError={analytics.isError}
      error={analytics.error}
      isEmpty={isEmpty}
      emptyTitle="Sin datos para esta base"
      emptyMessage="Carga un Excel con cuentas de esta base para ver analíticas."
    >
      {data ? (
        <>
          <div className="bar">
            <h2 style={{ margin: 0, fontSize: 20 }}>{data.base.name}</h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <SegmentToggle value={segment} onChange={setSegment} />
              <span className="pill">
                Puesto {data.kpis.rank} de {data.kpis.baseCount} por monto vencido
              </span>
            </div>
          </div>

          <KpiCards
            items={[
              {
                label: 'Monto vencido',
                value: formatMoney0(data.kpis.overdueAmount),
              },
              {
                label: 'Cuentas vencidas',
                value: String(data.kpis.overdueAccounts),
              },
              {
                label: 'Promedio por cuenta',
                value: formatMoney0(data.kpis.averagePerAccount),
              },
              {
                label: 'Peso sobre el total',
                value: formatPercent(data.kpis.companyShare),
              },
              {
                label: 'Más de 45 días',
                value: formatPercent(data.kpis.over45Share, 0),
                hint: formatMoney0(data.kpis.over45Amount),
              },
            ]}
          />

          <InsightsCard title={`Insights · ${data.base.name}`} insights={data.insights} />

          <div className="card">
            <h2>Distribución por etapa</h2>
            <StageStack stages={data.stages} showAccounts />
          </div>

          <div className="two">
            <SegmentBars
              title="Comercial"
              overdueAmount={data.bySegment.C.overdueAmount}
              overdueAccounts={data.bySegment.C.overdueAccounts}
              stages={data.bySegment.C.stages}
            />
            <SegmentBars
              title="Residencial"
              overdueAmount={data.bySegment.R.overdueAmount}
              overdueAccounts={data.bySegment.R.overdueAccounts}
              stages={data.bySegment.R.stages}
            />
          </div>

          {topAccounts.length > 0 ? (
            <div className="card">
              <h2>Cuentas más grandes</h2>
              <div className="wrap">
                <table className="data" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Cliente</th>
                      <th>Tipo</th>
                      <th>Monto</th>
                      <th>Etapa</th>
                      <th>Estado</th>
                      <th>Último contacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAccounts.map((a) => {
                      const stage = data.stages.find((s) => s.id === a.stage);
                      return (
                        <tr key={a.id} style={{ cursor: 'default' }}>
                          <td className="n">
                            {a.client_name}
                            {a.company_name ? (
                              <small
                                style={{
                                  display: 'block',
                                  fontWeight: 400,
                                  color: 'var(--mu)',
                                }}
                              >
                                {a.company_name}
                              </small>
                            ) : null}
                          </td>
                          <td>{accountSegmentLabel(a.segment)}</td>
                          <td>{formatMoney(a.amount_due)}</td>
                          <td
                            style={
                              stage
                                ? {
                                    background: `color-mix(in srgb, ${stage.color} 55%, var(--sf))`,
                                    color: '#10202c',
                                  }
                                : undefined
                            }
                          >
                            {stage?.label ?? '—'}
                          </td>
                          <td>{a.status || '—'}</td>
                          <td>{a.last_contacted || 'Sin registro'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="card">
            <h2>Comparación entre bases</h2>
            {data.ranking.map((row) => {
              const max = data.ranking[0]?.overdueAmount || 1;
              const isCurrent = row.id === data.base.id;
              return (
                <div
                  className="row"
                  key={row.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/bases/${encodeURIComponent(row.id)}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/bases/${encodeURIComponent(row.id)}`);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <span>{row.name}</span>
                  <span
                    className="b"
                    style={{
                      width: `${(row.overdueAmount / max) * 60}%`,
                      background: isCurrent ? 'var(--accent)' : 'var(--mu)',
                      opacity: isCurrent ? 1 : 0.35,
                    }}
                  />
                  <span className="v">{formatMoney0(row.overdueAmount)}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </QueryState>
  );
}
