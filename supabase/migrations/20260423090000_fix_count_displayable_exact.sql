-- Fix count_displayable_products : utilise COUNT(*) exact au lieu de reltuples.
-- L'index partial idx_products_displayable couvre exactement cette WHERE clause,
-- donc PostgreSQL fait un Index Only Scan (~5ms) et non un seq scan.
--
-- Raison du changement (bug trouvé en preview PR #8) :
--   - reltuples post-ANALYZE = 11655, count réel = 11602 (écart de 53).
--   - Cet écart provoquait des HTTP 416 sur les 2 dernières pages même après
--     clamp correct côté applicatif.
--   - De plus, la data query utilisait count:'estimated' dont l'estimate
--     PostgREST (~2440, issu du planner) causait des 416 dès la page ~102
--     (2440/24). Corrigé côté TS : count:'exact' pour le listing non filtré.

CREATE OR REPLACE FUNCTION public.count_displayable_products()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM products
  WHERE is_active = true
    AND is_vendable = true
    AND slug IS NOT NULL
    AND image_url IS NOT NULL;
$$;

COMMENT ON FUNCTION public.count_displayable_products() IS
  'Returns exact count of displayable products via Index Only Scan on
   idx_products_displayable (~5ms). Replaces the reltuples approach which
   over-estimated and caused HTTP 416 on last pages despite correct clamp.';
