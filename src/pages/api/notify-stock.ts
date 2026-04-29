import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { logError } from '@/lib/logger';

export const prerender = false;

// POST /api/notify-stock
// Body : JSON { email, productId }
// Response: 200 ok, 400 invalid, 500 internal.
//
// Subscribes an email to a back-in-stock notification for a specific product.
// The cron job that detects stock transitions (TODO V2.3) will email subscribers.
// For now, the rows accumulate; manual export from Supabase Studio possible.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const POST: APIRoute = async ({ request }) => {
  let payload: { email?: string; productId?: string; website?: string };
  try {
    payload = (await request.json()) as { email?: string; productId?: string; website?: string };
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  // Honeypot — bots fill every field including hidden ones.
  if (payload.website && payload.website.trim().length > 0) {
    return json(200, { ok: true });
  }

  const email = payload.email?.trim().toLowerCase() ?? '';
  const productId = payload.productId?.trim() ?? '';

  if (!EMAIL_REGEX.test(email)) {
    return json(400, { error: 'Email invalide' });
  }
  if (!UUID_REGEX.test(productId)) {
    return json(400, { error: 'Produit invalide' });
  }

  // Plain insert — the unique index uses COALESCE(product_id, sentinel)
  // which PostgREST upsert can't target by column list. We catch the
  // 23505 (unique_violation) and treat it as idempotent success.
  const { error } = await supabaseServer.from('notification_waitlist').insert({
    email,
    feature: 'back_in_stock',
    product_id: productId,
    metadata: {},
  });

  if (error && error.code !== '23505') {
    logError('notify-stock', 'insert failed', error);
    return json(500, { error: 'Erreur interne' });
  }

  return json(200, { ok: true });
};
