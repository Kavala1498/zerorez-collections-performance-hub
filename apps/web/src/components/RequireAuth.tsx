import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function RequireAuth() {
  const { user, loading, authDisabled } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page">
        <div className="state-box">
          <h2>Loading…</h2>
          <p>Checking your session.</p>
        </div>
      </div>
    );
  }

  if (!authDisabled && !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
