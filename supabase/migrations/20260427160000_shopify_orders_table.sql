-- Table dédiée pour les orders venus de Shopify (canal Headless V1).
--
-- Pourquoi nouvelle table et pas la table `orders` legacy :
--   - orders.user_id NOT NULL → bloquerait les guests Shopify
--   - order_items.product_id NOT NULL FK → casse si line item sans match Supabase
--   - orders est utilisée par d'autres flows (B2B, photo, print, purchase) qu'on ne veut pas perturber
--
-- Alimentation : webhook POST /api/webhooks/shopify-order (HMAC verify) sur events
-- orders/create + orders/paid + orders/cancelled. Insert via shopify_order_id (UNIQUE)
-- pour idempotence — Shopify retry les webhooks en cas de 5xx.
--
-- RLS : aucune policy = lecture/écriture uniquement via service_role (côté serveur Astro).
-- Pas exposé via PostgREST anon/authenticated. À ouvrir plus tard si besoin (espace client).

CREATE TABLE IF NOT EXISTS public.shopify_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  shopify_order_id text NOT NULL UNIQUE,
  shopify_order_number text NOT NULL,
  shopify_order_name text NOT NULL,

  customer_email text,
  customer_first_name text,
  customer_last_name text,
  customer_phone text,

  financial_status text,
  fulfillment_status text,

  currency text NOT NULL DEFAULT 'EUR',
  subtotal_ttc numeric(12, 2) NOT NULL,
  total_tax numeric(12, 2) NOT NULL DEFAULT 0,
  total_shipping numeric(12, 2) NOT NULL DEFAULT 0,
  total_discount numeric(12, 2) NOT NULL DEFAULT 0,
  total_ttc numeric(12, 2) NOT NULL,

  line_items jsonb NOT NULL,
  shipping_address jsonb,
  billing_address jsonb,

  raw_payload jsonb NOT NULL,

  shopify_created_at timestamptz NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopify_orders_email
  ON public.shopify_orders (customer_email);

CREATE INDEX IF NOT EXISTS idx_shopify_orders_shopify_created
  ON public.shopify_orders (shopify_created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopify_orders_financial_status
  ON public.shopify_orders (financial_status);

ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.shopify_orders IS
  'Orders ingestion from Shopify webhooks (Headless channel). Service-role only — no public RLS policy. shopify_order_id UNIQUE for idempotent retries.';
