-- Search Intelligence — Couche 2 : vues d'agrégation pour le dashboard
-- /admin/search-insights. Lecture passe via /api/admin/search-insights
-- (service-role) qui gate sur requireAdmin — donc on n'accorde pas d'accès
-- direct aux rôles anon/authenticated.

-- Top queries sans résultat (≥2 occurrences sur 30j). Cible : opportunités
-- d'ajout produit ou de réécriture de fiche pour matcher l'intention.
create or replace view public.v_search_no_results as
select
  query_norm,
  count(*)::int                              as occurrences,
  count(distinct session_hash)::int          as unique_sessions,
  max(created_at)                            as last_seen,
  array_agg(distinct query_raw)              as raw_variations
from public.search_queries
where created_at > now() - interval '30 days'
  and no_result = true
group by query_norm
having count(*) >= 2
order by occurrences desc, last_seen desc;

-- Queries avec résultats mais CTR < 15% (≥5 occurrences). Cible : titre /
-- description de fiche à reformuler — les produits matchent FTS mais ne
-- déclenchent pas le clic.
create or replace view public.v_search_low_ctr as
select
  query_norm,
  count(*)::int                                                              as searches,
  count(*) filter (where clicked_product_id is not null)::int                as clicks,
  round(
    100.0 * count(*) filter (where clicked_product_id is not null) / count(*),
    2
  )::numeric(5,2)                                                            as ctr_pct,
  avg(results_count)::int                                                    as avg_results,
  avg(clicked_position) filter (where clicked_position is not null)::numeric(4,1)
                                                                             as avg_click_position
from public.search_queries
where created_at > now() - interval '30 days'
  and no_result = false
group by query_norm
having count(*) >= 5
   and (count(*) filter (where clicked_product_id is not null))::float / count(*) < 0.15
order by searches desc;

-- Trend journalier sur 30j pour le sparkline du dashboard.
create or replace view public.v_search_trend_daily as
select
  date_trunc('day', created_at)::date          as day,
  count(*)::int                                as total_searches,
  count(*) filter (where no_result)::int       as no_results,
  count(distinct session_hash)::int            as unique_sessions
from public.search_queries
where created_at > now() - interval '30 days'
group by date_trunc('day', created_at)
order by day;

-- Restreint l'accès : aucune sélection directe par anon/authenticated.
-- Seul service-role (via /api/admin/search-insights) lit ces vues.
revoke all on public.v_search_no_results from anon, authenticated;
revoke all on public.v_search_low_ctr     from anon, authenticated;
revoke all on public.v_search_trend_daily from anon, authenticated;
