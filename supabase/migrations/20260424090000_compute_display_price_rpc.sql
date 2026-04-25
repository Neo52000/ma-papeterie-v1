-- Single source of truth for display price computation.
-- Mirrors src/lib/pricing.ts (PR #3): manual_price_ht > cost_price×coef > public_price_ttc > price_ttc.
-- SENTINEL_THRESHOLD 0.05 excludes supplier sentinel values (0.02 €).

CREATE OR REPLACE FUNCTION public.compute_display_price(p_product_id uuid)
RETURNS TABLE (
  display_price_ttc numeric,
  display_price_ht numeric,
  compare_at_ttc numeric,
  source text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  prod RECORD;
  coef numeric;
  vat_mult numeric;
  VAT_RATE_DEFAULT constant numeric := 20;
  MARGIN_FLOOR_COEF constant numeric := 1.32;
  FALLBACK_COEF constant numeric := 1.70;
  SENTINEL_THRESHOLD constant numeric := 0.05;
BEGIN
  SELECT p.cost_price, p.price_ttc, p.public_price_ttc,
         p.manual_price_ht, p.tva_rate, p.category
  INTO prod FROM products p WHERE p.id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  vat_mult := 1 + COALESCE(prod.tva_rate, VAT_RATE_DEFAULT) / 100.0;

  IF prod.manual_price_ht IS NOT NULL AND prod.manual_price_ht >= SENTINEL_THRESHOLD THEN
    display_price_ht := prod.manual_price_ht;
    display_price_ttc := prod.manual_price_ht * vat_mult;
    source := 'manual';
  ELSIF prod.cost_price IS NOT NULL AND prod.cost_price >= SENTINEL_THRESHOLD THEN
    SELECT c.coefficient INTO coef
    FROM pricing_category_coefficients c
    WHERE c.category = prod.category LIMIT 1;
    coef := GREATEST(COALESCE(coef, FALLBACK_COEF), MARGIN_FLOOR_COEF);
    display_price_ttc := prod.cost_price * coef;
    display_price_ht := display_price_ttc / vat_mult;
    source := 'coefficient';
  ELSIF prod.public_price_ttc IS NOT NULL AND prod.public_price_ttc >= SENTINEL_THRESHOLD THEN
    display_price_ttc := prod.public_price_ttc;
    display_price_ht := prod.public_price_ttc / vat_mult;
    source := 'public_price_ttc';
  ELSIF prod.price_ttc IS NOT NULL AND prod.price_ttc >= SENTINEL_THRESHOLD THEN
    display_price_ttc := prod.price_ttc;
    display_price_ht := prod.price_ttc / vat_mult;
    source := 'price_ttc';
  ELSE
    display_price_ttc := 0;
    display_price_ht := 0;
    source := 'unknown';
  END IF;

  IF prod.public_price_ttc IS NOT NULL
     AND prod.public_price_ttc >= SENTINEL_THRESHOLD
     AND prod.public_price_ttc > display_price_ttc THEN
    compare_at_ttc := prod.public_price_ttc;
  ELSE
    compare_at_ttc := NULL;
  END IF;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_display_price(uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.compute_display_price(uuid) IS
  'Returns display price hierarchy matching lib/pricing.ts logic. Uses SENTINEL_THRESHOLD 0.05 to exclude supplier sentinels. Single source of truth for pricing, used by site V1, Shopify import, and future sync workflows.';
