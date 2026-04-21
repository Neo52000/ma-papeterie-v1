-- ============================================================================
-- products.search_vector : full-text search (French + simple EAN/codes)
-- ============================================================================
-- Contexte : Phase 2 recherche full-text sur le catalogue produits.
-- Projet Supabase : mgojmkzovqgpipybelrr
-- Appliqué en live-DB le 2026-04-21 (cf. plan `oui-async-eclipse.md`).
--
-- Ce fichier documente l'état applique. Pour rejouer sur une autre env :
--   1. Les sections 1-4 (DDL) sont idempotentes et peuvent tourner en
--      transaction.
--   2. La section 5 (populate) doit être exécutée par batches en live-DB
--      — le timeout HTTP du SQL Editor Supabase (~2 min) coupe le UPDATE
--      monolithique sur 141k+ lignes. Le pattern keyset est documenté
--      dans la section 5 ci-dessous.
--   3. La section 6 (CREATE INDEX CONCURRENTLY) ne peut PAS tourner dans
--      une transaction — exécuter en autocommit.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Colonne tsvector
-- ----------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- ----------------------------------------------------------------------------
-- 2. Fonction compute : source de vérité du vecteur de recherche
--
-- Poids :
--   A  name, icecat_title         — match principal
--   B  brand                      — marque
--   C  description                — texte long
--   D  ean, manufacturer_code,    — codes exacts (dictionnaire simple,
--      sku_interne                  pas de stemming/stopwords)
--
-- Dictionnaires :
--   french  pour le texte libre (stemming, stopwords FR)
--   simple  pour les codes alphanumériques (tokens bruts)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.products_search_vector_compute(
  p_name              text,
  p_brand             text,
  p_description       text,
  p_icecat_title      text,
  p_ean               text,
  p_manufacturer_code text,
  p_sku_interne       text
)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    setweight(to_tsvector('french', coalesce(p_name, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(p_icecat_title, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(p_brand, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(p_description, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(p_ean, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(p_manufacturer_code, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(p_sku_interne, '')), 'D');
$$;

-- ----------------------------------------------------------------------------
-- 3. Fonction trigger : maintient search_vector à jour
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.products_search_vector_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := public.products_search_vector_compute(
    NEW.name,
    NEW.brand,
    NEW.description,
    NEW.icecat_title,
    NEW.ean,
    NEW.manufacturer_code,
    NEW.sku_interne
  );
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Trigger BEFORE INSERT OR UPDATE
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_products_search_vector ON public.products;

CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE OF
    name, brand, description, icecat_title, ean, manufacturer_code, sku_interne
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_search_vector_trigger();

-- ----------------------------------------------------------------------------
-- 5. Populate (141 040 lignes)
--
-- ⚠️ À exécuter en batches en live-DB pour éviter le timeout HTTP du SQL
-- Editor. Le pattern keyset (voir ci-dessous) a été utilisé le 2026-04-21.
--
-- Pattern appliqué (répété 29 fois avec cursor avancé à chaque itération) :
--
--   WITH batch AS (
--     SELECT id FROM products
--     WHERE id > :last_id::uuid
--     ORDER BY id
--     LIMIT 5000
--   ),
--   updated AS (
--     UPDATE products p SET search_vector = products_search_vector_compute(
--       p.name, p.brand, p.description, p.icecat_title,
--       p.ean, p.manufacturer_code, p.sku_interne
--     )
--     FROM batch WHERE p.id = batch.id
--     RETURNING p.id
--   )
--   SELECT
--     (SELECT id FROM updated ORDER BY id DESC LIMIT 1) AS last_id,
--     (SELECT COUNT(*) FROM updated) AS processed;
--
-- Pour une ré-exécution idempotente (ex : après changement de la fonction
-- compute), utiliser ce UPDATE idempotent :
--
--   UPDATE products SET search_vector = products_search_vector_compute(
--     name, brand, description, icecat_title, ean, manufacturer_code, sku_interne
--   )
--   WHERE search_vector IS DISTINCT FROM products_search_vector_compute(
--     name, brand, description, icecat_title, ean, manufacturer_code, sku_interne
--   );
--
-- Vérification cohérence (doit retourner 0) :
--
--   SELECT COUNT(*) FROM products
--   WHERE search_vector IS DISTINCT FROM products_search_vector_compute(
--     name, brand, description, icecat_title, ean, manufacturer_code, sku_interne
--   );
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 6. Index GIN
-- ----------------------------------------------------------------------------
-- ⚠️ À exécuter hors transaction :
--
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS products_search_vector_idx
--     ON public.products USING GIN (search_vector);
--
-- Taille observée au 2026-04-21 : 24 MB sur 141 040 lignes.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 7. Statistiques
-- ----------------------------------------------------------------------------
ANALYZE public.products;

-- ============================================================================
-- Vérifications post-migration (à rejouer après apply)
-- ============================================================================
--
-- -- 1. Index valide et ready
-- SELECT i.relname, x.indisvalid, x.indisready
-- FROM pg_index x
-- JOIN pg_class i ON i.oid = x.indexrelid
-- JOIN pg_class t ON t.oid = x.indrelid
-- WHERE t.relname = 'products' AND i.relname = 'products_search_vector_idx';
--
-- -- 2. Aucune ligne divergente du compute
-- SELECT COUNT(*) FROM products
-- WHERE search_vector IS DISTINCT FROM products_search_vector_compute(
--   name, brand, description, icecat_title, ean, manufacturer_code, sku_interne
-- );
--
-- -- 3. EXPLAIN montre un Bitmap Index Scan
-- EXPLAIN ANALYZE
-- SELECT id, name FROM products, to_tsquery('french', 'cartouche & encre & HP') q
-- WHERE search_vector @@ q
-- ORDER BY ts_rank(search_vector, q) DESC
-- LIMIT 24;
--
-- ============================================================================
