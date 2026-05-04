-- Linking compte Supabase ↔ customer Shopify — V2.3 BACKLOG.
--
-- Aujourd'hui /api/me/orders matche les commandes Shopify par email
-- (customer_email). Si un client change son email côté Supabase ou côté
-- Shopify, il perd l'historique. Un linking explicite par
-- shopify_customer_id corrige ça : tant que le link Supabase user_id ↔
-- Shopify customer_id existe, l'historique est stable même après changement
-- d'email.
--
-- Stratégie auto-link :
--   * Webhook shopify-order persiste le shopify_customer_id sur chaque
--     row shopify_orders (nouvelle colonne).
--   * /api/me/orders : si un link existe déjà → query par
--     shopify_customer_id. Sinon fallback email + auto-link en background
--     (le premier appel après une commande lie le compte).

-- ============================================================
-- 1. Colonne sur shopify_orders
-- ============================================================

alter table public.shopify_orders
  add column if not exists shopify_customer_id text;

create index if not exists idx_shopify_orders_customer_id
  on public.shopify_orders (shopify_customer_id)
  where shopify_customer_id is not null;

comment on column public.shopify_orders.shopify_customer_id is
  'Numeric customer ID Shopify (extrait du webhook payload.customer.id). NULL pour les commandes guest sans compte. Utilisé pour le linking V2.3.';

-- ============================================================
-- 2. Table de liaison
-- ============================================================

create table if not exists public.shopify_customer_links (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  shopify_customer_id  text not null,
  linked_at            timestamptz not null default now(),
  -- Track method used to establish the link, for audit later (manual link
  -- via /compte vs auto-link from email match).
  link_method          text not null default 'auto_email_match'
                       check (link_method in ('auto_email_match','manual','admin')),
  unique (shopify_customer_id)
);

alter table public.shopify_customer_links enable row level security;

drop policy if exists "shopify_customer_links_owner_read" on public.shopify_customer_links;
create policy "shopify_customer_links_owner_read"
  on public.shopify_customer_links
  for select
  using (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE : service-role uniquement (passage par /api/me/orders).
-- Pas de policy → bloqué par défaut pour auth/anon.

create index if not exists idx_shopify_customer_links_shopify_id
  on public.shopify_customer_links (shopify_customer_id);

comment on table public.shopify_customer_links is
  'Lien stable entre un compte Supabase et un customer Shopify. Établi via /api/me/orders au premier match email après une commande. Survit aux changements d''email côté Supabase ou Shopify.';
