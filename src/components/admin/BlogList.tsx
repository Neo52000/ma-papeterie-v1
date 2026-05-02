import { useState } from 'react';
import AdminGuard from './AdminGuard';
import { TableSkeleton } from './AdminSkeletons';
import { useAdminFetch } from '@/lib/admin-fetch';
import { dateTimeFmt } from '@/lib/admin-format';

interface BlogListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  published_at: string | null;
  author: string;
  reading_minutes: number | null;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'published', label: 'Publiés' },
];

export default function BlogList() {
  return <AdminGuard>{({ token }) => <Inner token={token} />}</AdminGuard>;
}

function Inner({ token }: { token: string }) {
  const [status, setStatus] = useState('all');
  const { data, error } = useAdminFetch<{ items: BlogListItem[] }>(
    `/api/admin/blog?status=${status}`,
    token,
    [status],
  );
  const items = data?.items ?? null;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-primary/10 pb-3">
        <nav aria-label="Filtre par statut" className="flex flex-wrap gap-2">
          {FILTERS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              aria-current={status === tab.value ? 'page' : undefined}
              className={`inline-flex h-8 items-center rounded-btn px-3 text-xs font-medium transition-colors ${
                status === tab.value
                  ? 'bg-primary text-white'
                  : 'border border-primary/15 text-primary/70 hover:border-accent/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <a
          href="/admin/blog/nouveau"
          className="ml-auto inline-flex h-9 items-center rounded-btn bg-primary px-4 text-xs font-medium text-white hover:bg-primary/90"
        >
          + Nouvel article
        </a>
      </div>

      {error && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Erreur : {error}
        </div>
      )}

      {!error && items === null && (
        <TableSkeleton rows={5} colWidths={['w-1/2', 'w-24', 'w-20', 'w-16']} />
      )}

      {!error && items && items.length === 0 && (
        <div className="rounded-card border border-primary/10 bg-white p-12 text-center text-sm text-primary/60">
          Aucun article {status !== 'all' && `(${FILTERS.find((f) => f.value === status)?.label})`}.
          <br />
          <a href="/admin/blog/nouveau" className="mt-2 inline-block text-accent hover:underline">
            Créer le premier article →
          </a>
        </div>
      )}

      {!error && items && items.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-primary/10 bg-white shadow-card">
          <table className="min-w-full divide-y divide-primary/10 text-sm">
            <thead className="bg-bg-soft">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                  Titre
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                  Modifié
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary/60">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 bg-white">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-bg-soft/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-primary">{p.title}</p>
                    <p className="text-xs text-primary/50">
                      /{p.slug} · {p.author}
                      {p.ai_generated && (
                        <span className="ml-2 rounded-badge bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                          IA
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {p.published_at ? (
                      <span className="inline-flex items-center rounded-badge bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                        Publié
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-badge bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary/60 ring-1 ring-primary/10">
                        Brouillon
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-primary/60">
                    {dateTimeFmt.format(new Date(p.updated_at))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/admin/blog/${p.id}`}
                      className="inline-flex h-8 items-center rounded-btn border border-primary/15 px-3 text-xs font-medium text-primary hover:border-accent hover:text-accent"
                    >
                      Éditer →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
