import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';

export function LoginPage() {
  const { user, loading, authDisabled, error, clientId } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <p className="hint">Checking session…</p>
        </div>
      </div>
    );
  }

  if (user || authDisabled) {
    return <Navigate to="/" replace />;
  }

  const message = localError ?? error;

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="brand login-brand">
          <div className="brand-mark" aria-hidden="true">
            z
          </div>
          <div>
            Zerorez
            <small>Collections Hub</small>
          </div>
        </div>
        <h1>Sign in</h1>
        <p>
          Use your company Google account
          {clientId ? '' : ' (configure VITE_GOOGLE_OAUTH_CLIENT_ID)'}. Access is limited to the
          configured company domain. Admins can upload Excel files; viewers are read-only.
        </p>
        {clientId ? (
          <GoogleSignInButton onError={setLocalError} />
        ) : (
          <p className="hint">
            Set <code>VITE_GOOGLE_OAUTH_CLIENT_ID</code> and matching API{' '}
            <code>GOOGLE_OAUTH_CLIENT_ID</code>, or enable <code>VITE_AUTH_DISABLED=true</code> for
            local development.
          </p>
        )}
        {message ? (
          <p className="login-error" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
