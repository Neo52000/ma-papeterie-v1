import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { ShopifyOrder } from '@/types/database';

interface OrderDetailProps {
  orderId: string;
}

interface LineItem {
  title: string;
  quantity: number;
  price: string | number;
}

interface ShippingAddress {
  address1?: string;
  city?: string;
  zip?: string;
  country?: string;
}

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLineItems(raw: unknown): LineItem[] {
  if (!Array.isArray(raw)) return [];
  const items: LineItem[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const title = typeof entry.title === 'string' ? entry.title : null;
    const quantity = typeof entry.quantity === 'number' ? entry.quantity : null;
    const price =
      typeof entry.price === 'string' || typeof entry.price === 'number' ? entry.price : null;
    if (title && quantity !== null && price !== null) {
      items.push({ title, quantity, price });
    }
  }
  return items;
}

function parseShippingAddress(raw: unknown): ShippingAddress | null {
  if (!isRecord(raw)) return null;
  const addr: ShippingAddress = {};
  if (typeof raw.address1 === 'string') addr.address1 = raw.address1;
  if (typeof raw.city === 'string') addr.city = raw.city;
  if (typeof raw.zip === 'string') addr.zip = raw.zip;
  if (typeof raw.country === 'string') addr.country = raw.country;
  return Object.keys(addr).length ? addr : null;
}

function lineTotal(price: string | number, quantity: number): number {
  const numeric = typeof price === 'string' ? Number.parseFloat(price) : price;
  if (!Number.isFinite(numeric)) return 0;
  return numeric * quantity;
}

function formatStatus(value: string | null): string {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

export default function OrderDetail({ orderId }: OrderDetailProps) {
  const [order, setOrder] = useState<ShopifyOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        window.location.href = `/connexion?next=/compte/commandes/${encodeURIComponent(orderId)}`;
        return;
      }

      try {
        const res = await fetch(`/api/me/orders/${encodeURIComponent(orderId)}`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        if (res.status === 404) {
          throw new Error('Commande introuvable.');
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as { order: ShopifyOrder };
        if (cancelled) return;
        setOrder(json.order);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return <p className="py-12 text-center text-sm text-primary/60">Chargement…</p>;
  }

  if (error || !order) {
    return (
      <div className="rounded-card bg-bg-soft p-6">
        <p className="text-sm text-accent">{error ?? 'Commande introuvable.'}</p>
        <a
          href="/compte"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-btn border border-primary/15 bg-white px-4 text-sm font-medium text-primary transition-colors hover:border-accent hover:text-accent"
        >
          Retour à mon compte
        </a>
      </div>
    );
  }

  const items = parseLineItems(order.line_items);
  const shipping = parseShippingAddress(order.shipping_address);

  return (
    <div className="space-y-8">
      <section className="rounded-card bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-category">Commande</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-primary">
              {order.shopify_order_name}
            </h2>
            <p className="mt-1 text-sm text-primary/60">
              {dateFmt.format(new Date(order.shopify_created_at))}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-btn bg-bg-soft px-3 py-1 text-xs font-medium text-primary">
              Paiement : {formatStatus(order.financial_status)}
            </span>
            <span className="inline-flex items-center rounded-btn bg-bg-soft px-3 py-1 text-xs font-medium text-primary">
              Expédition : {formatStatus(order.fulfillment_status)}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-card bg-white p-6 shadow-card">
        <h3 className="font-display text-lg font-semibold text-primary">Articles</h3>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-primary/60">Aucun article enregistré.</p>
        ) : (
          <ul className="mt-3 divide-y divide-primary/10">
            {items.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-primary">{item.title}</p>
                  <p className="text-xs text-primary/60">
                    Quantité : {item.quantity} · {eur.format(Number(item.price))}
                  </p>
                </div>
                <p className="font-semibold text-primary">
                  {eur.format(lineTotal(item.price, item.quantity))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-card bg-bg-soft p-6">
        <h3 className="font-display text-lg font-semibold text-primary">Récapitulatif</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-primary/60">Sous-total</dt>
            <dd className="text-primary">{eur.format(order.subtotal_ttc)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-primary/60">TVA</dt>
            <dd className="text-primary">{eur.format(order.total_tax)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-primary/60">Livraison</dt>
            <dd className="text-primary">{eur.format(order.total_shipping)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-primary/60">Remise</dt>
            <dd className="text-primary">−{eur.format(order.total_discount)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-primary/10 pt-2 text-base">
            <dt className="font-semibold text-primary">Total TTC</dt>
            <dd className="font-semibold text-primary">{eur.format(order.total_ttc)}</dd>
          </div>
        </dl>
      </section>

      {shipping ? (
        <section className="rounded-card bg-white p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold text-primary">Adresse de livraison</h3>
          <address className="mt-3 text-sm not-italic text-primary">
            {shipping.address1 ? <p>{shipping.address1}</p> : null}
            {shipping.zip || shipping.city ? (
              <p>
                {shipping.zip ? `${shipping.zip} ` : ''}
                {shipping.city ?? ''}
              </p>
            ) : null}
            {shipping.country ? <p>{shipping.country}</p> : null}
          </address>
        </section>
      ) : null}

      <div>
        <a
          href="/compte"
          className="inline-flex h-10 items-center justify-center rounded-btn border border-primary/15 bg-white px-4 text-sm font-medium text-primary transition-colors hover:border-accent hover:text-accent"
        >
          Retour à mes commandes
        </a>
      </div>
    </div>
  );
}
