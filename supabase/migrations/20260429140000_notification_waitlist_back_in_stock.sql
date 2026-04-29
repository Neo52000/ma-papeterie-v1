-- Allow per-product back-in-stock subscriptions. Existing UNIQUE on
-- (email, feature) prevented multiple products per email — we replace it
-- with (email, feature, COALESCE(product_id, sentinel)) so non-product
-- features (liste_scolaire, etc.) keep their existing semantics.

ALTER TABLE public.notification_waitlist
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products (id) ON DELETE CASCADE;

-- Drop the legacy (email, feature) unique constraint if present.
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.notification_waitlist'::regclass
    AND contype = 'u'
    AND conkey = (
      SELECT array_agg(attnum ORDER BY attnum)
      FROM pg_attribute
      WHERE attrelid = 'public.notification_waitlist'::regclass
        AND attname IN ('email', 'feature')
    );
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.notification_waitlist DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_notification_waitlist_email_feature_product
  ON public.notification_waitlist (email, feature, COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_notification_waitlist_product
  ON public.notification_waitlist (product_id, feature)
  WHERE product_id IS NOT NULL;

COMMENT ON COLUMN public.notification_waitlist.product_id IS
  'Product reference for feature=''back_in_stock''. NULL for non-product features.';
