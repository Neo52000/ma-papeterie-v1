-- Admin convenience views — surfaced in Supabase Studio as tables.
-- All read-only, service-role only (no public RLS). Built to answer the
-- recurring "where do I look for X?" questions without writing SQL.
--
-- Naming convention: v_admin_<topic>. Hidden from the JS API by `revoke
-- all on schema` policies on Supabase by default for views unless granted —
-- but service-role (used by Studio) bypasses RLS, so they show up there.

CREATE OR REPLACE VIEW public.v_admin_devis_pending AS
SELECT id, created_at, company_name, contact_name, email, phone, message, status
FROM public.b2b_quotes
WHERE status = 'pending'
ORDER BY created_at DESC;

COMMENT ON VIEW public.v_admin_devis_pending IS
  'Devis B2B reçus, en attente de traitement. À répondre sous 24h ouvrées.';

CREATE OR REPLACE VIEW public.v_admin_carts_abandoned_24h AS
SELECT
  cart_id,
  customer_email,
  line_items_count,
  total_ttc,
  currency,
  checkout_url,
  abandoned_email_sent_at,
  last_activity_at,
  created_at
FROM public.cart_sessions
WHERE last_activity_at > now() - interval '24 hours'
  AND last_activity_at < now() - interval '1 hour'
  AND recovered_at IS NULL
  AND customer_email IS NOT NULL
ORDER BY last_activity_at DESC;

COMMENT ON VIEW public.v_admin_carts_abandoned_24h IS
  'Carts abandonnés email capturé entre 1h et 24h. Pipeline Brevo cron hourly.';

CREATE OR REPLACE VIEW public.v_admin_notify_stock_subscribers AS
SELECT
  p.name AS product_name,
  p.slug,
  p.brand,
  p.category,
  COALESCE(p.stock_quantity, 0) AS stock_now,
  COUNT(w.id) AS subscribers_count,
  array_agg(w.email ORDER BY w.created_at) AS subscriber_emails,
  MIN(w.created_at) AS oldest_subscription
FROM public.notification_waitlist w
JOIN public.products p ON p.id = w.product_id
WHERE w.feature = 'back_in_stock'
GROUP BY p.id, p.name, p.slug, p.brand, p.category, p.stock_quantity
ORDER BY subscribers_count DESC, oldest_subscription ASC;

COMMENT ON VIEW public.v_admin_notify_stock_subscribers IS
  'Demandes notify-back-in-stock agrégées par produit. Cron back-in-stock-emails (4h) traite quand stock revient.';

CREATE OR REPLACE VIEW public.v_admin_liste_scolaire_waitlist AS
SELECT
  email,
  metadata->>'prenom' AS prenom,
  metadata->>'niveau' AS niveau,
  created_at
FROM public.notification_waitlist
WHERE feature = 'liste_scolaire'
ORDER BY created_at DESC;

COMMENT ON VIEW public.v_admin_liste_scolaire_waitlist IS
  'Inscrits notification "service liste scolaire ouvert". Export CSV pour campagne Brevo manuelle.';

CREATE OR REPLACE VIEW public.v_admin_top_wishlist AS
SELECT
  p.name AS product_name,
  p.slug,
  p.brand,
  p.category,
  COALESCE(p.price_ttc, p.price, 0) AS price_ttc,
  COALESCE(p.stock_quantity, 0) AS stock_now,
  COUNT(w.id) AS wishlist_count,
  MAX(w.created_at) AS most_recent_save
FROM public.wishlists w
JOIN public.products p ON p.id = w.product_id
GROUP BY p.id, p.name, p.slug, p.brand, p.category, p.price_ttc, p.price, p.stock_quantity
ORDER BY wishlist_count DESC, most_recent_save DESC
LIMIT 20;

COMMENT ON VIEW public.v_admin_top_wishlist IS
  'Top 20 produits les plus ajoutés en favoris. Utile pour réassort + promos ciblées.';

CREATE OR REPLACE VIEW public.v_admin_orders_30d AS
SELECT
  shopify_order_name,
  shopify_created_at,
  customer_email,
  COALESCE(customer_first_name || ' ' || customer_last_name, customer_email) AS customer,
  total_ttc,
  currency,
  financial_status,
  fulfillment_status,
  jsonb_array_length(line_items) AS items_count
FROM public.shopify_orders
WHERE shopify_created_at > now() - interval '30 days'
ORDER BY shopify_created_at DESC;

COMMENT ON VIEW public.v_admin_orders_30d IS
  'Commandes Shopify 30 derniers jours. Vue alternative à Shopify Admin pour suivre côté DB.';
