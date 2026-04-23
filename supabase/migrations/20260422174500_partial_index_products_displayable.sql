-- Partial index optimisé pour le listing catalogue displayable.
-- Couvre exactement la WHERE clause de fetchCatalogue (sans filtre utilisateur).
-- Bénéfices :
--   - Index Scan direct au lieu de Filter après scan général (-22% exec time)
--   - reltuples sur l'index reflète le vrai count displayable après ANALYZE
--     → utilisé par la RPC count_displayable_products (migration suivante)
-- Cost observé après création : 14.01 (vs 105 sur l'index général précédent).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_displayable
ON products (is_featured DESC NULLS LAST, created_at DESC)
WHERE is_active = true
  AND is_vendable = true
  AND slug IS NOT NULL
  AND image_url IS NOT NULL;

-- ANALYZE pour peupler reltuples sur le nouveau partial index
-- (requis pour count_displayable_products qui lit reltuples).
ANALYZE products;
