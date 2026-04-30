-- pgvector + embedding column on products + HNSW cosine index + similarity RPC.
-- Used by /api/products/[id]/similar (B2 phase — V2.3 IA reco).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- HNSW lazy build: works on partially filled column. Maintained on updates.
CREATE INDEX IF NOT EXISTS idx_products_embedding_hnsw
  ON public.products
  USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_products_by_embedding(
  p_query_embedding vector(1536),
  p_match_count integer DEFAULT 4,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  similarity real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    1 - (p.embedding <=> p_query_embedding) AS similarity
  FROM public.products p
  WHERE p.embedding IS NOT NULL
    AND p.is_active = true
    AND p.is_vendable = true
    AND p.slug IS NOT NULL
    AND p.image_url IS NOT NULL
    AND (p_exclude_id IS NULL OR p.id != p_exclude_id)
  ORDER BY p.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_products_by_embedding(vector, integer, uuid) TO anon, authenticated;

COMMENT ON COLUMN public.products.embedding IS
  'OpenAI text-embedding-3-small (1536 dim) — name + brand + category + first 200 chars description.';
COMMENT ON FUNCTION public.match_products_by_embedding IS
  'Top-N similar products by cosine similarity. Filters on is_active+is_vendable+slug+image_url.';
