import { getCriticalStageAlerts, getDashboard, getTrends } from '@zerorez/shared';
import { useNavigate } from 'react-router-dom';
import { AlertsBanner } from '../components/AlertsBanner';
import { InsightsCard } from '../components/InsightsCard';
import { KpiCards } from '../components/KpiCards';
import { QueryState } from '../components/QueryState';
import { SegmentToggle } from '../components/SegmentToggle';
import { StageStack } from '../components/StageStack';
import { TrendsChart } from '../components/TrendsChart';
import { useData } from '../data/DataContext';
import { useSegment } from '../hooks/useSegment';
import { formatMoney, formatMoney0, formatPercent } from '../lib/format';

export function DashboardPage() {
  const [segment, setSegment] = useSegment();
  const navigate = useNavigate();
  const { state, ready, revision } = useData();
  void revision;

  const data = ready ? getDashboard(state, segment) : null;
  const trends = ready ? getTrends(state, segment) : null;
  const alerts = ready ? getCriticalStageAlerts(state, segment) : null;

  const isEmpty =
    !!data &&
    data.kpis.overdueAccounts === 0 &&
    data.kpis.overdueAmount === 0 &&
    !data.cutoffDate;

  return (
    <QueryState
      isLoading={!ready}
      isError={false}
      error={null}
      isEmpty={isEmpty}
      emptyTitle="No data loaded"
      emptyMessage="Go to Upload data and upload a collections Excel file to populate the dashboard."
    >
      {data ? (
        <>
          <div className="bar">
            <SegmentToggle value={segment} onChange={setSegment} />
            <span className="pill">
              {data.cutoffDate
                ? `Cutoff date: ${data.cutoffDate} · basis ${data.amountBasis}`
                : 'No uploads'}
            </span>
          </div>

          <AlertsBanner data={alerts ?? undefined} />

          <KpiCards
            items={[
              {
                label: 'Total past-due amount',
                value: formatMoney0(data.kpis.overdueAmount),
              },
              {
                label: 'Past-due accounts',
                value: String(data.kpis.overdueAccounts),
              },
              {
                label: '49+ days (critical stages)',
                value: formatMoney0(data.kpis.over45Amount),
                hint: `${formatPercent(data.kpis.over45Share)} of portfolio`,
              },
              {
                label: 'Highest-balance base',
                value: data.kpis.highestBase?.id ?? '—',
                hint: data.kpis.highestBase
                  ? formatMoney0(data.kpis.highestBase.amount)
                  : undefined,
              },
            ]}
          />

          <InsightsCard title="Portfolio insights" insights={data.insights} />

          <TrendsChart
            title="Portfolio past-due trend"
            points={trends?.points ?? []}
          />

          <div className="card">
            <h2>Portfolio by delinquency stage</h2>
            <StageStack stages={data.stages} />
          </div>

          <div className="card">
            <h2>Detail by base</h2>
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
                        <small>accounts · amount</small>
                      </th>
                    ))}
                    <th>Total accounts</th>
                    <th>Total amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bases.map((base) => (
                    <tr
                      key={base.id}
                      onClick={() => navigate(`/bases/${encodeURIComponent(base.id)}`)}
                    >
                      <td className="n">{base.id}</td>
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
            <p className="hint">Click a base to open its analytics.</p>
          </div>
        </>
      ) : null}
    </QueryState>
  );
}
