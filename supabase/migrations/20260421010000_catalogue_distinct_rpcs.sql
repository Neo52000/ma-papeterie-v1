-- ============================================================================
-- Catalogue filter RPCs: distinct categories + brands (public subset)
-- ============================================================================
-- Contexte : Phase 2 — barre de filtres du catalogue (F2).
-- Remplace un scan PostgREST côté app (limit 5000) par un DISTINCT en base,
-- ce qui garantit l'exhaustivité sur la table products (141k+ lignes) tout
-- en restant cheap grâce aux buckets de cardinalité (~500 catégories,
-- ~450 marques).
--
-- Sécurité : `SECURITY INVOKER` + schéma public explicite — pas de bypass
-- RLS nécessaire, les filtres `is_active`/`is_vendable` sont identiques
-- à ceux appliqués par src/lib/queries.ts.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_product_categories()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT category
  FROM public.products
  WHERE is_active = true
    AND is_vendable = true
    AND category IS NOT NULL
  ORDER BY category;
$$;

CREATE OR REPLACE FUNCTION public.get_public_product_brands()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT brand
  FROM public.products
  WHERE is_active = true
    AND is_vendable = true
    AND brand IS NOT NULL
  ORDER BY brand;
$$;

-- PostgREST exposition — anon + service_role peuvent appeler les RPCs.
GRANT EXECUTE ON FUNCTION public.get_public_product_categories() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_product_brands() TO anon, authenticated, service_role;
