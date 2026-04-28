import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

// Header icon for the customer account. Renders a generic person icon
// linking to /connexion until the auth state is hydrated, then shows the
// user's initial linking to /compte once a session is present.
//
// The 1st-paint state is intentionally the unauthenticated icon to match
// SSR (BaseLayout has no auth context). Hydration swaps without layout shift
// because both states render the same 40×40 button.
export default function AccountTrigger() {
  const [initial, setInitial] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabaseBrowser.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const session = data.session;
      if (!session) return;
      const meta = (session.user.user_metadata ?? {}) as { display_name?: string };
      const source = (meta.display_name ?? session.user.email ?? '?').trim();
      setInitial(source.charAt(0).toUpperCase());
    });
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setInitial(null);
        return;
      }
      const meta = (session.user.user_metadata ?? {}) as { display_name?: string };
      const source = (meta.display_name ?? session.user.email ?? '?').trim();
      setInitial(source.charAt(0).toUpperCase());
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (initial) {
    return (
      <a
        href="/compte"
        aria-label="Mon compte"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white hover:bg-primary/90"
      >
        {initial}
      </a>
    );
  }

  return (
    <a
      href="/connexion"
      aria-label="Se connecter"
      className="inline-flex h-10 w-10 items-center justify-center rounded-btn text-primary hover:bg-bg-soft"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </a>
  );
}
