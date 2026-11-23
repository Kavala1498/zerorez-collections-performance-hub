import {
  getBaseAnalytics,
  getCriticalStageAlerts,
  getTrends,
  listBaseAccounts,
  type AccountWithStage,
  type StageBucket,
} from '@zerorez/shared';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AccountEditForm } from '../components/AccountEditForm';
import { AlertsBanner } from '../components/AlertsBanner';
import { InsightsCard } from '../components/InsightsCard';
import { KpiCards } from '../components/KpiCards';
import { QueryState } from '../components/QueryState';
import { SegmentToggle } from '../components/SegmentToggle';
import { StageStack } from '../components/StageStack';
import { TrendsChart } from '../components/TrendsChart';
import { useData } from '../data/DataContext';
import { useSegment } from '../hooks/useSegment';
import {
  accountSegmentLabel,
  formatMoney,
  formatMoney0,
  formatPercent,
} from '../lib/format';

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
        <span className="pill">{overdueAccounts} accounts</span>
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
  const { state, ready, revision } = useData();
  const baseId = decodeURIComponent(id);
  const [editing, setEditing] = useState<AccountWithStage | null>(null);
  void revision;

  let data = null;
  let accountsList: AccountWithStage[] = [];
  let trends = null;
  let alerts = null;
  let loadError: Error | null = null;

  if (ready && baseId) {
    try {
      data = getBaseAnalytics(state, baseId, segment);
      accountsList = listBaseAccounts(state, baseId, 'all').accounts;
      trends = getTrends(state, segment, baseId);
      alerts = getCriticalStageAlerts(state, segment, baseId);
    } catch (err) {
      loadError = err instanceof Error ? err : new Error('Failed to load base');
    }
  }

  const openAccounts = accountsList.filter((a) => a.stage != null);
  const topAccounts = openAccounts.slice(0, 15);

  const isEmpty =
    !!data && data.kpis.overdueAccounts === 0 && data.kpis.overdueAmount === 0 && !data.cutoffDate;

  return (
    <QueryState
      isLoading={!ready}
      isError={!!loadError}
      error={loadError}
      isEmpty={isEmpty}
      emptyTitle="No data for this base"
      emptyMessage="Upload an Excel file with accounts for this base to see analytics."
    >
      {data ? (
        <>
          <div className="bar">
            <h2 style={{ margin: 0, fontSize: 20 }}>{data.base.id}</h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <SegmentToggle value={segment} onChange={setSegment} />
              <span className="pill">
                Rank {data.kpis.rank} of {data.kpis.baseCount} by past-due amount
              </span>
            </div>
          </div>

          <AlertsBanner data={alerts ?? undefined} hideBase />

          <KpiCards
            items={[
              {
                label: 'Past-due amount',
                value: formatMoney0(data.kpis.overdueAmount),
              },
              {
                label: 'Past-due accounts',
                value: String(data.kpis.overdueAccounts),
              },
              {
                label: 'Average per account',
                value: formatMoney0(data.kpis.averagePerAccount),
              },
              {
                label: 'Share of company total',
                value: formatPercent(data.kpis.companyShare),
              },
              {
                label: '49+ days',
                value: formatPercent(data.kpis.over45Share, 0),
                hint: formatMoney0(data.kpis.over45Amount),
              },
            ]}
          />

          <InsightsCard title={`Insights for ${data.base.id}`} insights={data.insights} />

          <div className="card">
            <h2>Stage distribution</h2>
            <StageStack stages={data.stages} showAccounts />
          </div>

          <div className="two">
            <SegmentBars
              title="Commercial"
              overdueAmount={data.bySegment.C.overdueAmount}
              overdueAccounts={data.bySegment.C.overdueAccounts}
              stages={data.bySegment.C.stages}
            />
            <SegmentBars
              title="Residential"
              overdueAmount={data.bySegment.R.overdueAmount}
              overdueAccounts={data.bySegment.R.overdueAccounts}
              stages={data.bySegment.R.stages}
            />
          </div>

          {topAccounts.length > 0 ? (
            <div className="card">
              <h2>Largest accounts</h2>
              {editing ? (
                <AccountEditForm
                  account={editing}
                  onClose={() => setEditing(null)}
                />
              ) : null}
              <div className="wrap">
                <table className="data" style={{ minWidth: 780 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Client</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Stage</th>
                      <th>Status</th>
                      <th>Next action</th>
                      <th>Last contact</th>
                      <th>Edit</th>
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
                          <td>
                            {a.next_action || '—'}
                            {a.next_action_date ? (
                              <small
                                style={{
                                  display: 'block',
                                  color: 'var(--mu)',
                                }}
                              >
                                {a.next_action_date}
                              </small>
                            ) : null}
                          </td>
                          <td>{a.last_contacted || 'No record'}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => setEditing(a)}
                              aria-label={`Edit ${a.client_name}`}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="hint">
                Edits stay in this browser only (IndexedDB). Re-uploading preserves status / next
                action / notes when Excel cells are empty.
              </p>
            </div>
          ) : null}

          <div className="card">
            <h2>Comparison across bases</h2>
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
                  <span>{row.id}</span>
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

          <TrendsChart
            title={`Past-due trend · ${data.base.id}`}
            points={trends?.points ?? []}
          />
        </>
      ) : null}
    </QueryState>
  );
}
