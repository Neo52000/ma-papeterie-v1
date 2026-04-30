-- B3 : RPC pour la recherche sémantique catalogue.
-- Cosine similarity sur l'embedding pre-calculé, mêmes filtres displayable
-- que fetchCatalogue. Appelé en fallback quand tsvector retourne 0 résultats.

CREATE OR REPLACE FUNCTION public.search_products_semantic(
  p_query_embedding vector(1536),
  p_match_count integer DEFAULT 12
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
  ORDER BY p.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

GRANT EXECUTE ON FUNCTION public.search_products_semantic(vector, integer) TO anon, authenticated;

COMMENT ON FUNCTION public.search_products_semantic IS
  'Catalogue search by cosine similarity. Fallback when tsvector returns 0 results.';
