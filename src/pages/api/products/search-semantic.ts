import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embeddings';
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
    p_match_count: 12,
  });
  if (rpcError) {
    logError('products/search-semantic', 'RPC failed', rpcError);
    return json(500, { error: rpcError.message });
  }

  const matchRows = (matches ?? []) as Array<{ id: string; similarity: number }>;
  if (matchRows.length === 0) return json(200, { items: [] });

  const ids = matchRows.map((m) => m.id);
  // FTS endpoints filter on these two columns to hide deactivated/non-vendable
  // products from public listings; semantic search must do the same or stale
  // embeddings can resurface dead products that have no Shopify variant.
  const { data: products, error: prodError } = await supabaseServer
    .from('products')
    .select('id, name, slug, brand, image_url, price_ttc, price')
    .eq('is_active', true)
    .eq('is_vendable', true)
    .in('id', ids);

  if (prodError) {
    logError('products/search-semantic', 'product fetch failed', prodError);
    return json(500, { error: prodError.message });
  }

  const byId = new Map<string, (typeof products)[number]>();
  for (const p of products ?? []) byId.set(p.id, p);
  const items = matchRows
    .map((m) => {
      const p = byId.get(m.id);
      if (!p) return null;
      return { ...p, similarity: m.similarity };
    })
    .filter((x) => x !== null);

  return json(200, { items });
};
