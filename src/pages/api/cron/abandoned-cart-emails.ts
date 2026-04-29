import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { sendTransactionalEmail } from '@/lib/brevo';
import { logError } from '@/lib/logger';

export const prerender = false;

// POST /api/cron/abandoned-cart-emails
// Header: X-Cron-Secret: <CRON_SECRET>
//
// Triggered hourly by .github/workflows/abandoned-cart.yml. Selects
// cart_sessions where:
//   - last_activity_at between 1h and 25h ago (window: don't spam fresh
//     carts, don't email stale ones the customer already forgot about)
//   - customer_email IS NOT NULL (email capture happens separately —
//     today only logged-in customers populate this)
//   - recovered_at IS NULL (cart not yet converted to an order)
//   - abandoned_email_sent_at IS NULL (idempotent: never email twice)
//
// Sends a Brevo transactional template (id from BREVO_ABANDONED_CART_TEMPLATE_ID)
// with cart details, then writes abandoned_email_sent_at to gate future runs.
//
// Failure semantics:
//   - Brevo failure on a row → leave abandoned_email_sent_at NULL, log,
//     continue to the next row. The next cron run retries.
//   - Critical errors (DB unreachable, missing env) → 500 to alert.

const SCAN_LIMIT = 50;

interface CartSessionRow {
  cart_id: string;
  customer_email: string;
  line_items_count: number;
  total_ttc: number;
  currency: string;
  checkout_url: string | null;
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

  const templateIdRaw = import.meta.env.BREVO_ABANDONED_CART_TEMPLATE_ID;
  const templateId = templateIdRaw ? Number.parseInt(templateIdRaw, 10) : null;
  if (!templateId || !Number.isFinite(templateId)) {
    return json(500, { error: 'BREVO_ABANDONED_CART_TEMPLATE_ID missing or invalid' });
  }

  const senderEmail = import.meta.env.BREVO_SENDER_EMAIL ?? 'contact@ma-papeterie.fr';
  const senderName = import.meta.env.BREVO_SENDER_NAME ?? 'Ma Papeterie';

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseServer
    .from('cart_sessions')
    .select('cart_id, customer_email, line_items_count, total_ttc, currency, checkout_url')
    .lt('last_activity_at', oneHourAgo)
    .gt('last_activity_at', twentyFiveHoursAgo)
    .is('recovered_at', null)
    .is('abandoned_email_sent_at', null)
    .not('customer_email', 'is', null)
    .gt('line_items_count', 0)
    .limit(SCAN_LIMIT);

  if (error) {
    logError('cron/abandoned-cart', 'select failed', error);
    return json(500, { error: 'Internal error' });
  }

  const candidates = (data ?? []) as CartSessionRow[];
  let sent = 0;
  let failed = 0;

  for (const cart of candidates) {
    try {
      await sendTransactionalEmail({
        to: [{ email: cart.customer_email }],
        sender: { email: senderEmail, name: senderName },
        subject: 'Votre panier vous attend chez Ma Papeterie',
        htmlContent: '',
        templateId,
        params: {
          line_items_count: cart.line_items_count,
          total_ttc: cart.total_ttc,
          currency: cart.currency,
          checkout_url: cart.checkout_url ?? 'https://ma-papeterie.fr/',
        },
      });
      const { error: updateError } = await supabaseServer
        .from('cart_sessions')
        .update({ abandoned_email_sent_at: new Date().toISOString() })
        .eq('cart_id', cart.cart_id);
      if (updateError) {
        logError('cron/abandoned-cart', `update failed for ${cart.cart_id}`, updateError);
        failed += 1;
      } else {
        sent += 1;
      }
    } catch (err) {
      logError('cron/abandoned-cart', `Brevo send failed for ${cart.cart_id}`, err);
      failed += 1;
    }
  }

  return json(200, { scanned: candidates.length, sent, failed });
};
