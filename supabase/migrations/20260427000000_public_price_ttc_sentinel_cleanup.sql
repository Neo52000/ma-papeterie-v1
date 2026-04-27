-- Cleanup `public_price_ttc` sentinels — mirror of `cost_price_no_sentinel`.
--
-- Suppliers (notably Comlandi) ship 0.00, 0.01, 0.02 in `public_price_ttc`
-- when the official PVP is unknown. The pricing cascade in
-- src/lib/pricing.ts and compute_display_price RPC already guard with
-- SENTINEL_THRESHOLD = 0.05, but 13 rows still surface in the catalogue
-- because their entire price hierarchy is sentinels (cost_price NULL,
-- public_price_ttc < 0.05, price_ttc = 0.02), falling through to
-- source = 'unknown' and displaying as 0,02 € — a vente-à-perte risk.
--
-- This migration:
--   1. NULLs the 647 rows with public_price_ttc < 0.05 (visible + non-visible)
--   2. Adds a CHECK constraint to prevent future re-introduction
--   3. Application-side, fetchCatalogue is updated to require at least one
--      valid price source (defence in depth, see queries.ts).

UPDATE products
   SET public_price_ttc = NULL
 WHERE public_price_ttc IS NOT NULL
   AND public_price_ttc < 0.05;

ALTER TABLE products
  ADD CONSTRAINT public_price_ttc_no_sentinel
  CHECK (public_price_ttc IS NULL OR public_price_ttc >= 0.05);
