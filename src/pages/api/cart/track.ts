import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';

export const prerender = false;

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
      cart_id: cartId,
      line_items_count: body.lineItemsCount ?? 0,
      total_ttc: body.totalTtc ?? 0,
      currency: body.currency ?? 'EUR',
      checkout_url: body.checkoutUrl ?? null,
      customer_email: body.customerEmail ?? null,
      last_activity_at: new Date().toISOString(),
    },
    { onConflict: 'cart_id' },
  );

  if (error) {
    return new Response(`DB error: ${error.message}`, { status: 500 });
  }

  return new Response(null, { status: 204 });
};
