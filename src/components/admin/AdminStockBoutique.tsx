import { useEffect, useState } from 'react';
import AdminGuard from './AdminGuard';
import { TableSkeleton } from './AdminSkeletons';
import { cdnImage } from '@/lib/cdn-image';
import { useAdminFetch } from '@/lib/admin-fetch';
import { dateFmtShort } from '@/lib/admin-format';

type SalesChannel = 'both' | 'online' | 'pos';

interface StockProduct {
  id: string;
  name: string;
  slug: string | null;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  stock_online: number | null;
  stock_boutique: number | null;
  sales_channel: SalesChannel | null;
  shopify_variant_id: string | null;
  updated_at: string;
}

interface ListResponse {
  items: StockProduct[];
  total: number;
  hasMore: boolean;
}

const CHANNEL_LABEL: Record<SalesChannel, string> = {
  both: 'Les deux',
  online: 'En ligne',
  pos: 'Boutique',
};

const CHANNEL_BADGE: Record<SalesChannel, string> = {
  both: 'bg-green-50 text-green-700',
  online: 'bg-blue-50 text-blue-700',
  pos: 'bg-accent/10 text-accent',
};

export default function AdminStockBoutique() {
  return <AdminGuard>{({ token }) => <Inner token={token} />}</AdminGuard>;
}

function Inner({ token }: { token: string }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [channel, setChannel] = useState<'all' | SalesChannel>('all');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set('q', debouncedSearch);
  params.set('channel', channel);
  params.set('page', String(page));

  const { data, error } = useAdminFetch<ListResponse>(
    `/api/admin/stock-boutique?${params.toString()}`,
    token,
    [debouncedSearch, channel, page, refreshKey],
  );

  const items = data?.items ?? null;
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="search"
          placeholder="Rechercher (nom, marque, EAN…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <select
          value={channel}
          onChange={(e) => {
            setChannel(e.target.value as 'all' | SalesChannel);
            setPage(1);
          }}
          aria-label="Filtre canal de vente"
          className="h-10 rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="all">Tous canaux</option>
          <option value="both">Les deux</option>
          <option value="online">En ligne</option>
          <option value="pos">Boutique</option>
        </select>
      </div>

      {error && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Erreur : {error}
        </div>
      )}

      {!error && items === null && (
        <TableSkeleton rows={6} colWidths={['w-12', 'w-1/3', 'w-20', 'w-20', 'w-24', 'w-16']} />
      )}

      {!error && items && items.length === 0 && (
        <div className="rounded-card border border-primary/10 bg-white p-12 text-center text-sm text-primary/60">
          Aucun produit avec ces filtres.
        </div>
      )}

      {!error && items && items.length > 0 && (
        <>
          <p className="mb-2 text-xs text-primary/60">
            ~{total.toLocaleString('fr-FR')} produits · page {page}
          </p>
          <div className="overflow-x-auto rounded-card border border-primary/10 bg-white shadow-card">
            <table className="min-w-full divide-y divide-primary/10 text-sm">
              <thead className="bg-bg-soft">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Image
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Produit
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Canal
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Stock online
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Stock boutique
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary/60">
                    MAJ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5 bg-white">
                {items.map((p) => (
                  <Row
                    key={p.id}
                    product={p}
                    token={token}
                    onSaved={() => setRefreshKey((k) => k + 1)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex h-9 items-center rounded-btn border border-primary/15 bg-white px-3 text-xs font-medium text-primary disabled:opacity-40"
            >
              ← Précédent
            </button>
            <span className="text-xs text-primary/60">Page {page}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="inline-flex h-9 items-center rounded-btn border border-primary/15 bg-white px-3 text-xs font-medium text-primary disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        </>
      )}
    </>
  );
}

interface RowProps {
  product: StockProduct;
  token: string;
  onSaved: () => void;
}

function Row({ product, token, onSaved }: RowProps) {
  const initial = product.stock_boutique ?? 0;
  const [draft, setDraft] = useState<string>(String(initial));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(product.stock_boutique ?? 0));
  }, [product.stock_boutique]);

  const channel = product.sales_channel ?? 'both';
  const isPosLocked = channel === 'online';
  const dirty = Number(draft) !== initial;

  const save = async () => {
    const value = Number(draft);
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      setRowError('Valeur invalide');
      return;
    }
    setSaving(true);
    setRowError(null);
    try {
      const res = await fetch('/api/admin/stock-boutique', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ id: product.id, stock_boutique: value }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setSavedAt(Date.now());
      onSaved();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="hover:bg-bg-soft/50">
      <td className="px-3 py-2">
        <span className="block h-12 w-12 overflow-hidden rounded-btn bg-bg-soft">
          {product.image_url ? (
            <img
              src={cdnImage(product.image_url, { width: 96 })}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          ) : null}
        </span>
      </td>
      <td className="px-3 py-2">
        <p className="font-medium text-primary">
          {product.slug ? (
            <a
              href={`/produit/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent"
            >
              {product.name}
            </a>
          ) : (
            product.name
          )}
        </p>
        {product.brand && <p className="text-xs text-primary/60">{product.brand}</p>}
        {product.category && <p className="text-xs text-primary/40">{product.category}</p>}
      </td>
      <td className="px-3 py-2">
        <span
          className={`inline-flex items-center rounded-badge px-2 py-0.5 text-xs font-medium ${CHANNEL_BADGE[channel]}`}
        >
          {CHANNEL_LABEL[channel]}
        </span>
      </td>
      <td className="px-3 py-2 text-right text-sm text-primary/70">{product.stock_online ?? 0}</td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-2">
          <input
            type="number"
            min={0}
            max={9999}
            step={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setSavedAt(null);
              setRowError(null);
            }}
            disabled={isPosLocked || saving}
            aria-label={`Stock boutique pour ${product.name}`}
            title={isPosLocked ? 'Canal "en ligne" — stock boutique forcé à 0' : undefined}
            className="h-8 w-20 rounded-btn border border-primary/15 bg-white px-2 text-right text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:bg-primary/5 disabled:text-primary/40"
          />
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving || isPosLocked}
            className="inline-flex h-8 items-center rounded-btn bg-primary px-3 text-xs font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? '…' : 'OK'}
          </button>
        </div>
        {rowError && <p className="mt-1 text-right text-xs text-danger">{rowError}</p>}
        {savedAt && !rowError && !dirty && (
          <p className="mt-1 text-right text-xs text-green-700">Enregistré ✓</p>
        )}
      </td>
      <td className="px-3 py-2 text-right text-xs text-primary/50">
        {dateFmtShort.format(new Date(product.updated_at))}
      </td>
    </tr>
  );
}
