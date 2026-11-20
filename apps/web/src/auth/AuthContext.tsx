import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, fetchMe, setAuthTokenProvider } from '../api/client';
import { getIdToken, setIdToken } from './tokenStore';
import type { AuthUser } from './types';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ?? '';
const AUTH_DISABLED =
  import.meta.env.VITE_AUTH_DISABLED === 'true' ||
  import.meta.env.VITE_AUTH_DISABLED === '1' ||
  (!CLIENT_ID && import.meta.env.DEV);

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  authDisabled: boolean;
  clientId: string;
  signInWithCredential: (credential: string) => Promise<void>;
  signOut: () => void;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAuthTokenProvider(() => getIdToken());
  }, []);

  const hydrate = useCallback(async (token: string | null) => {
    setLoading(true);
    setError(null);
    try {
      if (AUTH_DISABLED) {
        const me = await fetchMe();
        setUser(me.user);
        return;
      }
      if (!token) {
        setUser(null);
        return;
      }
      setIdToken(token);
      const me = await fetchMe();
      setUser(me.user);
    } catch (err) {
      setIdToken(null);
      setUser(null);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError(err.message);
      } else if (!AUTH_DISABLED) {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate(AUTH_DISABLED ? null : getIdToken());
  }, [hydrate]);

  const signInWithCredential = useCallback(
    async (credential: string) => {
      await hydrate(credential);
    },
    [hydrate],
  );

  const signOut = useCallback(() => {
    setIdToken(null);
    setUser(null);
    setError(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      error,
      authDisabled: AUTH_DISABLED,
      clientId: CLIENT_ID,
      signInWithCredential,
      signOut,
      isAdmin: user?.role === 'admin',
    }),
    [user, loading, error, signInWithCredential, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
