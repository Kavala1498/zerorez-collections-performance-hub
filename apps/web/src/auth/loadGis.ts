type GisAccounts = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          theme?: string;
          size?: string;
          text?: string;
          shape?: string;
          width?: number;
        },
      ) => void;
      prompt: () => void;
      disableAutoSelect: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: GisAccounts;
  }
}

const SCRIPT_ID = 'google-gis-client';
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export function loadGoogleIdentityServices(): Promise<GisAccounts> {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.google) resolve(window.google);
        else reject(new Error('Google Identity Services failed to load'));
      });
      existing.addEventListener('error', () =>
        reject(new Error('Google Identity Services failed to load')),
      );
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.google) resolve(window.google);
      else reject(new Error('Google Identity Services failed to load'));
    };
    script.onerror = () => reject(new Error('Google Identity Services failed to load'));
    document.head.appendChild(script);
  });
}
