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

  const days = Math.min(
    365,
    Math.max(1, Number.parseInt(url.searchParams.get('days') ?? '30', 10)),
  );
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseServer
    .from('shopify_orders')
    .select(
      'id, shopify_order_id, shopify_order_name, shopify_created_at, customer_email, customer_first_name, customer_last_name, total_ttc, currency, financial_status, fulfillment_status, line_items',
    )
    .gte('shopify_created_at', since)
    .order('shopify_created_at', { ascending: false })
    .limit(500);

  if (error) return json(500, { error: error.message });
  return json(200, { items: data ?? [] });
};
