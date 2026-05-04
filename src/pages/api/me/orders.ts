import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import type { Database } from '@/types/database';

export const prerender = false;

// GET /api/me/orders
// Authorization: Bearer <supabase-access-token>
//
// The customer dashboard calls this to list their Shopify orders.
//
// Linking strategy (V2.3) :
//   1. Verify the bearer token (anon client call to Supabase Auth).
//   2. Look up an existing link in shopify_customer_links → if found,
//      query shopify_orders by shopify_customer_id (stable, survives
//      email changes on either side).
//   3. Fallback : query by customer_email. If we find rows that ALSO
//      carry a shopify_customer_id, auto-create the link in background
//      so subsequent calls hit the fast path. The first matching id wins
//      (a single Supabase user shouldn't be tied to multiple Shopify
//      customer records — the rare case of mixed checkouts under
//      different Shopify customers is left to manual ops cleanup).
//
// Customers who haven't placed an order yet get an empty list, not an error.

interface OrderRow {
  shopify_order_id: string;
  shopify_order_name: string;
  shopify_created_at: string;
  total_ttc: number;
  currency: string;
  financial_status: string | null;
  fulfillment_status: string | null;
  // Used by the auto-link path; not exposed to the client (still in the
  // response payload but the dashboard ignores it).
  shopify_customer_id: string | null;
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
  const userId = userData.user.id;
  const userEmail = userData.user.email;

  const ORDER_COLS =
    'shopify_order_id,shopify_order_name,shopify_created_at,total_ttc,currency,financial_status,fulfillment_status,shopify_customer_id';

  // 1. Fast path: check for an existing link.
  const linkRes = await supabaseServer
    .from('shopify_customer_links')
    .select('shopify_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  let orders: OrderRow[] = [];
  let queryError: { message: string } | null = null;

  if (linkRes.data?.shopify_customer_id) {
    const { data, error } = await supabaseServer
      .from('shopify_orders')
      .select(ORDER_COLS)
      .eq('shopify_customer_id', linkRes.data.shopify_customer_id)
      .order('shopify_created_at', { ascending: false })
      .limit(50);
    orders = (data ?? []) as OrderRow[];
    queryError = error;
  } else {
    // 2. Fallback: email match. Auto-link in background if a row carries a
    //    shopify_customer_id (sets up the fast path for next call).
    const { data, error } = await supabaseServer
      .from('shopify_orders')
      .select(ORDER_COLS)
      .eq('customer_email', userEmail)
      .order('shopify_created_at', { ascending: false })
      .limit(50);
    orders = (data ?? []) as OrderRow[];
    queryError = error;

    if (!error) {
      const firstWithCustomerId = orders.find((o) => o.shopify_customer_id);
      if (firstWithCustomerId?.shopify_customer_id) {
        // Fire-and-forget : a failure here doesn't break the response, the
        // next call will retry. ON CONFLICT DO NOTHING via upsert default
        // because user_id is the PK + shopify_customer_id has UNIQUE.
        void supabaseServer
          .from('shopify_customer_links')
          .upsert(
            {
              user_id: userId,
              shopify_customer_id: firstWithCustomerId.shopify_customer_id,
              link_method: 'auto_email_match',
            },
            { onConflict: 'user_id', ignoreDuplicates: true },
          )
          .then(({ error: linkErr }) => {
            if (linkErr) logError('me/orders', 'auto-link upsert failed', linkErr);
          });
      }
    }
  }

  if (queryError) {
    logError('me/orders', 'shopify_orders select failed', queryError);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ orders }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
