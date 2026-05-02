import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import type { Database, ShopifyOrder } from '@/types/database';

export const prerender = false;

// GET /api/me/orders/:id
// Authorization: Bearer <supabase-access-token>
//
// Returns ONE order owned by the current user, looked up by shopify_order_id.
// We return 404 for both unknown id and id-belongs-to-someone-else to avoid
// leaking the existence of other customers' orders.

export const GET: APIRoute = async ({ request, params }) => {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing bearer token' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const authClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user || !userData.user.email) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Explicit projection — no .select('*'). Any future PII column added
  // to shopify_orders (internal notes, supplier-side metadata, etc.)
  // should be opted in here deliberately, not leaked to the client by
  // default.
  const { data, error } = await supabaseServer
    .from('shopify_orders')
    .select(
      'id, shopify_order_id, shopify_order_name, shopify_created_at, customer_email, customer_first_name, customer_last_name, customer_phone, financial_status, fulfillment_status, currency, subtotal_ttc, total_tax, total_shipping, total_discount, total_ttc, line_items, shipping_address, billing_address, raw_payload',
    )
    .eq('shopify_order_id', id)
    .eq('customer_email', userData.user.email)
    .maybeSingle();

  if (error) {
    logError('me/orders/[id]', 'shopify_orders select failed', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!data) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ order: data as ShopifyOrder }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
