-- Module Promotions — V2.3 BACKLOG.
--
-- Ajoute une colonne `compare_at_ttc` (override admin Shopify-style) sur
-- public.products. Sémantique : si NOT NULL → produit en promo, et la
-- colonne est le prix barré à afficher.
--
-- Distinct de la valeur `compare_at_ttc` que l'RPC compute_display_price
-- inferre depuis public_price_ttc (anchor « PVC fournisseur »). Ici c'est
-- une promo explicitement décidée par l'admin — qui prime sur l'inférence
-- côté wrapper TS. Le RPC ne change pas (back-compat zéro impact).
--
-- Idempotent : ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.

alter table public.products
  add column if not exists compare_at_ttc numeric(10, 2);

-- Soft-check : si renseigné, doit être > 0. NULL reste autorisé (pas en promo).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_compare_at_ttc_positive'
  ) then
    alter table public.products
      add constraint products_compare_at_ttc_positive
      check (compare_at_ttc is null or compare_at_ttc > 0);
  end if;
end$$;

-- Index partiel pour le filter ?promo=1 sur le catalogue (~quelques %
-- des rows en promo à terme — partial index = sub-MB, lookup direct).
create index if not exists idx_products_compare_at_ttc
  on public.products (compare_at_ttc)
  where compare_at_ttc is not null;

comment on column public.products.compare_at_ttc is
  'Prix barré (override admin) Shopify-style. NOT NULL = produit en promo. La logique TS dans lib/pricing affiche compare_at_ttc strikethrough quand > display_price_ttc.';
