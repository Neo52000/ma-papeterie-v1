import { useEffect, useState } from 'react';
import AdminGuard from './AdminGuard';

interface SchoolList {
  id: string;
  created_at: string;
  user_id: string | null;
  school_level: string | null;
  raw_text: string;
  matched_items: unknown;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

const matchedCount = (m: unknown): number => {
  if (Array.isArray(m)) return m.length;
  return 0;
};

export default function ListesScolairesList() {
  return <AdminGuard>{({ token }) => <Inner token={token} />}</AdminGuard>;
}

function Inner({ token }: { token: string }) {
  const [items, setItems] = useState<SchoolList[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/admin/listes-scolaires', {
      headers: { authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { items: SchoolList[] };
        setItems(json.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <p className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        Erreur : {error}
      </p>
    );
  }
  if (items === null) return <p className="text-sm text-primary/60">Chargement…</p>;
  if (items.length === 0) {
    return (
      <div className="rounded-card border border-primary/10 bg-white p-12 text-center text-sm text-primary/60">
        Aucune liste scolaire soumise.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((list) => {
        const isOpen = openId === list.id;
        return (
          <article
            key={list.id}
            className="rounded-card border border-primary/10 bg-white shadow-card"
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : list.id)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-bg-soft"
              aria-expanded={isOpen}
            >
              <div className="flex-1">
                <p className="text-xs text-primary/60">
                  {dateFmt.format(new Date(list.created_at))}
                  {list.school_level && ` · ${list.school_level}`}
                  {list.user_id ? ' · client connecté' : ' · invité'}
                </p>
                <p className="mt-1 line-clamp-1 text-sm text-primary">
                  {list.raw_text.split('\n')[0] ?? '—'}
                </p>
              </div>
              <span className="rounded-badge bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary/70">
                {matchedCount(list.matched_items)} matched
              </span>
              <span className="text-primary/40">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <div className="border-t border-primary/10 px-4 py-3 text-sm">
                <p className="font-medium text-primary">Texte brut</p>
                <pre className="mt-1 whitespace-pre-wrap rounded-btn bg-bg-soft p-3 font-mono text-xs text-primary/80">
                  {list.raw_text}
                </pre>
                <p className="mt-3 font-medium text-primary">Matched items (JSON)</p>
                <pre className="mt-1 max-h-96 overflow-auto rounded-btn bg-bg-soft p-3 font-mono text-xs text-primary/80">
                  {JSON.stringify(list.matched_items, null, 2)}
                </pre>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
