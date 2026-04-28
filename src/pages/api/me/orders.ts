import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import type { Database } from '@/types/database';

export const prerender = false;

// GET /api/me/orders
// Authorization: Bearer <supabase-access-token>
//
// The customer dashboard calls this to list their Shopify orders. We:
//   1. Verify the bearer token by hitting Supabase Auth with a per-request
//      anon client (the call returns the user iff the JWT is valid + active).
//   2. Query public.shopify_orders WHERE customer_email = user.email via the
//      service-role client (the table is RLS-locked to service-role only).
//
// Customers who haven't placed an order yet get an empty list, not an error.

interface OrderRow {
  shopify_order_name: string;
  shopify_created_at: string;
  total_ttc: number;
  currency: string;
  financial_status: string | null;
  fulfillment_status: string | null;
}

export const GET: APIRoute = async ({ request }) => {
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

  const { data, error } = await supabaseServer
    .from('shopify_orders')
    .select(
      'shopify_order_name,shopify_created_at,total_ttc,currency,financial_status,fulfillment_status',
    )
    .eq('customer_email', userData.user.email)
    .order('shopify_created_at', { ascending: false })
    .limit(50);

  if (error) {
    logError('me/orders', 'shopify_orders select failed', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ orders: (data ?? []) as OrderRow[] }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
