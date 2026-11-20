import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchDashboard } from '../api/client';
import { InsightsCard } from '../components/InsightsCard';
import { KpiCards } from '../components/KpiCards';
import { QueryState } from '../components/QueryState';
import { SegmentToggle } from '../components/SegmentToggle';
import { StageStack } from '../components/StageStack';
import { useSegment } from '../hooks/useSegment';
import { formatMoney, formatMoney0, formatPercent } from '../lib/format';

export function DashboardPage() {
  const [segment, setSegment] = useSegment();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ['dashboard', segment],
    queryFn: () => fetchDashboard(segment),
  });

  const data = query.data;
  const isEmpty =
    !!data &&
    data.kpis.overdueAccounts === 0 &&
    data.kpis.overdueAmount === 0 &&
    !data.cutoffDate;

  return (
    <QueryState
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      isEmpty={isEmpty}
      emptyTitle="Sin datos cargados"
      emptyMessage="Ve a Cargar datos y sube un Excel de cobranza para poblar el dashboard."
    >
      {data ? (
        <>
          <div className="bar">
            <SegmentToggle value={segment} onChange={setSegment} />
            <span className="pill">
              {data.cutoffDate
                ? `Fecha de corte: ${data.cutoffDate} · base ${data.amountBasis}`
                : 'Sin cargas'}
            </span>
          </div>

          <KpiCards
            items={[
              {
                label: 'Monto total vencido',
                value: formatMoney0(data.kpis.overdueAmount),
              },
              {
                label: 'Cuentas vencidas',
                value: String(data.kpis.overdueAccounts),
              },
              {
                label: 'Más de 45 días (etapa crítica)',
                value: formatMoney0(data.kpis.over45Amount),
                hint: `${formatPercent(data.kpis.over45Share)} del portafolio`,
              },
              {
                label: 'Base con mayor saldo',
                value: data.kpis.highestBase?.name ?? '—',
                hint: data.kpis.highestBase
                  ? formatMoney0(data.kpis.highestBase.amount)
                  : undefined,
              },
            ]}
          />

          <InsightsCard title="Insights del portafolio" insights={data.insights} />

          <div className="card">
            <h2>Portafolio por etapa de morosidad</h2>
            <StageStack stages={data.stages} />
          </div>

          <div className="card">
            <h2>Detalle por base</h2>
            <div className="wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Base</th>
                    {data.stages.map((st) => (
                      <th
                        key={st.id}
                        style={{ background: st.color, color: '#10202c' }}
                      >
                        {st.label}
                        <small>cuentas · monto</small>
                      </th>
                    ))}
                    <th>Total cuentas</th>
                    <th>Total monto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bases.map((base) => (
                    <tr
                      key={base.id}
                      onClick={() => navigate(`/bases/${encodeURIComponent(base.id)}`)}
                    >
                      <td className="n">{base.name}</td>
                      {base.stages.map((st) => (
                        <td
                          key={st.id}
                          className="c"
                          style={{
                            background: `color-mix(in srgb, ${st.color} 55%, var(--sf))`,
                          }}
                        >
                          {st.accounts}
                          <small>{formatMoney(st.amount)}</small>
                        </td>
                      ))}
                      <td className="t">{base.overdueAccounts}</td>
                      <td className="t">{formatMoney(base.overdueAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="n">Total</td>
                    {data.stages.map((st) => (
                      <td key={st.id}>
                        {st.accounts}
                        <br />
                        {formatMoney(st.amount)}
                      </td>
                    ))}
                    <td>{data.kpis.overdueAccounts}</td>
                    <td>{formatMoney(data.kpis.overdueAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="hint">Haz clic en una base para abrir su analítica.</p>
          </div>
        </>
      ) : null}
    </QueryState>
  );
}
