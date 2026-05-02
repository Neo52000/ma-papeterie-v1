import { useState } from 'react';
import AdminGuard from './AdminGuard';
import { TableSkeleton } from './AdminSkeletons';
import { useAdminFetch } from '@/lib/admin-fetch';
import { dateTimeFmt } from '@/lib/admin-format';
import { buildCsv, downloadCsv } from '@/lib/csv-export';

interface SchoolList {
  id: string;
  created_at: string;
  user_id: string | null;
  school_level: string | null;
  raw_text: string;
  matched_items: unknown;
}

const matchedCount = (m: unknown): number => {
  if (Array.isArray(m)) return m.length;
  return 0;
};

const exportListesCsv = (rows: SchoolList[]): void => {
  const headers = [
    'created_at',
    'school_level',
    'user_id',
    'matched_count',
    'raw_text',
    'matched_items_json',
  ];
  const body = rows.map((l) => [
    l.created_at,
    l.school_level ?? '',
    l.user_id ?? 'invité',
    matchedCount(l.matched_items),
    l.raw_text,
    JSON.stringify(l.matched_items ?? []),
  ]);
  const filename = `listes-scolaires-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsv(filename, buildCsv(headers, body));
};

export default function ListesScolairesList() {
  return <AdminGuard>{({ token }) => <Inner token={token} />}</AdminGuard>;
}

function Inner({ token }: { token: string }) {
  const { data, error } = useAdminFetch<{ items: SchoolList[] }>(
    '/api/admin/listes-scolaires',
    token,
  );
  const items = data?.items ?? null;
  const [openId, setOpenId] = useState<string | null>(null);

  if (error) {
    return (
      <p className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        Erreur : {error}
      </p>
    );
  }
  if (items === null) {
    return <TableSkeleton rows={4} colWidths={['w-1/2', 'w-1/4', 'w-12']} />;
  }
  if (items.length === 0) {
    return (
      <div className="rounded-card border border-primary/10 bg-white p-12 text-center text-sm text-primary/60">
        Aucune liste scolaire soumise.
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-primary/10 pb-3">
        <p className="text-xs text-primary/60">
          {items.length} liste{items.length > 1 ? 's' : ''} soumise
          {items.length > 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={() => exportListesCsv(items)}
          className="inline-flex h-9 items-center rounded-btn border border-accent/30 bg-accent/5 px-3 text-xs font-medium text-accent hover:bg-accent/10"
        >
          ↓ Export CSV
        </button>
      </div>
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
                aria-label={`${isOpen ? 'Replier' : 'Voir'} la liste du ${dateTimeFmt.format(new Date(list.created_at))}`}
              >
                <div className="flex-1">
                  <p className="text-xs text-primary/60">
                    {dateTimeFmt.format(new Date(list.created_at))}
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
    </>
  );
}
