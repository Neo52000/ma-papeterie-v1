import { useEffect, useState } from 'react';
import AdminGuard from './AdminGuard';

interface WaitlistRow {
  id: string;
  created_at: string;
  email: string;
  feature: string;
  product_id: string | null;
  metadata: Record<string, unknown>;
}

interface ProductInfo {
  name: string;
  slug: string | null;
  stock: number;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });

const FEATURES = [
  { value: 'liste_scolaire', label: 'Liste scolaire (notif ouverture)' },
  { value: 'back_in_stock', label: 'Back-in-stock (par produit)' },
];

const downloadCsv = (rows: WaitlistRow[], feature: string): void => {
  const headers =
    feature === 'back_in_stock'
      ? ['email', 'product_id', 'created_at']
      : ['email', 'prenom', 'niveau', 'created_at'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    if (feature === 'back_in_stock') {
      lines.push([r.email, r.product_id ?? '', r.created_at].join(','));
    } else {
      const meta = r.metadata as { prenom?: string; niveau?: string };
      lines.push([r.email, meta.prenom ?? '', meta.niveau ?? '', r.created_at].join(','));
    }
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `waitlist-${feature}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function WaitlistView() {
  return <AdminGuard>{({ token }) => <Inner token={token} />}</AdminGuard>;
}

function Inner({ token }: { token: string }) {
  const [feature, setFeature] = useState<string>('liste_scolaire');
  const [items, setItems] = useState<WaitlistRow[] | null>(null);
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    void fetch(`/api/admin/waitlist?feature=${feature}`, {
      headers: { authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as {
          items: WaitlistRow[];
          products?: Record<string, ProductInfo>;
        };
        setItems(json.items);
        setProducts(json.products ?? {});
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [feature, token]);

  return (
    <>
      <nav
        aria-label="Filtre par feature"
        className="mb-4 flex flex-wrap items-center gap-2 border-b border-primary/10 pb-3"
      >
        {FEATURES.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFeature(f.value)}
            aria-current={feature === f.value ? 'page' : undefined}
            className={`inline-flex h-8 items-center rounded-btn px-3 text-xs font-medium transition-colors ${
              feature === f.value
                ? 'bg-primary text-white'
                : 'border border-primary/15 text-primary/70 hover:border-accent/50'
            }`}
          >
            {f.label}
          </button>
        ))}
        {items && items.length > 0 && (
          <button
            type="button"
            onClick={() => downloadCsv(items, feature)}
            className="ml-auto inline-flex h-8 items-center rounded-btn border border-accent/30 bg-accent/5 px-3 text-xs font-medium text-accent hover:bg-accent/10"
          >
            ↓ Export CSV
          </button>
        )}
      </nav>

      {error && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Erreur : {error}
        </div>
      )}

      {!error && items === null && <p className="text-sm text-primary/60">Chargement…</p>}

      {!error && items && items.length === 0 && (
        <div className="rounded-card border border-primary/10 bg-white p-12 text-center text-sm text-primary/60">
          Aucun inscrit pour cette feature.
        </div>
      )}

      {!error && items && items.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-primary/10 bg-white shadow-card">
          <table className="min-w-full divide-y divide-primary/10 text-sm">
            <thead className="bg-bg-soft">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                  Email
                </th>
                {feature === 'back_in_stock' ? (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                      Produit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                      Stock
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                      Prénom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                      Niveau
                    </th>
                  </>
                )}
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary/60">
                  Inscrit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 bg-white">
              {items.map((row) => {
                const product = row.product_id ? products[row.product_id] : null;
                const meta = row.metadata as { prenom?: string; niveau?: string };
                return (
                  <tr key={row.id} className="hover:bg-bg-soft/50">
                    <td className="px-4 py-3">
                      <a
                        href={`mailto:${row.email}`}
                        className="text-accent hover:text-accent-hover"
                      >
                        {row.email}
                      </a>
                    </td>
                    {feature === 'back_in_stock' ? (
                      <>
                        <td className="px-4 py-3 text-xs">
                          {product ? (
                            <a
                              href={product.slug ? `/produit/${product.slug}` : '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-accent"
                            >
                              {product.name}
                            </a>
                          ) : (
                            <span className="text-primary/40">{row.product_id}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span
                            className={
                              product && product.stock > 0
                                ? 'rounded-badge bg-green-50 px-2 py-0.5 font-medium text-green-700'
                                : 'rounded-badge bg-accent/10 px-2 py-0.5 font-medium text-accent'
                            }
                          >
                            {product?.stock ?? 0}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-xs text-primary">{meta.prenom ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-primary">{meta.niveau ?? '—'}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-right text-xs text-primary/60">
                      {dateFmt.format(new Date(row.created_at))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
