import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { sendTransactionalEmail } from '@/lib/brevo';
import { logError } from '@/lib/logger';
import { computeDisplayPrice, fetchPricingCoefficients } from '@/lib/pricing';
import { formatPrice } from '@/lib/utils';

export const prerender = false;

// POST /api/cron/back-in-stock-emails
// Header: X-Cron-Secret: <CRON_SECRET>
//
// Triggered every 4h by .github/workflows/back-in-stock.yml. Selects
// notification_waitlist rows where:
//   - feature = 'back_in_stock'
//   - joined product is now in stock (stock_quantity > 0 OR available_qty_total > 0)
//
// We don't diff against history — Comlandi sync rewrites stock without
// emitting a transition event. Heuristic: every run fires for the current
// in-stock subscriptions, then deletes the row (one-shot semantics).
//
// Failure semantics:
//   - Brevo failure on a row → leave the row, log, continue. Next run retries.
//   - Critical errors (DB unreachable, missing env) → 500 to alert.

const SCAN_LIMIT = 100;

interface WaitlistRow {
  id: string;
  email: string;
  product_id: string;
  products: {
    id: string;
    name: string;
    slug: string | null;
    image_url: string | null;
    category: string;
    cost_price: number | null;
    manual_price_ht: number | null;
    price_ttc: number | null;
    public_price_ttc: number | null;
    stock_quantity: number | null;
    available_qty_total: number | null;
  } | null;
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  const secret = request.headers.get('x-cron-secret');
  const expected = import.meta.env.CRON_SECRET;
  if (!expected || !secret || secret !== expected) {
    return json(401, { error: 'Unauthorized' });
  }

  const templateIdRaw = import.meta.env.BREVO_BACK_IN_STOCK_TEMPLATE_ID;
  const templateId = templateIdRaw ? Number.parseInt(templateIdRaw, 10) : null;
  if (!templateId || !Number.isFinite(templateId)) {
    return json(500, { error: 'BREVO_BACK_IN_STOCK_TEMPLATE_ID missing or invalid' });
  }

  const senderEmail = import.meta.env.BREVO_SENDER_EMAIL ?? 'contact@ma-papeterie.fr';
  const senderName = import.meta.env.BREVO_SENDER_NAME ?? 'Ma Papeterie';
  const siteUrl = (import.meta.env.PUBLIC_SITE_URL ?? 'https://ma-papeterie.fr').replace(/\/$/, '');

  const { data, error } = await supabaseServer
    .from('notification_waitlist')
    .select(
      'id, email, product_id, products!inner(id, name, slug, image_url, category, cost_price, manual_price_ht, price_ttc, public_price_ttc, stock_quantity, available_qty_total)',
    )
    .eq('feature', 'back_in_stock')
    .not('product_id', 'is', null)
    .or('stock_quantity.gt.0,available_qty_total.gt.0', { referencedTable: 'products' })
    .limit(SCAN_LIMIT)
    .returns<WaitlistRow[]>();

  if (error) {
    logError('cron/back-in-stock', 'select failed', error);
    return json(500, { error: 'Internal error' });
  }

  const candidates = data ?? [];
  if (candidates.length === 0) {
    return json(200, { scanned: 0, sent: 0, failed: 0 });
  }

  const coefs = await fetchPricingCoefficients();
  let sent = 0;
  let failed = 0;

  for (const row of candidates) {
    const product = row.products;
    if (!product || !product.slug) {
      const { error: deleteError } = await supabaseServer
        .from('notification_waitlist')
        .delete()
        .eq('id', row.id);
      if (deleteError) {
        logError('cron/back-in-stock', `cleanup delete failed for ${row.id}`, deleteError);
      }
      continue;
    }

    const { ttc } = computeDisplayPrice(product, coefs);

    try {
      await sendTransactionalEmail({
        to: [{ email: row.email }],
        sender: { email: senderEmail, name: senderName },
        subject: `${product.name} est de retour en stock`,
        htmlContent: '',
        templateId,
        params: {
          product_name: product.name,
          product_url: `${siteUrl}/produit/${product.slug}`,
          product_image_url: product.image_url ?? `${siteUrl}/placeholder-product.svg`,
          product_price_ttc: formatPrice(ttc, { mode: 'TTC', vatRate: 0 }),
        },
      });
      const { error: deleteError } = await supabaseServer
        .from('notification_waitlist')
        .delete()
        .eq('id', row.id);
      if (deleteError) {
        logError('cron/back-in-stock', `delete failed for ${row.id}`, deleteError);
        failed += 1;
      } else {
        sent += 1;
      }
    } catch (err) {
      logError('cron/back-in-stock', `Brevo send failed for ${row.id}`, err);
      failed += 1;
    }
  }

  return json(200, { scanned: candidates.length, sent, failed });
};
