import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BASES } from '@zerorez/shared';
import { fetchBases } from '../api/client';
import { formatCompactK } from '../lib/format';

type Props = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: Props) {
  const basesQuery = useQuery({
    queryKey: ['bases', 'all'],
    queryFn: () => fetchBases('all'),
  });

  const byId = new Map((basesQuery.data?.bases ?? []).map((b) => [b.id, b]));

  return (
    <aside className="sidebar" id="side">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          z
        </div>
        <div>
          Zerorez
          <small>Collections Hub</small>
        </div>
      </div>

      <h3>Platform</h3>
      <NavLink
        to="/"
        end
        className={({ isActive }) => `nav-item${isActive ? ' on' : ''}`}
        onClick={onNavigate}
      >
        <span>Dashboard</span>
      </NavLink>
      <NavLink
        to="/cargar"
        className={({ isActive }) => `nav-item${isActive ? ' on' : ''}`}
        onClick={onNavigate}
      >
        <span>Upload data</span>
      </NavLink>

      <h3>Bases</h3>
      {BASES.map((base) => {
        const row = byId.get(base.id);
        const amount = row?.overdueAmount ?? 0;
        const color = row?.severityColor ?? '#8FBF8A';
        return (
          <NavLink
            key={base.id}
            to={`/bases/${encodeURIComponent(base.id)}`}
            className={({ isActive }) => `nav-item${isActive ? ' on' : ''}`}
            onClick={onNavigate}
          >
            <i style={{ background: color }} aria-hidden="true" />
            <span>{base.id}</span>
            <em>{formatCompactK(amount)}</em>
          </NavLink>
        );
      })}

      <div className="sidebar-by">Developed by Alejandro Torres</div>
    </aside>
  );
}
