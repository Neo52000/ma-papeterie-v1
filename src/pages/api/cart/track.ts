import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { logError } from '@/lib/logger';

export const prerender = false;

const MAX_BODY_SIZE = 10_000;
const MAX_FIELD_LEN = 500;

// POST /api/cart/track
// Body: { cartId: string, lineItemsCount: number, totalTtc: number,
//         currency?: string, checkoutUrl?: string, customerEmail?: string }
//
// Called by the cart store after each successful Shopify mutation
// (cartCreate / cartLinesAdd / cartLinesUpdate). Upserts a row in
// public.cart_sessions so we have a server-side trace of carts created
// from the V1 site (used for analytics + future abandoned-cart workflow).
//
// Fire-and-forget from the client: the store does not await the response,
// any failure here must NOT block the cart UX. Returns 204 on success.

interface TrackBody {
  cartId?: string;
  lineItemsCount?: number;
  totalTtc?: number;
  currency?: string;
  checkoutUrl?: string;
  customerEmail?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_SIZE) {
    return new Response('Payload too large', { status: 413 });
  }

  let body: TrackBody;
  try {
    body = (await request.json()) as TrackBody;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const cartId = body.cartId;
  if (!cartId || typeof cartId !== 'string') {
    return new Response('cartId required', { status: 400 });
  }

  const { error } = await supabaseServer.from('cart_sessions').upsert(
    {
      cart_id: cartId.slice(0, MAX_FIELD_LEN),
      line_items_count: body.lineItemsCount ?? 0,
      total_ttc: body.totalTtc ?? 0,
      currency: (body.currency ?? 'EUR').slice(0, 8),
      checkout_url: body.checkoutUrl ? body.checkoutUrl.slice(0, MAX_FIELD_LEN) : null,
      customer_email: body.customerEmail ? body.customerEmail.slice(0, MAX_FIELD_LEN) : null,
      last_activity_at: new Date().toISOString(),
    },
    { onConflict: 'cart_id' },
  );

  if (error) {
    logError('cart/track', 'cart_sessions upsert failed', error);
    return new Response('Internal error', { status: 500 });
  }

  return new Response(null, { status: 204 });
};
