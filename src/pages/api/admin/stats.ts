import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-api';
import { logError } from '@/lib/logger';

export const prerender = false;

// GET /api/admin/stats — KPIs for /admin dashboard. Bearer-auth + admin check.

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const DAY_MS = 24 * 60 * 60 * 1000;

export const GET: APIRoute = async ({ request }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  const now = Date.now();
  const since30d = new Date(now - 30 * DAY_MS).toISOString();
  const since60d = new Date(now - 60 * DAY_MS).toISOString();

  const queries = await Promise.allSettled([
    supabaseServer
      .from('b2b_quotes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabaseServer
      .from('cart_sessions')
      .select('cart_id', { count: 'exact', head: true })
      .lt('last_activity_at', new Date(now - 60 * 60 * 1000).toISOString())
      .gt('last_activity_at', new Date(now - 25 * 60 * 60 * 1000).toISOString())
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
    supabaseServer.from('shopify_orders').select('total_ttc').gte('shopify_created_at', since30d),
    supabaseServer.rpc('count_displayable_products'),
    supabaseServer
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_vendable', true)
      .not('shopify_variant_id', 'is', null),
    // Previous 30-day window (J-60 → J-30) — used to compute MoM revenue delta
    // on the dashboard. Same shape as queries[4].
    supabaseServer
      .from('shopify_orders')
      .select('total_ttc')
      .gte('shopify_created_at', since60d)
      .lt('shopify_created_at', since30d),
    // Distinct product_ids with an active back_in_stock waitlist subscriber.
    // Counted in JS because Supabase JS client doesn't expose DISTINCT directly.
    supabaseServer
      .from('notification_waitlist')
      .select('product_id')
      .eq('feature', 'back_in_stock')
      .not('product_id', 'is', null),
  ]);

  const stats = {
    devis_pending: 0,
    carts_abandoned_24h: 0,
    notify_stock_subscribers: 0,
    liste_scolaire_waitlist: 0,
    orders_30d: 0,
    total_orders_revenue_30d: 0,
    orders_prev_30d: 0,
    total_orders_revenue_prev_30d: 0,
    total_displayable_products: 0,
    synced_to_shopify: 0,
    out_of_stock_with_waitlist: 0,
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
  if (queries[7].status === 'fulfilled') {
    const rows = (queries[7].value.data ?? []) as Array<{ total_ttc: number | null }>;
    stats.orders_prev_30d = rows.length;
    stats.total_orders_revenue_prev_30d = rows.reduce((sum, r) => sum + (r.total_ttc ?? 0), 0);
  }
  if (queries[8].status === 'fulfilled') {
    const rows = (queries[8].value.data ?? []) as Array<{ product_id: string | null }>;
    const uniqueIds = [
      ...new Set(rows.map((r) => r.product_id).filter((id): id is string => !!id)),
    ];
    if (uniqueIds.length > 0) {
      const { count } = await supabaseServer
        .from('products')
        .select('id', { count: 'exact', head: true })
        .in('id', uniqueIds)
        .or('stock_quantity.is.null,stock_quantity.eq.0');
      stats.out_of_stock_with_waitlist = count ?? 0;
    }
  }

  for (const [i, q] of queries.entries()) {
    if (q.status === 'rejected') logError('admin/stats', `query ${i} rejected`, q.reason);
  }

  return json(200, stats);
};
