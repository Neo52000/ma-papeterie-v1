import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-api';

export const prerender = false;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const PAGE_SIZE = 50;
const STOCK_MAX = 9999;

type SalesChannel = 'both' | 'online' | 'pos';

const SALES_CHANNELS: readonly SalesChannel[] = ['both', 'online', 'pos'];

export const GET: APIRoute = async ({ request, url }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  const params = url.searchParams;
  const search = (params.get('q') ?? '').trim();
  const channel = params.get('channel') ?? 'all';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabaseServer
    .from('products')
    .select(
      'id, name, slug, brand, category, image_url, stock_online, stock_boutique, sales_channel, shopify_variant_id, updated_at',
      { count: 'estimated' },
    )
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  if (search.length >= 2) {
    query = query.textSearch('search_vector', search, { config: 'french', type: 'websearch' });
  }
  if (channel === 'both' || channel === 'online' || channel === 'pos') {
    query = query.eq('sales_channel', channel);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) return json(500, { error: error.message });

  return json(200, {
    items: data ?? [],
    page,
    pageSize: PAGE_SIZE,
    total: count ?? 0,
    hasMore: (data ?? []).length === PAGE_SIZE,
  });
};

interface UpdateBody {
  id?: unknown;
  stock_boutique?: unknown;
  sales_channel?: unknown;
}

export const POST: APIRoute = async ({ request }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  if (typeof body.id !== 'string' || body.id.length === 0) {
    return json(400, { error: 'id_required' });
  }

  const update: { stock_boutique?: number; sales_channel?: SalesChannel } = {};

  if (body.stock_boutique !== undefined) {
    const value = Number(body.stock_boutique);
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > STOCK_MAX) {
      return json(400, { error: 'stock_boutique_invalid' });
    }
    update.stock_boutique = value;
  }

  if (body.sales_channel !== undefined) {
    if (
      typeof body.sales_channel !== 'string' ||
      !SALES_CHANNELS.includes(body.sales_channel as SalesChannel)
    ) {
      return json(400, { error: 'sales_channel_invalid' });
    }
    update.sales_channel = body.sales_channel as SalesChannel;
  }

  if (Object.keys(update).length === 0) {
    return json(400, { error: 'no_fields_to_update' });
  }

  const { data, error } = await supabaseServer
    .from('products')
    .update(update)
    .eq('id', body.id)
    .select('id, stock_online, stock_boutique, sales_channel')
    .single();

  if (error) return json(500, { error: error.message });
  if (!data) return json(404, { error: 'product_not_found' });

  return json(200, { product: data });
};
