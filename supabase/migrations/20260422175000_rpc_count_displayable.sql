-- RPC pour count rapide et précis du catalogue displayable
-- Utilise reltuples du partial index idx_products_displayable (stats post-ANALYZE)
-- Fallback sur COUNT(*) exact si l'index n'existe pas ou stats suspectes

CREATE OR REPLACE FUNCTION public.count_displayable_products()
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  index_count bigint;
  fallback_count bigint;
BEGIN
  -- Lecture reltuples du partial index (fast, <1ms)
  SELECT reltuples::bigint INTO index_count
  FROM pg_class
  WHERE relname = 'idx_products_displayable'
    AND relkind = 'i';

  -- Fallback si index absent ou reltuples suspect (négatif ou 0 alors qu'il devrait y avoir du data)
  IF index_count IS NULL OR index_count <= 0 THEN
    SELECT COUNT(*) INTO fallback_count
    FROM products
    WHERE is_active = true
      AND is_vendable = true
      AND slug IS NOT NULL
      AND image_url IS NOT NULL;
    RETURN fallback_count;
  END IF;

  RETURN index_count;
END;
$$;

-- Permettre à anon et authenticated d'appeler la RPC (lecture publique)
GRANT EXECUTE ON FUNCTION public.count_displayable_products() TO anon, authenticated;

-- Commentaire pour la suite
COMMENT ON FUNCTION public.count_displayable_products() IS
  'Returns estimated count of displayable products (partial index reltuples).
   Fast (<1ms). Precision depends on last ANALYZE on products table.
   Use for unfiltered catalogue home. For filtered listings, use count: estimated.';
