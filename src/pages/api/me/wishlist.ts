import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { logError } from '@/lib/logger';
import type { Database } from '@/types/database';

export const prerender = false;

// GET    /api/me/wishlist            → list saved product ids for the user
// POST   /api/me/wishlist {productId} → add to wishlist (idempotent via UNIQUE)
// DELETE /api/me/wishlist {productId} → remove from wishlist
//
// All routes auth-gated via Bearer token. Reads/writes go through the user-
// scoped client so RLS enforces ownership — service-role bypass is unsafe
// (would let any caller mutate any user's list).

interface WishlistRow {
  product_id: string;
  created_at: string;
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const userClient = (token: string) => {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
};

const getToken = (request: Request): string | null => {
  const auth = request.headers.get('authorization') ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
};

export const GET: APIRoute = async ({ request }) => {
  const token = getToken(request);
  if (!token) return json(401, { error: 'Missing bearer token' });

  const client = userClient(token);
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return json(401, { error: 'Invalid token' });

  // Belt-and-braces: explicit user_id filter on top of the RLS SELECT
  // policy. If the RLS policy is ever accidentally relaxed or disabled,
  // this WHERE keeps the query scoped to the caller's own rows. Mirrors
  // the DELETE path below.
  const { data, error } = await client
    .from('wishlists')
    .select('product_id, created_at')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });
  if (error) {
    logError('me/wishlist GET', 'select failed', error);
    return json(500, { error: 'Internal error' });
  }
  return json(200, { items: (data ?? []) as WishlistRow[] });
};

export const POST: APIRoute = async ({ request }) => {
  const token = getToken(request);
  if (!token) return json(401, { error: 'Missing bearer token' });

  let body: { productId?: string };
  try {
    body = (await request.json()) as { productId?: string };
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  const productId = body.productId?.trim();
  if (!productId) return json(400, { error: 'productId required' });

  const client = userClient(token);
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return json(401, { error: 'Invalid token' });

  // The UNIQUE (user_id, product_id) constraint makes this idempotent. We
  // upsert with onConflict ignore so duplicate POSTs return 200 without error.
  const { error } = await client
    .from('wishlists')
    .upsert(
      { user_id: userData.user.id, product_id: productId },
      { onConflict: 'user_id,product_id', ignoreDuplicates: true },
    );
  if (error) {
    logError('me/wishlist POST', 'insert failed', error);
    return json(500, { error: 'Internal error' });
  }
  return json(200, { ok: true });
};

export const DELETE: APIRoute = async ({ request }) => {
  const token = getToken(request);
  if (!token) return json(401, { error: 'Missing bearer token' });

  let body: { productId?: string };
  try {
    body = (await request.json()) as { productId?: string };
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  const productId = body.productId?.trim();
  if (!productId) return json(400, { error: 'productId required' });

  const client = userClient(token);
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return json(401, { error: 'Invalid token' });

  const { error } = await client
    .from('wishlists')
    .delete()
    .eq('user_id', userData.user.id)
    .eq('product_id', productId);
  if (error) {
    logError('me/wishlist DELETE', 'delete failed', error);
    return json(500, { error: 'Internal error' });
  }
  return json(200, { ok: true });
};
