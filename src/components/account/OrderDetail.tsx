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
  variantId?: string | null;
  productId?: string | null;
}

interface Address {
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  zip?: string;
  province?: string;
  country?: string;
  phone?: string;
}

interface Fulfillment {
  trackingNumber?: string;
  trackingUrl?: string;
  trackingCompany?: string;
}

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function parseLineItems(raw: unknown): LineItem[] {
  if (!Array.isArray(raw)) return [];
  const items: LineItem[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const title = asString(entry.title) ?? asString(entry.name);
    const quantity = typeof entry.quantity === 'number' ? entry.quantity : null;
    const price =
      typeof entry.price === 'string' || typeof entry.price === 'number' ? entry.price : null;
    if (title && quantity !== null && price !== null) {
      items.push({
        title,
        quantity,
        price,
        variantId: asString(entry.variant_id) ?? null,
        productId: asString(entry.product_id) ?? null,
      });
    }
  }
  return items;
}

function parseAddress(raw: unknown): Address | null {
  if (!isRecord(raw)) return null;
  const addr: Address = {};
  if (asString(raw.first_name) || asString(raw.last_name)) {
    addr.name = [asString(raw.first_name), asString(raw.last_name)].filter(Boolean).join(' ');
  } else if (asString(raw.name)) {
    addr.name = asString(raw.name);
  }
  addr.address1 = asString(raw.address1);
  addr.address2 = asString(raw.address2);
  addr.city = asString(raw.city);
  addr.zip = asString(raw.zip);
  addr.province = asString(raw.province) ?? asString(raw.province_code);
  addr.country = asString(raw.country) ?? asString(raw.country_code);
  addr.phone = asString(raw.phone);
  return Object.values(addr).some((v) => v) ? addr : null;
}

// Try to extract a tracking link from `raw_payload.fulfillments[]`. Shopify
// stores fulfillments only after the order has been packed/shipped, so this
// stays empty for "fulfillment_status: null" rows.
function parseFulfillments(raw: unknown): Fulfillment[] {
  if (!isRecord(raw)) return [];
  const list = raw.fulfillments;
  if (!Array.isArray(list)) return [];
  const out: Fulfillment[] = [];
  for (const f of list) {
    if (!isRecord(f)) continue;
    const trackingUrls = Array.isArray(f.tracking_urls) ? f.tracking_urls : [];
    out.push({
      trackingNumber: asString(f.tracking_number),
      trackingUrl: asString(f.tracking_url) ?? asString(trackingUrls[0]),
      trackingCompany: asString(f.tracking_company),
    });
  }
  return out;
}

function lineTotal(price: string | number, quantity: number): number {
  const numeric = typeof price === 'string' ? Number.parseFloat(price) : price;
  if (!Number.isFinite(numeric)) return 0;
  return numeric * quantity;
}

