-- Search Intelligence — Couche 1 : capture des recherches client.
--
-- RGPD : pas d'IP, pas d'email. session_hash est un identifiant anonyme
-- généré côté client en sessionStorage (purgé à la fermeture de l'onglet),
-- ce qui place la collecte sous la dérogation CNIL « statistiques
-- strictement nécessaires » (pas de bannière consent requise tant qu'on
-- reste sur sessionStorage et qu'on ne croise pas avec d'autres sites).
--
-- Rétention : 90 jours via cron pg_cron à brancher en V2.2 si volume devient
-- significatif. Pour l'instant on laisse grossir : ~1k rows/jour estimé,
-- table négligeable.

create extension if not exists unaccent;

create table if not exists public.search_queries (
  id              uuid primary key default gen_random_uuid(),
  query_raw       text not null,
  query_norm      text not null,
  results_count   int  not null default 0,
  no_result       boolean generated always as (results_count = 0) stored,

  -- Engagement aval (rempli par /api/search/click). Nullable tant que
  -- l'utilisateur n'a rien cliqué.
  clicked_product_id uuid references public.products(id) on delete set null,
  clicked_position   int,

  -- Contexte (anonyme).
  session_hash text not null,
  source       text not null check (source in ('search_bar','autocomplete','category_filter','url_param')),
  device       text check (device in ('mobile','desktop','tablet')),
  is_b2b       boolean default false,

  created_at timestamptz not null default now()
);

create index if not exists idx_sq_norm     on public.search_queries (query_norm);
create index if not exists idx_sq_no_result on public.search_queries (no_result) where no_result = true;
create index if not exists idx_sq_created  on public.search_queries (created_at desc);
create index if not exists idx_sq_clicked  on public.search_queries (clicked_product_id) where clicked_product_id is not null;
create index if not exists idx_sq_session  on public.search_queries (session_hash, created_at desc);

alter table public.search_queries enable row level security;

-- Lecture admin uniquement. INSERT/UPDATE passent par l'API côté serveur
-- avec la service-role key (bypass RLS).
drop policy if exists "search_queries_admin_read" on public.search_queries;
create policy "search_queries_admin_read"
  on public.search_queries
  for select
  using (public.is_admin(auth.uid()));

comment on table public.search_queries is
  'Capture anonyme des recherches catalogue. Insertion service-role uniquement, lecture admin via is_admin().';

-- Normalisation côté DB pour cohérence avec les vues d'agrégation Sprint 2
-- (lower + unaccent + collapse whitespace).
create or replace function public.normalize_query(input text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select regexp_replace(
    lower(unaccent(coalesce(input, ''))),
    '\s+', ' ', 'g'
  );
$$;

grant execute on function public.normalize_query(text) to authenticated, anon, service_role;
