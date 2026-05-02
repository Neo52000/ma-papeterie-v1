import { useEffect, useState } from 'react';
import AdminGuard from './AdminGuard';
import { cdnImage } from '@/lib/cdn-image';
import { useAdminFetch } from '@/lib/admin-fetch';
import { dateFmtShort, eurFmt } from '@/lib/admin-format';

interface Product {
  id: string;
  name: string;
  slug: string | null;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  price_ttc: number | null;
  price: number | null;
  stock_quantity: number | null;
  available_qty_total: number | null;
  shopify_variant_id: string | null;
  is_active: boolean | null;
  is_vendable: boolean | null;
  updated_at: string;
}

const stockOf = (p: Product): number => Math.max(p.stock_quantity ?? 0, p.available_qty_total ?? 0);

export default function ProduitsBrowser() {
  return <AdminGuard>{({ token }) => <Inner token={token} />}</AdminGuard>;
}

function Inner({ token }: { token: string }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [syncStatus, setSyncStatus] = useState<'all' | 'synced' | 'unsynced'>('all');
  const [stockStatus, setStockStatus] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [page, setPage] = useState(1);

  // Debounce search input — kept here because it owns its own user-input
  // timer rather than fitting the standard fetch+cancel pattern.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set('q', debouncedSearch);
  params.set('sync', syncStatus);
  params.set('stock', stockStatus);
  params.set('page', String(page));
  const { data, error } = useAdminFetch<{
    items: Product[];
    total: number;
    hasMore: boolean;
  }>(`/api/admin/produits?${params.toString()}`, token, [
    debouncedSearch,
    syncStatus,
    stockStatus,
    page,
  ]);
  const items = data?.items ?? null;
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          placeholder="Rechercher (nom, marque, EAN…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <select
          value={syncStatus}
          onChange={(e) => {
            setSyncStatus(e.target.value as typeof syncStatus);
            setPage(1);
          }}
          aria-label="Filtre sync Shopify"
          className="h-10 rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="all">Tous (sync)</option>
          <option value="synced">Synced Shopify</option>
          <option value="unsynced">Pas synced</option>
        </select>
        <select
          value={stockStatus}
          onChange={(e) => {
            setStockStatus(e.target.value as typeof stockStatus);
            setPage(1);
          }}
          aria-label="Filtre stock"
          className="h-10 rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="all">Tous (stock)</option>
          <option value="in_stock">En stock</option>
          <option value="out_of_stock">Rupture</option>
        </select>
      </div>

      {error && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Erreur : {error}
        </div>
      )}

      {!error && items === null && <p className="text-sm text-primary/60">Chargement…</p>}

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
                    Catégorie
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Prix TTC
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Stock
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Sync
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary/60">
                    MAJ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5 bg-white">
                {items.map((p) => {
                  const stock = stockOf(p);
                  const synced = !!p.shopify_variant_id;
                  const price = p.price_ttc ?? p.price ?? 0;
                  return (
                    <tr key={p.id} className="hover:bg-bg-soft/50">
                      <td className="px-3 py-2">
                        <span className="block h-12 w-12 overflow-hidden rounded-btn bg-bg-soft">
                          {p.image_url ? (
                            <img
                              src={cdnImage(p.image_url, { width: 96 })}
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
                          {p.slug ? (
                            <a
                              href={`/produit/${p.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-accent"
                            >
                              {p.name}
                            </a>
                          ) : (
                            p.name
                          )}
                        </p>
                        {p.brand && <p className="text-xs text-primary/60">{p.brand}</p>}
                      </td>
                      <td className="px-3 py-2 text-xs text-primary/70">{p.category ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-primary">
                        {eurFmt.format(price)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`inline-flex items-center rounded-badge px-2 py-0.5 text-xs font-medium ${
                            stock > 5
                              ? 'bg-green-50 text-green-700'
                              : stock > 0
                                ? 'bg-accent/10 text-accent'
                                : 'bg-primary/5 text-primary/40'
                          }`}
                        >
                          {stock}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {synced ? (
                          <span className="inline-flex items-center rounded-badge bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            ✓ Shopify
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-badge bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary/40">
                            non synced
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-primary/50">
                        {dateFmtShort.format(new Date(p.updated_at))}
                      </td>
                    </tr>
                  );
                })}
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
