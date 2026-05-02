import { useState } from 'react';
import AdminGuard from './AdminGuard';
import { TableSkeleton } from './AdminSkeletons';
import { useAdminFetch } from '@/lib/admin-fetch';
import { dateTimeFmt } from '@/lib/admin-format';
import {
  DEVIS_STATUS_LABELS,
  DEVIS_STATUS_TONES,
  type DevisRow,
} from '@/types/devis';

const FILTERS = [
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'answered', label: 'Répondu' },
  { value: 'archived', label: 'Archivé' },
  { value: 'all', label: 'Tous' },
];

export default function DevisList() {
  return <AdminGuard>{({ token }) => <DevisListInner token={token} />}</AdminGuard>;
}

function DevisListInner({ token }: { token: string }) {
  const [status, setStatus] = useState<string>(() => {
    if (typeof window === 'undefined') return 'pending';
    const fromUrl = new URLSearchParams(window.location.search).get('status');
    return fromUrl ?? 'pending';
  });
  const { data, error } = useAdminFetch<{ items: DevisRow[] }>(
    `/api/admin/devis?status=${status}`,
    token,
    [status],
  );
  const items = data?.items ?? null;

  const onTab = (newStatus: string) => {
    setStatus(newStatus);
    const url = new URL(window.location.href);
    url.searchParams.set('status', newStatus);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <>
      <nav
        aria-label="Filtre par statut"
        className="mb-4 flex flex-wrap gap-2 border-b border-primary/10 pb-3"
      >
        {FILTERS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTab(tab.value)}
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

      {error && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Erreur : {error}
        </div>
      )}

      {!error && items === null && (
        <TableSkeleton rows={5} colWidths={['w-24', 'w-1/3', 'w-2/5', 'w-20', 'w-16']} />
      )}

      {!error && items && items.length === 0 && (
        <div className="rounded-card border border-primary/10 bg-white p-12 text-center text-sm text-primary/60">
          Aucun devis avec ce statut.
        </div>
      )}

      {!error && items && items.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-primary/10 bg-white shadow-card">
          <table className="min-w-full divide-y divide-primary/10 text-sm">
            <thead className="bg-bg-soft">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                  Société
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary/60">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 bg-white">
              {items.map((row) => (
                <tr key={row.id} className="hover:bg-bg-soft/50">
                  <td className="px-4 py-3 text-xs text-primary/60">
                    {dateTimeFmt.format(new Date(row.created_at))}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-primary">{row.company_name}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="text-primary">{row.contact_name}</p>
                    <p className="text-primary/60">{row.email}</p>
                    {row.phone && <p className="text-primary/60">{row.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-badge px-2 py-0.5 text-xs font-medium ${DEVIS_STATUS_TONES[row.status]}`}
                    >
                      {DEVIS_STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/admin/devis/${row.id}`}
                      aria-label={`Voir le devis de ${row.company_name}`}
                      className="inline-flex h-8 items-center rounded-btn border border-primary/15 px-3 text-xs font-medium text-primary hover:border-accent hover:text-accent"
                    >
                      Détail →
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
