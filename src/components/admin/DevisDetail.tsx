import { useEffect, useState } from 'react';
import AdminGuard from './AdminGuard';
import { DevisDetailSkeleton } from './AdminSkeletons';
import { useAdminFetch } from '@/lib/admin-fetch';
import { dateFmtLong } from '@/lib/admin-format';
import {
  DEVIS_STATUS_LABELS,
  type DevisDetail as DevisDetailRow,
  type DevisStatus,
} from '@/types/devis';

export interface DevisDetailProps {
  id: string;
}

export default function DevisDetail({ id }: DevisDetailProps) {
  return <AdminGuard>{({ token }) => <DevisDetailInner id={id} token={token} />}</AdminGuard>;
}

function DevisDetailInner({ id, token }: { id: string; token: string }) {
  const { data, error } = useAdminFetch<{ quote: DevisDetailRow }>(
    `/api/admin/devis/${id}`,
    token,
  );
  const [quote, setQuote] = useState<DevisDetailRow | null>(null);
  const [statusValue, setStatusValue] = useState<DevisStatus>('pending');
  const [updateState, setUpdateState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!data) return;
    setQuote(data.quote);
    setStatusValue(data.quote.status);
  }, [data]);

  const updateStatus = async () => {
    if (!quote) return;
    setUpdateState('saving');
    try {
      const res = await fetch(`/api/admin/devis/${id}`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status: statusValue }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUpdateState('saved');
      setQuote({ ...quote, status: statusValue });
      window.setTimeout(() => setUpdateState('idle'), 2000);
    } catch {
      setUpdateState('error');
    }
  };

  if (error) {
    return (
      <p className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        Erreur : {error}
      </p>
    );
  }

  if (!quote) {
    return <DevisDetailSkeleton />;
  }

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-4 text-xs text-primary/60">
        <ol className="flex items-center gap-2">
          <li>
            <a href="/admin" className="hover:text-accent">
              Admin
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <a href="/admin/devis" className="hover:text-accent">
              Devis B2B
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-primary">{quote.company_name}</li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <article className="rounded-card border border-primary/10 bg-white p-6 shadow-card">
          <header className="border-b border-primary/10 pb-4">
            <h1 className="font-display text-xl font-semibold text-primary">
              {quote.company_name}
            </h1>
            <p className="mt-1 text-xs text-primary/60">
              Reçu le {dateFmtLong.format(new Date(quote.created_at))}
              {quote.source && ` · source : ${quote.source}`}
            </p>
          </header>

          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Contact" value={quote.contact_name} />
            <Row
              label="Email"
              value={
                <a href={`mailto:${quote.email}`} className="text-accent hover:text-accent-hover">
                  {quote.email}
                </a>
              }
            />
            {quote.phone && (
              <Row
                label="Téléphone"
                value={
                  <a
                    href={`tel:${quote.phone.replace(/\s/g, '')}`}
                    className="text-accent hover:text-accent-hover"
                  >
                    {quote.phone}
                  </a>
                }
              />
            )}
            {quote.siret && (
              <Row
                label="SIRET"
                value={<span className="font-mono text-xs text-primary">{quote.siret}</span>}
              />
            )}
            {quote.attachment_url && (
              <Row
                label="Pièce jointe"
                value={
                  <a
                    href={quote.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover"
                  >
                    Télécharger
                  </a>
                }
              />
            )}
          </dl>

          <div className="mt-6 border-t border-primary/10 pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-primary/60">
              Demande
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-primary/90">{quote.message}</p>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-card border border-primary/10 bg-white p-4 shadow-card">
            <label
              htmlFor="status"
              className="text-xs font-semibold uppercase tracking-wider text-primary/60"
            >
              Changer le statut
            </label>
            <select
              id="status"
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value as DevisStatus)}
              className="mt-2 h-10 w-full rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {(Object.keys(DEVIS_STATUS_LABELS) as Array<DevisStatus>).map((s) => (
                <option key={s} value={s}>
                  {DEVIS_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={updateStatus}
              disabled={updateState === 'saving' || statusValue === quote.status}
              className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-btn bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateState === 'saving'
                ? 'Enregistrement…'
                : updateState === 'saved'
                  ? '✓ Enregistré'
                  : 'Mettre à jour'}
            </button>
            {updateState === 'error' && (
              <p className="mt-2 text-xs text-danger">Erreur lors de la mise à jour.</p>
            )}
          </div>

          <div className="rounded-card border border-primary/10 bg-white p-4 text-xs text-primary/60">
            <p className="font-medium text-primary">Actions rapides</p>
            <ul className="mt-2 space-y-1">
              <li>
                <a
                  href={`mailto:${quote.email}?subject=Devis%20${encodeURIComponent(quote.company_name)}&body=Bonjour%20${encodeURIComponent(quote.contact_name ?? '')}%2C%0A%0AMerci%20pour%20votre%20demande%20de%20devis...`}
                  className="text-accent hover:text-accent-hover"
                >
                  Répondre par email →
                </a>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-primary/60">{label}</dt>
      <dd className="col-span-2 text-primary">{value}</dd>
    </div>
  );
}
