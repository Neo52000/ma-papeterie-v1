import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

interface OrderRow {
  shopify_order_id: string;
  shopify_order_name: string;
  shopify_created_at: string;
  total_ttc: number;
  currency: string;
  financial_status: string | null;
  fulfillment_status: string | null;
}

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export default function AccountDashboard() {
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        window.location.href = '/connexion';
        return;
      }
      setEmail(data.session.user.email ?? null);
      const meta = (data.session.user.user_metadata ?? {}) as { display_name?: string };
      setDisplayName(meta.display_name ?? null);
      setLoading(false);

      try {
        const res = await fetch('/api/me/orders', {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as { orders: OrderRow[] };
        if (cancelled) return;
        setOrders(json.orders);
      } catch (err) {
        if (cancelled) return;
        setOrdersError(err instanceof Error ? err.message : String(err));
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-primary/60">Chargement…</p>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-card bg-bg-soft p-6">
        <h2 className="font-display text-lg font-semibold text-primary">Mon profil</h2>
        <dl className="mt-4 space-y-2 text-sm">
          {displayName ? (
            <div className="flex justify-between gap-4">
              <dt className="text-primary/60">Nom</dt>
              <dd className="text-primary">{displayName}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-primary/60">Email</dt>
            <dd className="text-primary">{email}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/compte/favoris"
            className="inline-flex h-10 items-center justify-center rounded-btn border border-primary/15 bg-white px-4 text-sm font-medium text-primary transition-colors hover:border-accent hover:text-accent"
          >
            Mes favoris
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 items-center justify-center rounded-btn border border-primary/15 bg-white px-4 text-sm font-medium text-primary transition-colors hover:bg-bg-soft"
          >
            Se déconnecter
          </button>
        </div>
      </section>

      <section className="rounded-card bg-white p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-primary">Mes commandes</h2>
        {ordersError ? (
          <p className="mt-3 text-sm text-accent">
            Impossible de charger vos commandes ({ordersError}). Réessayez plus tard.
          </p>
        ) : orders == null ? (
          <p className="mt-3 text-sm text-primary/60">Chargement des commandes…</p>
        ) : orders.length === 0 ? (
          <p className="mt-3 text-sm text-primary/70">
            Aucune commande pour l'instant.{' '}
            <a href="/catalogue" className="text-accent hover:text-accent-hover">
              Parcourir le catalogue
            </a>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-primary/10">
            {orders.map((order) => (
              <li key={order.shopify_order_id}>
                <a
                  href={`/compte/commandes/${encodeURIComponent(order.shopify_order_id)}`}
                  className="flex items-center justify-between gap-4 py-3 text-sm transition-colors hover:text-accent"
                >
                  <div>
                    <p className="font-medium text-primary">{order.shopify_order_name}</p>
                    <p className="text-xs text-primary/60">
                      {dateFmt.format(new Date(order.shopify_created_at))}
                      {order.financial_status ? ` · ${order.financial_status}` : null}
                      {order.fulfillment_status ? ` · ${order.fulfillment_status}` : null}
                    </p>
                  </div>
                  <p className="font-semibold text-primary">{eur.format(order.total_ttc)}</p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
