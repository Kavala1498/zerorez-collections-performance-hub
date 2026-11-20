import { useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { BASES } from '@zerorez/shared';
import { useTheme } from '../hooks/useTheme';
import { Sidebar } from './Sidebar';

function crumbLabel(pathname: string, baseId?: string): string {
  if (pathname.startsWith('/cargar')) return 'Cargar datos';
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
            aria-label="Menú"
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
              aria-label={resolved === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              onClick={toggle}
              title={resolved === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {resolved === 'dark' ? 'Claro' : 'Oscuro'}
            </button>
            <span className="by2">Desarrollado por Alejandro Torres</span>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
