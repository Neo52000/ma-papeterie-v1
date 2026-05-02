import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { ensureProductEmbedding } from '@/lib/embeddings';
import { computeDisplayPrice, fetchPricingCoefficients } from '@/lib/pricing';
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
  slug: string;
  brand: string | null;
  category: string | null;
  image_url: string;
  // displayTtc is the SINGLE source of truth for the price shown to the
  // shopper. Computed server-side via the V1 pricing cascade so the React
  // card never has to know about manual_ht/cost/coef/sentinel rules.
  displayTtc: number;
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
      p_match_count: 8,
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
  // Same gating as fetchRelatedProducts + the catalogue: hide deactivated /
  // unvendable / slug-less / image-less products. Stale embeddings can keep
  // pointing to dead products even after they're hidden everywhere else.
  // Pricing columns are needed by computeDisplayPrice below — without them
  // the cards used to fall back to `price_ttc ?? price ?? 0`, which surfaces
  // the documented 0,02 € sentinel bug on supplier-corrupted rows.
  const [{ data: prodData, error: prodError }, coefs] = await Promise.all([
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
    logError('products/[id]/similar', 'product fetch failed', prodError);
    return json(500, { error: prodError.message });
  }

  // Preserve the similarity-sorted order returned by the RPC. Cap at 4 after
  // filtering — over-fetched 8 to compensate for rows dropped by the gates.
  const byId = new Map<string, (typeof prodData)[number]>();
  for (const p of prodData ?? []) byId.set(p.id, p);
  const items: SimilarProduct[] = [];
  for (const m of matches) {
    if (items.length >= 4) break;
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
      category: p.category,
      image_url: p.image_url,
      displayTtc: display.ttc,
      similarity: m.similarity,
    });
  }

  return json(200, { items });
};
