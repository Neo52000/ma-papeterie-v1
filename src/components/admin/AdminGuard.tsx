import { useEffect, useState, type ReactNode } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

// Client-side admin guard. Wraps any admin React island. On mount :
//   - If no Supabase session → redirect to /connexion?next=<current>
//   - If session but not admin → render 403 message
//   - If admin → render children
//
// We can't gate at SSR because Supabase JS v2 stores sessions in localStorage,
// not cookies, so the server has no access to the auth state.

interface AdminGuardProps {
  children: (ctx: { email: string; token: string }) => ReactNode;
}

type State =
  | { kind: 'loading' }
  | { kind: 'forbidden'; email: string }
  | { kind: 'admin'; email: string; token: string };

export default function AdminGuard({ children }: AdminGuardProps) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void supabaseBrowser.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const session = data.session;
      if (!session) {
        const next = encodeURIComponent(window.location.pathname);
        window.location.href = `/connexion?next=${next}`;
        return;
      }
      const res = await fetch('/api/admin/me', {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ kind: 'forbidden', email: session.user.email ?? '' });
        return;
      }
      const json = (await res.json()) as { isAdmin: boolean; email: string };
      if (!json.isAdmin) {
        setState({ kind: 'forbidden', email: json.email });
        return;
      }
      setState({ kind: 'admin', email: json.email, token: session.access_token });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-primary/60">Vérification des droits…</p>
      </div>
    );
  }

  if (state.kind === 'forbidden') {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-danger/30 bg-danger/5 p-8 text-center">
        <p className="font-display text-xl font-semibold text-danger">Accès refusé</p>
        <p className="mt-2 text-sm text-primary/70">
          Le compte <strong>{state.email}</strong> n'est pas administrateur. Si vous pensez que
          c'est une erreur, contactez le propriétaire du site.
        </p>
        <a
          href="/"
          className="mt-4 inline-flex h-10 items-center rounded-btn bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
        >
          Retour au site
        </a>
      </div>
    );
  }

  return <>{children({ email: state.email, token: state.token })}</>;
}