function formatStatus(value: string | null): string {
  if (!value) return '—';
  const map: Record<string, string> = {
    paid: 'Payé',
    pending: 'En attente',
    refunded: 'Remboursé',
    voided: 'Annulé',
    fulfilled: 'Expédié',
    partial: 'Partiel',
    unfulfilled: 'En préparation',
    null: 'En préparation',
  };
  return map[value] ?? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

function statusTone(value: string | null): string {
  if (value === 'paid' || value === 'fulfilled')
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (value === 'refunded' || value === 'voided')
    return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  return 'bg-bg-soft text-primary ring-1 ring-primary/10';
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
        if (res.status === 404) throw new Error('Commande introuvable.');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { order: ShopifyOrder };
        if (!cancelled) setOrder(json.order);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
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
    // Layout-matched skeleton — same shape as the real order page so the
    // shift-on-load is invisible. animate-pulse matches the SimilarProductsAI
    // loading pattern used elsewhere.
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Chargement de la commande">
        <section className="rounded-card bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded bg-primary/10" />
              <div className="h-7 w-40 animate-pulse rounded bg-primary/10" />
              <div className="h-3 w-56 animate-pulse rounded bg-primary/10" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-28 animate-pulse rounded-btn bg-primary/10" />
              <div className="h-6 w-32 animate-pulse rounded-btn bg-primary/10" />
            </div>
          </div>
        </section>
        <section className="rounded-card bg-white p-6 shadow-card">
          <div className="h-5 w-32 animate-pulse rounded bg-primary/10" />
          <ul className="mt-6 divide-y divide-primary/10">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center justify-between gap-4 py-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-primary/10" />
                  <div className="h-3 w-24 animate-pulse rounded bg-primary/10" />
                </div>
                <div className="h-4 w-16 animate-pulse rounded bg-primary/10" />
              </li>
            ))}
          </ul>
        </section>
        <section className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-card bg-white p-6 shadow-card">
              <div className="h-4 w-28 animate-pulse rounded bg-primary/10" />
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-primary/10" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-primary/10" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-primary/10" />
              </div>
            </div>
          ))}
        </section>
      </div>
    );
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
  const shipping = parseAddress(order.shipping_address);
  const billing = parseAddress(order.billing_address);
  const sameAddress =
    shipping &&
    billing &&
    shipping.address1 === billing.address1 &&
    shipping.zip === billing.zip &&
    shipping.city === billing.city;
  const fulfillments = parseFulfillments(order.raw_payload);
  const customerName =
    [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ').trim() || null;

  return (
    <div className="space-y-8">
      {/* En-tête : nom de la commande + badges + actions */}
      <section className="rounded-card bg-white p-6 shadow-card print:shadow-none print:ring-1 print:ring-primary/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-category">Commande</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-primary">
              {order.shopify_order_name}
            </h2>
            <p className="mt-1 text-sm text-primary/60">
              {dateFmt.format(new Date(order.shopify_created_at))}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center rounded-btn px-3 py-1 text-xs font-medium ${statusTone(order.financial_status)}`}
            >
              Paiement&nbsp;: {formatStatus(order.financial_status)}
            </span>
            <span
              className={`inline-flex items-center rounded-btn px-3 py-1 text-xs font-medium ${statusTone(order.fulfillment_status)}`}
            >
              Expédition&nbsp;: {formatStatus(order.fulfillment_status)}
            </span>
          </div>
        </div>
        {/* Action bar — masquée à l'impression */}
        <div className="mt-6 flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-2 rounded-btn border border-primary/15 bg-white px-3 text-xs font-medium text-primary hover:border-accent hover:text-accent"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </svg>
            Imprimer / Exporter PDF
          </button>
          <a
            href="/contact"
            className="inline-flex h-9 items-center gap-2 rounded-btn border border-primary/15 bg-white px-3 text-xs font-medium text-primary hover:border-accent hover:text-accent"
          >
            Une question ?
          </a>
        </div>
      </section>

      {/* Suivi colis (si fulfillments présents) */}
      {fulfillments.length > 0 ? (
        <section className="rounded-card bg-white p-6 shadow-card print:shadow-none print:ring-1 print:ring-primary/10">
          <h3 className="font-display text-lg font-semibold text-primary">Suivi de livraison</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {fulfillments.map((f, i) => (
              <li key={i} className="rounded-btn bg-bg-soft p-3">
                {f.trackingCompany ? (
                  <p className="font-medium text-primary">{f.trackingCompany}</p>
                ) : null}
                {f.trackingNumber ? (
                  <p className="mt-1 text-primary/80">N° suivi&nbsp;: {f.trackingNumber}</p>
                ) : null}
                {f.trackingUrl ? (
                  <a
                    href={f.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-primary underline hover:text-accent"
                  >
                    Suivre le colis →
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Articles */}
      <section className="rounded-card bg-white p-6 shadow-card print:shadow-none print:ring-1 print:ring-primary/10">
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
                    Quantité&nbsp;: {item.quantity} · {eur.format(Number(item.price))} l&apos;unité
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

      {/* Récapitulatif financier */}
      <section className="rounded-card bg-bg-soft p-6 print:bg-transparent print:ring-1 print:ring-primary/10">
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
          {order.total_discount > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-primary/60">Remise</dt>
              <dd className="text-primary">−{eur.format(order.total_discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-primary/10 pt-2 text-base">
            <dt className="font-semibold text-primary">Total TTC</dt>
            <dd className="font-semibold text-primary">{eur.format(order.total_ttc)}</dd>
          </div>
        </dl>
      </section>

      {/* Coordonnées client + adresses */}
      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-card bg-white p-6 shadow-card print:shadow-none print:ring-1 print:ring-primary/10">
          <h3 className="font-display text-base font-semibold text-primary">Coordonnées</h3>
          <dl className="mt-3 space-y-1 text-sm text-primary">
            {customerName ? (
              <div className="flex gap-2">
                <dt className="text-primary/60">Nom&nbsp;:</dt>
                <dd>{customerName}</dd>
              </div>
            ) : null}
            {order.customer_email ? (
              <div className="flex gap-2">
                <dt className="text-primary/60">Email&nbsp;:</dt>
                <dd>{order.customer_email}</dd>
              </div>
            ) : null}
            {order.customer_phone ? (
              <div className="flex gap-2">
                <dt className="text-primary/60">Téléphone&nbsp;:</dt>
                <dd>{order.customer_phone}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        {shipping ? (
          <div className="rounded-card bg-white p-6 shadow-card print:shadow-none print:ring-1 print:ring-primary/10">
            <h3 className="font-display text-base font-semibold text-primary">
              Adresse de livraison
            </h3>
            <address className="mt-3 text-sm not-italic text-primary">
              {shipping.name ? <p className="font-medium">{shipping.name}</p> : null}
              {shipping.address1 ? <p>{shipping.address1}</p> : null}
              {shipping.address2 ? <p>{shipping.address2}</p> : null}
              {shipping.zip || shipping.city ? (
                <p>
                  {shipping.zip ? `${shipping.zip} ` : ''}
                  {shipping.city ?? ''}
                </p>
              ) : null}
              {shipping.country ? <p>{shipping.country}</p> : null}
              {shipping.phone ? <p className="mt-1 text-primary/60">{shipping.phone}</p> : null}
            </address>
          </div>
        ) : null}

        {billing && !sameAddress ? (
          <div className="rounded-card bg-white p-6 shadow-card sm:col-span-2 print:shadow-none print:ring-1 print:ring-primary/10">
            <h3 className="font-display text-base font-semibold text-primary">
              Adresse de facturation
            </h3>
            <address className="mt-3 text-sm not-italic text-primary">
              {billing.name ? <p className="font-medium">{billing.name}</p> : null}
              {billing.address1 ? <p>{billing.address1}</p> : null}
              {billing.address2 ? <p>{billing.address2}</p> : null}
              {billing.zip || billing.city ? (
                <p>
                  {billing.zip ? `${billing.zip} ` : ''}
                  {billing.city ?? ''}
                </p>
              ) : null}
              {billing.country ? <p>{billing.country}</p> : null}
            </address>
          </div>
        ) : null}
      </section>

      <div className="print:hidden">
        <a
          href="/compte"
          className="inline-flex h-10 items-center justify-center rounded-btn border border-primary/15 bg-white px-4 text-sm font-medium text-primary transition-colors hover:border-accent hover:text-accent"
        >
          ← Retour à mes commandes
        </a>
      </div>
    </div>
  );
}
