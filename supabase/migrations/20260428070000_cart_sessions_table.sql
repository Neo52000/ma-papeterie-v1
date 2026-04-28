-- Lightweight tracking of Shopify carts created from the V1 site.
--
-- Scope V1 : juste enregistrer les cartId créés + leur dernière activité.
-- L'envoi d'email abandoned cart est délégué à Shopify natif (Admin →
-- Marketing → Automations → Abandoned cart) qui couvre les checkouts
-- initiés (= la majorité des cas critiques).
--
-- Cette table sert à :
--   1. Analytics V1 : combien de carts créés, taux de conversion vs orders
--   2. Fondation V2 : email custom Brevo si Shopify natif ne suffit pas,
--      relance multi-canal, scoring abandon
--
-- Pas de PII obligatoire (customer_email nullable). Si capturé plus tard
-- via le drawer "save my cart by email", on update la row existante.

CREATE TABLE IF NOT EXISTS public.cart_sessions (
  cart_id text PRIMARY KEY,
  customer_email text,
  line_items_count integer NOT NULL DEFAULT 0,
  total_ttc numeric(12, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  checkout_url text,
  recovered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_last_activity
  ON public.cart_sessions (last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_email
  ON public.cart_sessions (customer_email)
  WHERE customer_email IS NOT NULL;

ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;

-- Insert/upsert depuis l'API endpoint /api/cart/track via service_role.
-- Pas de policy publique : la table n'est pas lisible côté navigateur.

COMMENT ON TABLE public.cart_sessions IS
  'Lightweight tracking of cart_ids created from the V1 site. Service-role only. Abandoned-cart emails are delegated to Shopify Admin (Marketing → Automations) for V1; this table is the foundation for a V2 custom Brevo flow.';
