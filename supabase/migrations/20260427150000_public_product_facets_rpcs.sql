-- RPCs pour les facettes catégories + marques du catalogue public.
--
-- Appelées par fetchDistinctCategoryNames() / fetchDistinctBrands() dans
-- src/lib/queries.ts (consumers : src/pages/catalogue/index.astro et
-- src/pages/catalogue/[category].astro). Avant cette migration, les calls
-- échouaient silencieusement (PGRST202 — function does not exist) avec
-- .catch(() => []) côté TS, donc les 2 pages catalogue ne montraient
-- AUCUN filtre catégorie ni marque.
--
-- Volume : 304 catégories distinctes + 401 marques distinctes sur le
-- catalogue visible (snapshot 2026-04-27, 11 587 produits).
--
-- Single source of truth : les 2 RPCs partagent la même WHERE clause que
-- l'index partial idx_products_displayable et le RPC count_displayable_products.

CREATE OR REPLACE FUNCTION public.get_public_product_categories()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT array_agg(DISTINCT category ORDER BY category)
  FROM products
  WHERE is_active = true
    AND is_vendable = true
    AND slug IS NOT NULL
    AND image_url IS NOT NULL
    AND category IS NOT NULL
    AND category <> '';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_product_categories() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_public_product_categories() IS
  'Returns the sorted distinct list of categories present on the public catalogue (same WHERE clause as idx_products_displayable). Used by /catalogue and /catalogue/[category] for facet rendering.';

CREATE OR REPLACE FUNCTION public.get_public_product_brands()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT array_agg(DISTINCT brand ORDER BY brand)
  FROM products
  WHERE is_active = true
    AND is_vendable = true
    AND slug IS NOT NULL
    AND image_url IS NOT NULL
    AND brand IS NOT NULL
    AND brand <> '';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_product_brands() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_public_product_brands() IS
  'Returns the sorted distinct list of brands present on the public catalogue (same WHERE clause as idx_products_displayable). Used by /catalogue and /catalogue/[category] for facet rendering.';
