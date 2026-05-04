-- Stock dual + canal de vente — V2.1 BACKLOG.
--
-- Sépare le stock e-commerce du stock POS boutique pour éviter l'oversell
-- + permet d'avoir des produits POS-only (services, vrac, sans code-barre)
-- masqués du catalogue web.
--
-- Modèle :
--   stock_online   = stock vendable en ligne (utilisé par fetchCatalogue)
--   stock_boutique = stock POS Chaumont (jamais affiché côté site)
--   sales_channel  = 'online' | 'pos' | 'both'
--
-- Triggers :
--   1. trg_1_enforce_stock_channel — si sales_channel='pos' alors
--      stock_online := 0 (force la cohérence : un produit POS-only ne peut
--      jamais avoir de stock vendable en ligne, même par erreur).
--   2. trg_2_sync_stock_quantity_compat — recopie stock_online dans
--      stock_quantity à chaque write. Couche de compat le temps que
--      tous les readers migrent vers stock_online. À supprimer quand
--      `grep -rn stock_quantity src/` ne renvoie plus que des références
--      legacy explicites.
--
-- Idempotent : ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE pour les
-- triggers, backfill conditionnel (UPDATE … WHERE colonnes NULL).

-- ============================================================
-- 1. Colonnes
-- ============================================================

alter table public.products
  add column if not exists stock_online   int  not null default 0;

alter table public.products
  add column if not exists stock_boutique int  not null default 0;

alter table public.products
  add column if not exists sales_channel  text not null default 'both';

-- Contrainte CHECK ajoutée séparément pour rester idempotent (drop+add).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_sales_channel_check'
  ) then
    alter table public.products
      add constraint products_sales_channel_check
      check (sales_channel in ('online','pos','both'));
  end if;
end$$;

-- ============================================================
-- 2. Trigger unique BEFORE INSERT/UPDATE
-- ============================================================
--
-- Combine les 2 règles en un seul trigger pour éviter une race entre 2
-- triggers BEFORE (où le 2ᵉ pourrait écraser la décision du 1ᵉʳ selon
-- l'ordre alphabétique du nom et l'état stock_online vs old).
--
-- Ordre interne :
--   1. Compat legacy bidirectionnel : si un writer a touché stock_quantity
--      sans toucher stock_online, on bascule la valeur vers stock_online.
--   2. Enforce canal : si sales_channel = 'pos', stock_online := 0
--      (un produit POS-only ne peut JAMAIS avoir de stock vendable web).
--   3. Reflect : stock_quantity := stock_online (les readers legacy
--      continuent de marcher pendant la migration).

create or replace function public.enforce_stock_dual()
returns trigger
language plpgsql
as $$
begin
  -- 1. Compat : back-port stock_quantity → stock_online si writer legacy.
  if tg_op = 'INSERT' then
    if new.stock_online = 0 and new.stock_quantity > 0 then
      new.stock_online := new.stock_quantity;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.stock_quantity is distinct from old.stock_quantity
       and new.stock_online is not distinct from old.stock_online then
      new.stock_online := new.stock_quantity;
    end if;
  end if;

  -- 2. Enforce : POS-only force stock_online = 0.
  if new.sales_channel = 'pos' then
    new.stock_online := 0;
  end if;

  -- 3. Reflect : sortie cohérente côté legacy.
  new.stock_quantity := new.stock_online;

  return new;
end;
$$;

drop trigger if exists trg_1_enforce_stock_channel on public.products;
drop trigger if exists trg_2_sync_stock_quantity_compat on public.products;
drop trigger if exists trg_enforce_stock_dual on public.products;
create trigger trg_enforce_stock_dual
  before insert or update on public.products
  for each row execute function public.enforce_stock_dual();

-- ============================================================
-- 3. Vue consolidée (Supabase Studio + reporting)
-- ============================================================

create or replace view public.products_stock_view as
--
-- DROP avant CREATE : Postgres `CREATE OR REPLACE VIEW` n'autorise QUE
-- l'ajout de colonnes en fin — il refuse tout changement d'ordre, de
-- type, ou suppression (erreur 42P16). Si une `products_stock_view`
-- existait déjà avec un autre schéma, le replace silently failerait.
-- DROP IF EXISTS rend la migration ré-entrante quel que soit l'état
-- antérieur de la vue.

drop view if exists public.products_stock_view;
create view public.products_stock_view as
select
  id,
  name,
  brand,
  category,
  sales_channel,
  stock_online,
  stock_boutique,
  (stock_online + stock_boutique) as stock_total,
  shopify_inventory_item_id,
  updated_at
from public.products
where is_active = true;

revoke all on public.products_stock_view from anon;
-- L'admin lit la vue via supabaseServer (service-role) — pas de grant
-- supplémentaire nécessaire.

-- ============================================================
-- 4. Backfill initial (uniquement les rows pas encore migrées)
-- ============================================================

-- On considère « pas encore migrée » = stock_online à 0 ET stock_quantity
-- > 0. Migre stock_quantity → stock_online en une passe. Les rows déjà
-- migrées ou réellement à stock 0 ne sont pas touchées (idempotent).
update public.products
set stock_online = stock_quantity
where stock_quantity > 0
  and stock_online = 0
  and sales_channel = 'both';

-- ============================================================
-- 5. Vérifications post-migration
-- ============================================================

-- À exécuter après application :
--
--   select sales_channel, count(*) from public.products group by 1;
--   -- attendu : majorité 'both', 0 'pos' tant qu'aucune curation manuelle
--
--   select count(*) from public.products
--   where sales_channel = 'pos' and stock_online > 0;
--   -- attendu : 0 (le trigger 1 force stock_online=0 si pos)
--
--   select count(*) from public.products
--   where stock_quantity != stock_online;
--   -- attendu : 0 (le trigger 2 garantit l'égalité après prochain write)
