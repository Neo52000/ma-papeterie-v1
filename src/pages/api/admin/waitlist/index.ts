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

  const feature = url.searchParams.get('feature') ?? 'liste_scolaire';

  const baseSelect = supabaseServer
    .from('notification_waitlist')
    .select('id, created_at, email, feature, product_id, metadata')
    .eq('feature', feature)
    .order('created_at', { ascending: false })
    .limit(500);

  const { data, error } = await baseSelect;
  if (error) return json(500, { error: error.message });

  // For back_in_stock, enrich with product name/slug for the admin UI.
  let products: Record<string, { name: string; slug: string | null; stock: number }> = {};
  if (feature === 'back_in_stock' && data && data.length > 0) {
    const ids = Array.from(new Set(data.map((r) => r.product_id).filter((x): x is string => !!x)));
    if (ids.length > 0) {
      const { data: prodData } = await supabaseServer
        .from('products')
        .select('id, name, slug, stock_quantity, available_qty_total')
        .in('id', ids);
      for (const p of prodData ?? []) {
        products[p.id] = {
          name: p.name,
          slug: p.slug,
          stock: Math.max(p.stock_quantity ?? 0, p.available_qty_total ?? 0),
        };
      }
    }
  }

  return json(200, { items: data ?? [], products });
};
