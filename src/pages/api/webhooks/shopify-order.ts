import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { supabaseServer } from '@/lib/supabase';
import { sendTransactionalEmail, escapeHtml } from '@/lib/brevo';
import { logError } from '@/lib/logger';

export const prerender = false;

// Shopify retries webhooks up to 19 times over 48h on non-2xx, so the
// endpoint MUST be idempotent (shopify_order_id UNIQUE) and respond fast.
// HMAC verification uses the raw request body — never trust the parsed JSON
// before signature check passes.

interface ShopifyAddress {
  first_name: string | null;
  last_name: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  zip: string | null;
  province: string | null;
  country: string | null;
  phone: string | null;
}

interface ShopifyLineItem {
  id: number;
  variant_id: number | null;
  product_id: number | null;
  title: string;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  price: string;
  total_discount: string;
}

interface ShopifyOrderPayload {
  id: number;
  order_number: number;
  name: string;
  email: string | null;
  phone: string | null;
  customer: {
    id: number | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  currency: string;
  subtotal_price: string;
  total_tax: string;
  total_shipping_price_set: { shop_money: { amount: string } } | null;
  total_discounts: string;
  total_price: string;
  line_items: ShopifyLineItem[];
  shipping_address: ShopifyAddress | null;
  billing_address: ShopifyAddress | null;
  created_at: string;
}

function verifyHmac(rawBody: string, headerHmac: string | null, secret: string): boolean {
  if (!headerHmac) return false;
  // Decode both sides from base64 BEFORE comparing — comparing the base64
  // strings byte-for-byte was a length-oracle (different padding lengths
  // failed the equal-length check before timingSafeEqual ran). Comparing
  // the raw 32-byte digests removes the leak entirely.
  let received: Buffer;
  try {
    received = Buffer.from(headerHmac, 'base64');
  } catch {
    return false;
  }
  const computed = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  if (computed.length !== received.length) return false;
  return crypto.timingSafeEqual(computed, received);
}

export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    // Misconfiguration is a server error, not a Shopify-retryable one.
    // Return 500 so Shopify retries — by the time it gives up, ops should have
    // noticed via the Brevo notification or the alerting on /api/health.
    return new Response('Server misconfigured: missing SHOPIFY_WEBHOOK_SECRET', { status: 500 });
  }

  const rawBody = await request.text();
  const headerHmac = request.headers.get('x-shopify-hmac-sha256');

  if (!verifyHmac(rawBody, headerHmac, secret)) {
    // 401 tells Shopify the request was rejected — they will NOT retry.
    return new Response('Invalid HMAC', { status: 401 });
  }

  let payload: ShopifyOrderPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Reject if the topic isn't an order — Shopify sends the same secret across
  // topics, this guard catches accidental wiring of the URL on a non-order event.
  const topic = request.headers.get('x-shopify-topic') ?? '';
  if (!topic.startsWith('orders/')) {
    return new Response(`Unsupported topic: ${topic}`, { status: 400 });
  }

  const customer = payload.customer ?? null;
  const customerEmail = payload.email ?? customer?.email ?? null;
  // V2.3 linking : on persiste le shopify customer.id (peut être null pour
  // les commandes guest sans compte Shopify). Stocké comme TEXT pour matcher
  // la colonne shopify_customer_links.shopify_customer_id (les ID Shopify
  // dépassent 2^31 selon la doc).
  const shopifyCustomerId = customer?.id != null ? String(customer.id) : null;

  const totalShipping = Number(payload.total_shipping_price_set?.shop_money.amount ?? 0);

  // Upsert by shopify_order_id (UNIQUE) so Shopify retries are idempotent.
  // We overwrite financial_status / fulfillment_status / raw_payload on each
  // event so the row reflects the latest state from Shopify.
  const { error } = await supabaseServer.from('shopify_orders').upsert(
    {
      shopify_order_id: String(payload.id),
      shopify_order_number: String(payload.order_number),
      shopify_order_name: payload.name,
      shopify_customer_id: shopifyCustomerId,
      customer_email: customerEmail,
      customer_first_name: customer?.first_name ?? null,
      customer_last_name: customer?.last_name ?? null,
      customer_phone: payload.phone ?? customer?.phone ?? null,
      financial_status: payload.financial_status,
      fulfillment_status: payload.fulfillment_status,
      currency: payload.currency,
      subtotal_ttc: Number(payload.subtotal_price),
      total_tax: Number(payload.total_tax),
      total_shipping: totalShipping,
      total_discount: Number(payload.total_discounts),
      total_ttc: Number(payload.total_price),
      line_items: payload.line_items,
      shipping_address: payload.shipping_address,
      billing_address: payload.billing_address,
      raw_payload: payload,
      shopify_created_at: payload.created_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'shopify_order_id' },
  );

  if (error) {
    logError('webhooks/shopify-order', 'shopify_orders upsert failed', error);
    // 500 → Shopify will retry (the upsert is idempotent on shopify_order_id).
    return new Response('Internal error', { status: 500 });
  }

  // Notify the boutique on orders/create or orders/paid only — skip noisy
  // updates (cancelled, refunded, etc.) which a future PR can route differently.
  if (topic === 'orders/create' || topic === 'orders/paid') {
    if (import.meta.env.BREVO_API_KEY) {
      try {
        const customerLabel =
          [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') ||
          customerEmail ||
          'Client inconnu';
        const itemsHtml = payload.line_items
          .map(
            (item) =>
              `<li>${item.quantity}× ${escapeHtml(item.title)}${item.variant_title ? ` (${escapeHtml(item.variant_title)})` : ''} — ${Number(item.price).toFixed(2)} €</li>`,
          )
          .join('');
        // Shopify order id is numeric, but escape defensively in case the
        // webhook payload schema ever loosens. payload.name is "#1042"-style
        // but Shopify lets merchants edit the prefix, so it's untrusted.
        const orderIdSafe = encodeURIComponent(String(payload.id));
        await sendTransactionalEmail({
          to: [{ email: 'reine.elie@gmail.com', name: 'Élie' }],
          sender: { email: 'noreply@ma-papeterie.fr', name: 'Ma Papeterie' },
          subject: `Nouvelle commande ${payload.name} — ${Number(payload.total_price).toFixed(2)} € (${payload.financial_status ?? 'pending'})`,
          htmlContent: `
            <p><strong>Nouvelle commande Shopify</strong></p>
            <ul>
              <li><strong>N° :</strong> ${escapeHtml(payload.name)}</li>
              <li><strong>Client :</strong> ${escapeHtml(customerLabel)}</li>
              <li><strong>Email :</strong> ${escapeHtml(customerEmail ?? 'non renseigné')}</li>
              <li><strong>Total TTC :</strong> ${Number(payload.total_price).toFixed(2)} ${escapeHtml(payload.currency)}</li>
              <li><strong>Statut paiement :</strong> ${escapeHtml(payload.financial_status ?? 'pending')}</li>
            </ul>
            <p><strong>Articles :</strong></p>
            <ul>${itemsHtml}</ul>
            <p>Voir dans Shopify Admin → <a href="https://admin.shopify.com/store/ma-papeterie52/orders/${orderIdSafe}">Commande ${escapeHtml(payload.name)}</a></p>
          `,
        });
      } catch (brevoErr) {
        // The order IS in the DB but the boutique was NOT notified — that's
        // operationally critical. Return 500 so Shopify retries the webhook
        // (the upsert is idempotent on shopify_order_id, no risk of dup),
        // which gives Brevo a second chance. The Shopify Admin "Recent
        // deliveries" tab will surface the failure with the full error body.
        return new Response(
          JSON.stringify({
            stored: true,
            brevo_error: brevoErr instanceof Error ? brevoErr.message : String(brevoErr),
          }),
          { status: 500, headers: { 'content-type': 'application/json' } },
        );
      }
    }
  }

  return new Response(JSON.stringify({ stored: true, topic }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
