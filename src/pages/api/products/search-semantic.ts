import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embeddings';
import { computeDisplayPrice, fetchPricingCoefficients } from '@/lib/pricing';
import { logError } from '@/lib/logger';

export const prerender = false;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=300, s-maxage=900',
    },
  });

// Hard cap on the query string before it hits OpenAI billing. The endpoint
// is unauthenticated, so without this an attacker could POST 10 KB strings
// in a loop and burn through the embedding token budget per call. 500 chars
// is comfortably above any real product-search intent.
const MAX_QUERY_LEN = 500;

interface SemanticItem {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  image_url: string;
  // displayTtc computed via the V1 pricing cascade (manual > cost*coef >
  // public_price_ttc > price_ttc) so the React card never has to know about
  // the sentinel/0,02 € bug.
  displayTtc: number;
  similarity: number;
}

export const GET: APIRoute = async ({ url }) => {
  const rawQuery = (url.searchParams.get('q') ?? '').trim();
  if (rawQuery.length < 3) return json(400, { error: 'Query trop courte (3+ chars).' });
  const query = rawQuery.slice(0, MAX_QUERY_LEN);

  const embedding = await generateEmbedding(query);
  if (!embedding) {
    return json(200, { items: [], reason: 'no_openai_key' });
  }

  const { data: matches, error: rpcError } = await supabaseServer.rpc('search_products_semantic', {
    p_query_embedding: embedding as unknown as string,
    p_match_count: 24,
  });
  if (rpcError) {
    logError('products/search-semantic', 'RPC failed', rpcError);
    return json(500, { error: rpcError.message });
  }

  const matchRows = (matches ?? []) as Array<{ id: string; similarity: number }>;
  if (matchRows.length === 0) return json(200, { items: [] });

  const ids = matchRows.map((m) => m.id);
  // Mirror the catalogue listing gates: deactivated / unvendable / slug-less
  // / image-less products must not surface from semantic search. Pricing
  // columns are required for the cascade below.
  const [{ data: products, error: prodError }, coefs] = await Promise.all([
    supabaseServer
      .from('products')
      .select(
        'id, name, slug, brand, category, image_url, price_ttc, public_price_ttc, manual_price_ht, cost_price',
      )
      .eq('is_active', true)
      .eq('is_vendable', true)
      .not('slug', 'is', null)
      .not('image_url', 'is', null)
      .in('id', ids),
    fetchPricingCoefficients(),
  ]);

  if (prodError) {
    logError('products/search-semantic', 'product fetch failed', prodError);
    return json(500, { error: prodError.message });
  }

  // Preserve the similarity-sorted order. Cap at 12 final items after
  // filtering — over-fetched 24 to absorb dropouts from the gates above.
  const byId = new Map<string, (typeof products)[number]>();
  for (const p of products ?? []) byId.set(p.id, p);
  const items: SemanticItem[] = [];
  for (const m of matchRows) {
    if (items.length >= 12) break;
    const p = byId.get(m.id);
    if (!p || !p.slug || !p.image_url) continue;
    const display = computeDisplayPrice(
      {
        category: p.category,
        cost_price: p.cost_price,
        manual_price_ht: p.manual_price_ht,
        price_ttc: p.price_ttc,
        public_price_ttc: p.public_price_ttc,
      },
      coefs,
    );
    if (display.ttc <= 0) continue;
    items.push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      image_url: p.image_url,
      displayTtc: display.ttc,
      similarity: m.similarity,
    });
  }

  return json(200, { items });
};
