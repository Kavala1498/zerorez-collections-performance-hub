import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { loadGoogleIdentityServices } from './loadGis';

type Props = {
  onError?: (message: string) => void;
};

export function GoogleSignInButton({ onError }: Props) {
  const { clientId, signInWithCredential } = useAuth();
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!clientId || !hostRef.current) return;
    let cancelled = false;

    void (async () => {
      try {
        const google = await loadGoogleIdentityServices();
        if (cancelled || !hostRef.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            void signInWithCredential(response.credential).catch((err: unknown) => {
              onError?.(err instanceof Error ? err.message : 'Sign-in failed');
            });
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        hostRef.current.innerHTML = '';
        google.accounts.id.renderButton(hostRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 280,
        });
        setReady(true);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Google Sign-In unavailable');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, onError, signInWithCredential]);

  return (
    <div className="gis-host">
      <div ref={hostRef} />
      {!ready ? <p className="hint">Loading Google Sign-In…</p> : null}
    </div>
  );
}
