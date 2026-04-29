import { useEffect, useState } from 'react';

// Custom PWA install prompt — Chrome/Edge fire `beforeinstallprompt` when the
// site meets PWA criteria (manifest + HTTPS + visited a few times). We catch
// it, suppress the default mini-infobar, and surface our own toast-style
// banner so the user can install on demand.
//
// Hidden states:
// - User dismissed → localStorage flag for 30 days
// - Already installed → standalone display-mode → don't show
// - Browser doesn't fire the event (Safari, Firefox) → don't show

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'mapap-pwa-prompt-dismissed-at';
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

const wasRecentlyDismissed = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = Number.parseInt(raw, 10);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
};

export default function PwaInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (wasRecentlyDismissed()) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
    };
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setEvent(null);
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  };

  if (!event) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-prompt-title"
      className="fixed bottom-6 left-6 right-6 z-40 mx-auto max-w-md rounded-card bg-white p-4 shadow-card-hover sm:left-auto sm:right-6"
    >
      <div className="flex items-start gap-3">
        <img
          src="/pwa-192x192.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 flex-shrink-0 rounded-btn"
        />
        <div className="flex-1">
          <p id="pwa-prompt-title" className="font-display text-sm font-semibold text-primary">
            Installer Ma Papeterie
          </p>
          <p className="mt-1 text-xs text-primary/60">
            Accès rapide depuis votre écran d'accueil. Pas de pub, pas de tracking marketing.
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-9 items-center rounded-btn px-3 text-xs font-medium text-primary/60 hover:text-primary"
        >
          Plus tard
        </button>
        <button
          type="button"
          onClick={install}
          className="inline-flex h-9 items-center rounded-btn bg-accent px-4 text-xs font-medium text-white hover:bg-accent-hover"
        >
          Installer
        </button>
      </div>
    </div>
  );
}
