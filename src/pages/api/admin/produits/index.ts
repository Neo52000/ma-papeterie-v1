import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-api';

export const prerender = false;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ request, url }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  const params = url.searchParams;
  const search = (params.get('q') ?? '').trim();
  const syncStatus = params.get('sync') ?? 'all';
  const stockStatus = params.get('stock') ?? 'all';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10));
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseServer
    .from('products')
    .select(
      'id, name, slug, brand, category, image_url, price_ttc, price, stock_quantity, available_qty_total, shopify_variant_id, is_active, is_vendable, updated_at',
      { count: 'estimated' },
    )
    .eq('is_active', true)
    .eq('is_vendable', true)
    .order('updated_at', { ascending: false });

  if (search.length >= 2) {
    query = query.textSearch('search_vector', search, { config: 'french', type: 'websearch' });
  }
  if (syncStatus === 'synced') query = query.not('shopify_variant_id', 'is', null);
  else if (syncStatus === 'unsynced') query = query.is('shopify_variant_id', null);

  if (stockStatus === 'in_stock') query = query.gt('stock_quantity', 0);
  else if (stockStatus === 'out_of_stock')
    query = query.or('stock_quantity.is.null,stock_quantity.eq.0');

  const { data, error, count } = await query.range(from, to);
  if (error) return json(500, { error: error.message });

  return json(200, {
    items: data ?? [],
    page,
    pageSize,
    total: count ?? 0,
    hasMore: (data ?? []).length === pageSize,
  });
};
