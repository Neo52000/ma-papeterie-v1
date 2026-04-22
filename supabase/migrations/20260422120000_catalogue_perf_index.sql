-- Catalogue public listing — perf fix (bug #1 Phase 2).
--
-- Before: default catalogue query (no search, no filter) did a seq scan over
-- 141k rows then a top-N heapsort, taking ~12s on a cold cache and hitting
-- Supabase's 8s statement_timeout in prod.
--
-- The predicate `is_active AND is_vendable AND slug IS NOT NULL` keeps ~15.8k
-- rows (~11% of the table). A partial composite index on the public-facing
-- subset, with sort keys aligned on the ORDER BY, lets Postgres stream rows
-- in order without a sort or a heap re-read for the LIMIT 24.
--
-- Also used by the home page (`sort: newest, inStockOnly: true`) — the leading
-- columns of the index match the default `pertinence` sort; the `inStockOnly`
-- filter still requires a recheck on the heap which is fine for 15.8k rows.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_public_listing
ON public.products (is_featured DESC NULLS LAST, created_at DESC)
WHERE is_active = true AND is_vendable = true AND slug IS NOT NULL;
