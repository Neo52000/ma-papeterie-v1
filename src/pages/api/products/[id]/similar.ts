import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { ensureProductEmbedding } from '@/lib/embeddings';
import { logError } from '@/lib/logger';

export const prerender = false;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // Cache 1h CDN-side : embedding similarity bouge peu, OK de servir
      // depuis l'edge tant que l'embedding du produit source ne change pas.
      'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  });

interface SimilarProduct {
  id: string;
  name: string;
  slug: string | null;
  brand: string | null;
  category: string;
  image_url: string | null;
  price_ttc: number | null;
  price: number;
  similarity: number;
}

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return json(400, { error: 'Missing id' });

  const embedding = await ensureProductEmbedding(id);
  if (!embedding) {
    // OpenAI key missing or generation failed → 200 with empty list. The
    // caller renders 0 similar products, no error UI needed (graceful).
    return json(200, { items: [] as SimilarProduct[], reason: 'no_embedding' });
  }

  const { data: matchData, error: matchError } = await supabaseServer.rpc(
    'match_products_by_embedding',
    {
      p_query_embedding: embedding as unknown as string,
      p_match_count: 4,
      p_exclude_id: id,
    },
  );
  if (matchError) {
    logError('products/[id]/similar', 'RPC failed', matchError);
    return json(500, { error: matchError.message });
  }

  const matches = (matchData ?? []) as Array<{ id: string; similarity: number }>;
  if (matches.length === 0) return json(200, { items: [] as SimilarProduct[] });

  const ids = matches.map((m) => m.id);
  const { data: prodData, error: prodError } = await supabaseServer
    .from('products')
    .select('id, name, slug, brand, category, image_url, price_ttc, price')
    .in('id', ids);

  if (prodError) {
    logError('products/[id]/similar', 'product fetch failed', prodError);
    return json(500, { error: prodError.message });
  }

  // Preserve the similarity-sorted order returned by the RPC.
  const byId = new Map<string, (typeof prodData)[number]>();
  for (const p of prodData ?? []) byId.set(p.id, p);
  const items: SimilarProduct[] = matches
    .map((m) => {
      const p = byId.get(m.id);
      if (!p) return null;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand,
        category: p.category,
        image_url: p.image_url,
        price_ttc: p.price_ttc,
        price: p.price,
        similarity: m.similarity,
      };
    })
    .filter((x): x is SimilarProduct => x !== null);

  return json(200, { items });
};
