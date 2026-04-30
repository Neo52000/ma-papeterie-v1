import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import type { Database } from '@/types/database';

export const prerender = false;

// GET /api/admin/stats — KPIs for /admin dashboard. Bearer-auth + admin check.

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ request }) => {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return json(401, { error: 'Missing bearer token' });

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const authClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) return json(401, { error: 'Invalid token' });

  const isAdminRes = (await supabaseServer.rpc('is_admin', { p_user_id: userData.user.id })) as {
    data: boolean | null;
    error: { message: string } | null;
  };
  if (isAdminRes.error || !isAdminRes.data) return json(403, { error: 'Forbidden' });

  const queries = await Promise.allSettled([
    supabaseServer
      .from('b2b_quotes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabaseServer
      .from('cart_sessions')
      .select('cart_id', { count: 'exact', head: true })
      .lt('last_activity_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .gt('last_activity_at', new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString())
      .is('recovered_at', null)
      .not('customer_email', 'is', null),
    supabaseServer
      .from('notification_waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('feature', 'back_in_stock'),
    supabaseServer
      .from('notification_waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('feature', 'liste_scolaire'),
    supabaseServer
      .from('shopify_orders')
      .select('total_ttc')
      .gte('shopify_created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabaseServer.rpc('count_displayable_products'),
    supabaseServer
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_vendable', true)
      .not('shopify_variant_id', 'is', null),
  ]);

  const stats = {
    devis_pending: 0,
    carts_abandoned_24h: 0,
    notify_stock_subscribers: 0,
    liste_scolaire_waitlist: 0,
    orders_30d: 0,
    total_orders_revenue_30d: 0,
    total_displayable_products: 0,
    synced_to_shopify: 0,
  };

  if (queries[0].status === 'fulfilled') stats.devis_pending = queries[0].value.count ?? 0;
  if (queries[1].status === 'fulfilled') stats.carts_abandoned_24h = queries[1].value.count ?? 0;
  if (queries[2].status === 'fulfilled')
    stats.notify_stock_subscribers = queries[2].value.count ?? 0;
  if (queries[3].status === 'fulfilled')
    stats.liste_scolaire_waitlist = queries[3].value.count ?? 0;
  if (queries[4].status === 'fulfilled') {
    const rows = (queries[4].value.data ?? []) as Array<{ total_ttc: number | null }>;
    stats.orders_30d = rows.length;
    stats.total_orders_revenue_30d = rows.reduce((sum, r) => sum + (r.total_ttc ?? 0), 0);
  }
  if (queries[5].status === 'fulfilled') {
    const data = queries[5].value.data;
    stats.total_displayable_products = typeof data === 'number' ? data : Number(data ?? 0);
  }
  if (queries[6].status === 'fulfilled') stats.synced_to_shopify = queries[6].value.count ?? 0;

  for (const [i, q] of queries.entries()) {
    if (q.status === 'rejected') logError('admin/stats', `query ${i} rejected`, q.reason);
  }

  return json(200, stats);
};
