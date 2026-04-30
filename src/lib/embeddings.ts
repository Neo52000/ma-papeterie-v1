// OpenAI embedding helper for product similarity (Phase B2).
//
// Strategy:
//   - Just-in-time : when /api/products/[id]/similar is called, if the
//     source product has no embedding yet, compute and store it. Then run
//     similarity. Subsequent calls hit the cached vector.
//   - Backfill : scripts/backfill-embeddings.mjs walks rows in batches.
//
// Source text format = `name | brand | category | description[0..200]`.

import OpenAI from 'openai';
import { supabaseServer } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import type { Product } from '@/types/database';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

let cachedClient: OpenAI | null = null;
const getClient = (): OpenAI | null => {
  if (cachedClient) return cachedClient;
  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
};

export function buildEmbeddingSource(
  product: Pick<Product, 'name' | 'brand' | 'category' | 'description'>,
): string {
  const parts = [
    product.name,
    product.brand ?? '',
    product.category ?? '',
    (product.description ?? '').slice(0, 200),
  ];
  return parts.filter((p) => p.length > 0).join(' | ');
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const res = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIM,
    });
    return res.data[0]?.embedding ?? null;
  } catch (err) {
    logError('embeddings/generate', 'OpenAI call failed', err);
    return null;
  }
}

/**
 * Returns the cached embedding for a product, or computes + stores it on
 * first call. Returns `null` if OpenAI key missing or generation fails —
 * the caller should fall back to a non-IA path (e.g. category-based related).
 */
export async function ensureProductEmbedding(productId: string): Promise<number[] | null> {
  const { data, error } = await supabaseServer
    .from('products')
    .select('id, name, brand, category, description, embedding')
    .eq('id', productId)
    .maybeSingle();
  if (error || !data) return null;

  const existing = data.embedding as unknown as number[] | string | null;
  if (existing) {
    if (Array.isArray(existing)) return existing;
    if (typeof existing === 'string') {
      try {
        return JSON.parse(existing) as number[];
      } catch {
        // malformed cached vector — regenerate
      }
    }
  }

  const source = buildEmbeddingSource(data);
  const embedding = await generateEmbedding(source);
  if (!embedding) return null;

  const { error: updateError } = await supabaseServer
    .from('products')
    .update({
      // PostgREST serialise un array de number en `vector` automatiquement.
      embedding: embedding as unknown as string,
      embedding_updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  if (updateError) {
    logError('embeddings/cache', `update failed for ${productId}`, updateError);
  }

  return embedding;
}
