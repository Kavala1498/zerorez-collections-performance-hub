import { useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { BASES } from '@zerorez/shared';
import { useTheme } from '../hooks/useTheme';
import { Sidebar } from './Sidebar';

function crumbLabel(pathname: string, baseId?: string): string {
  if (pathname.startsWith('/cargar')) return 'Upload data';
  if (pathname.startsWith('/bases/') && baseId) {
    return BASES.find((b) => b.id === baseId)?.name ?? baseId;
  }
  return 'Dashboard';
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const params = useParams();
  const { resolved, toggle } = useTheme();
  const crumb = crumbLabel(location.pathname, params.id);

  return (
    <div className={`shell${open ? ' open' : ''}`}>
      <Sidebar onNavigate={() => setOpen(false)} />
      <div className="content">
        <header className="topbar">
          <button
            id="menu"
            type="button"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
          <div className="crumb">
            Zerorez Collections Performance Hub / <b>{crumb}</b>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggle}
              title={resolved === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {resolved === 'dark' ? 'Light' : 'Dark'}
            </button>
            <span className="by2">Developed by Alejandro Torres</span>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
