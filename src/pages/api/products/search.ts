import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import type { Product } from '@/types/database';

export const prerender = false;

// GET /api/products/search?q=<query>&limit=<n>
//
// Lightweight FTS endpoint for the header autocomplete dropdown. Returns
// the top N matching displayable products with the shape the dropdown
// renders (name, slug, brand, image, price). Reuses the products.search_vector
// column + idx_products_displayable partial index — same plan as the
// catalogue search box.
//
// Cap: q must be ≥ 2 chars (avoids returning the catalogue), limit defaults
// to 6 and is capped at 12 (UX choice — bigger dropdowns feel slow).

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;
const MIN_QUERY_LENGTH = 2;

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get('q') ?? '').trim();
  const limitParam = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  if (q.length < MIN_QUERY_LENGTH) {
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { data, error } = await supabaseServer
    .from('products')
    .select('id,name,slug,brand,category,image_url,price_ttc,public_price_ttc')
    .eq('is_active', true)
    .eq('is_vendable', true)
    .not('slug', 'is', null)
    .not('image_url', 'is', null)
    .textSearch('search_vector', q, { config: 'french', type: 'websearch' })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Pricing-light: we do NOT call computeDisplayPrice here (would need to load
  // the coefficient map for every keystroke). Use the raw price_ttc /
  // public_price_ttc column with the same SENTINEL guard (>= 0.05). The full
  // pricing cascade kicks in on the product page when the user clicks through.
  const results = ((data ?? []) as Product[]).map((p) => {
    const ttc =
      Number(p.price_ttc) >= 0.05
        ? Number(p.price_ttc)
        : Number(p.public_price_ttc) >= 0.05
          ? Number(p.public_price_ttc)
          : null;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      category: p.category,
      imageUrl: p.image_url,
      priceTtc: ttc,
    };
  });

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
    },
  });
};
