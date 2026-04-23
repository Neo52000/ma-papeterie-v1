# RLS Hardening Plan — avant flip public du repo

> Audit réalisé le 2026-04-22 dans l'optique de passer le repo `Neo52000/ma-papeterie-v1` en **public** (objectif : bénéficier de branch protection gratuite, prévenir un incident type PR #4). Verdict : **repo maintenu privé** tant que les 4 fixes RLS ci-dessous ne sont pas appliqués.

---

## 1. Contexte & pourquoi

### Ce qui déclenche l'audit

Après l'incident PR #4 (merge sans CI check, build cassé sur main), on a voulu activer la **branch protection GitHub** sur `main`. Sur un compte GitHub gratuit avec repo **privé**, cette feature est indisponible. Deux options : (a) upgrade payant (~4 $/mois), (b) passer le repo en public.

L'option (b) a le mérite d'être gratuite, mais elle expose l'URL Supabase `https://mgojmkzovqgpipybelrr.supabase.co` — déjà présente dans `.env.example`, `docs/PHASE-2-SCHEMA-REPORT.md`, `scripts/inspect-schema.ts` et une migration SQL. Cette URL **n'est pas secrète** par design (elle est embarquée dans le frontend via `PUBLIC_SUPABASE_URL`), mais combinée à la **clé anon** (elle aussi embarquée en frontend), n'importe qui peut interroger `https://mgojmkzovqgpipybelrr.supabase.co/rest/v1/<table>` via `curl` et lire tout ce que la RLS laisse passer à `anon`.

Avec le repo public, on facilite la découverte. Sans fix RLS, on accepte que des scripts automatisés aspirent les données business.

### Risques identifiés

| Domaine        | Risque concret                                                                                                                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RGPD**       | Fuite email/nom si policies permissives sur `schools`, `school_lists`, `photo_orders`, `print_orders`, `stamp_designs` (selon `qual`)                                                                                                                                                                         |
| **Commercial** | Fuite structure de coûts (`supplier_price_tiers`), relations fournisseurs (`supplier_stock_snapshots`), intelligence concurrentielle (`competitors`, `competitor_prices`), coefficients de marge (`pricing_category_coefficients`), pipeline commercial CRM (`crm_v_pipeline_summary`, `crm_v_sales_summary`) |
| **Intégrité**  | 6 tables sans RLS activée → `anon` peut non seulement lire mais aussi `UPDATE`, `DELETE`, `TRUNCATE`                                                                                                                                                                                                          |

---

## 2. Périmètre — 4 catégories de fixes

### A. 6 tables avec **RLS désactivée** → anon a tous droits via GRANT Supabase par défaut

| Table               | Rows       | Nature                                                   | Sévérité                                           |
| ------------------- | ---------- | -------------------------------------------------------- | -------------------------------------------------- |
| `temp_stock_update` | **24 749** | Staging stock (censé temp, contient des données réelles) | 🚨 PRIO 1 (volume + TRUNCATE = sabotage catalogue) |
| `pos_cleanup_log`   | 157        | Log opérations POS                                       | 🚨                                                 |
| `dashboard_stats`   | 1          | KPI dashboard (CA, commandes ?)                          | 🚨 (si contient business metrics)                  |
| `catalog_stats`     | 1          | Stats agrégées catalogue                                 | ⚠️                                                 |
| `rollup_state`      | 1          | État cron d'agrégation                                   | ⚠️ (corruption rollup)                             |
| `sms_daily_counts`  | 0          | Compteur SMS quotidien                                   | ⚠️ (vide, mais pollution possible)                 |

**Fix pattern** : `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;` + aucune policy → deny par défaut pour anon/authenticated.

### B. 3 vues avec `security_invoker = false` → bypass RLS (s'exécutent en tant que `postgres`)

| Vue                         | Données exposées                                     | Décision suggérée                                         |
| --------------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `crm_v_pipeline_summary`    | Pipeline commercial (opportunités, montants, stages) | 🚨 `security_invoker = true` ou `REVOKE SELECT FROM anon` |
| `crm_v_sales_summary`       | Résumé ventes CRM (CA, volumes, périodes)            | 🚨 idem                                                   |
| `v_supplier_offer_priority` | Priorisation offres fournisseurs (marges implicites) | 🚨 idem                                                   |

✅ Non concernés (déjà OK) : `v_prospects_priorises` (`security_invoker=true`), `v_stock_virtuel` (`security_invoker=on`), `v_products_vendable`, `v_product_review_stats` (contenu non-sensible).

**Fix pattern** : `ALTER VIEW <v> SET (security_invoker = true);`

### C. 7 policies `anon SELECT` sur données business sensibles

| Table                           | Policy actuelle                               | Nature                                                | Décision suggérée                                                                           |
| ------------------------------- | --------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `competitors`                   | `Competitors viewable by everyone`            | Liste concurrents surveillés                          | 🚨 Drop policy anon, restreindre à admin                                                    |
| `competitor_prices`             | `Les prix concurrents sont visibles par tous` | Prix scrapés concurrents                              | 🚨 idem                                                                                     |
| `competitor_product_map`        | `Competitor map viewable by everyone`         | Mapping produits ↔ SKU concurrent                     | 🚨 idem                                                                                     |
| `supplier_price_tiers`          | `Price tiers viewable by everyone`            | Tarifs fournisseurs par volume                        | 🚨 PRIO 1 (structure de coûts)                                                              |
| `supplier_stock_snapshots`      | `Stock snapshots viewable by everyone`        | Snapshots stock fournisseur                           | 🚨                                                                                          |
| `pricing_category_coefficients` | `pricing_coefficients_public_read`            | Coefficients marge catégorie                          | 🚨 Déjà flaggé en findings. Routage via `supabaseServer` (déjà en place) + drop policy anon |
| `consumable_import_logs`        | `Public read consumable_import_logs`          | Logs import consommables (IDs jobs, erreurs, timings) | 🚨 Pattern d'exploitation                                                                   |

**Fix pattern** : `DROP POLICY <name> ON <t>;` (ou reformuler `USING (auth.role() = 'admin')` selon la convention projet).

### D. 2 policies avec `qual` à vérifier

| Table                           | Policy                                 | Risque potentiel                                                                                                                                                                                              |
| ------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stamp_designs`                 | `stamp_designs_anon_select`            | Si `qual = USING (true)` → tous les designs clients sont publics (textes contiennent noms/adresses de sociétés). Vérifier ; si confirmé → restreindre à `USING (is_public = true)` ou équivalent              |
| `photo_orders` / `print_orders` | `Guest can view own <orders> by email` | Si le `qual` compare à un paramètre manipulable (`current_setting('request.jwt.claims')::json->>'email'` vs query param injection), un attaquant peut énumérer les commandes d'autrui. Vérifier le qual exact |

**Action** : lire le `qual` complet (`pg_policies.qual`) sur ces 3 policies spécifiques et trancher au cas par cas.

---

## 3. Décisions business ouvertes (à trancher par Élie)

| Sujet                                            | Question                                                                                                                                                    | Impact                                            |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `product_volume_pricing`                         | Actuellement `SELECT public`. Voulu (affiché sur fiche produit pour paliers B2B) ou fuite de la grille B2B ?                                                | Si ça doit rester public : ✅ OK. Sinon : durcir. |
| `entreprises_cache`                              | Actuellement `SELECT public`. Pure cache SIRET/INSEE (données publiques) ou enrichi avec scoring/priorisation commerciale interne ?                         | Si enrichi : 🚨 à restreindre                     |
| `photo_orders` / `print_orders` "Guest by email" | Quel est le `qual` exact ?                                                                                                                                  | Définit si énumération possible                   |
| Périmètre global                                 | Ce projet Supabase héberge aussi le legacy v5 + POS + CRM. V1 lit juste catalogue/images/prix. Faut-il **isoler V1 sur un autre projet Supabase** à terme ? | Décision structurante, hors scope RLS hardening   |

---

## 4. Plan d'exécution suggéré

### Séquence

1. **1 PR dédiée** : `chore(security): RLS hardening before public flip`
2. **~15 migrations SQL courtes** (1 par table/vue pour traçabilité, OU 1 migration groupée si validation manuelle fiable). Pattern de nommage : `supabase/migrations/20260423HHMMSS_rls_hardening_<scope>.sql`
3. **Tests avant/après** via `curl` avec la clé anon publique :
   ```bash
   curl -s "https://mgojmkzovqgpipybelrr.supabase.co/rest/v1/temp_stock_update?limit=1" \
     -H "apikey: <anon_key>" -H "Authorization: Bearer <anon_key>"
   # Attendu après fix : {"code":"42501","message":"permission denied..."}
   ```
4. **Validation frontend** : smoke test `/catalogue`, `/catalogue/[category]`, `/produit/[slug]` ne doivent RIEN perdre (les vraies policies publiques restent : `products`, `categories`, `product_images`, etc.)
5. **Durée estimée** : 1h30 pour écriture + 30 min pour tests curl + smoke frontend = **~2h**
6. **Créneau conseillé** : tête fraîche, session dédiée, pas à 18h un vendredi

### Ordre d'exécution recommandé (par ordre de risque décroissant)

1. **A.1** → `temp_stock_update` ENABLE RLS (24k rows, TRUNCATE possible) — **si un seul fix doit être fait, c'est celui-là**
2. **C.4** → `supplier_price_tiers` drop policy anon (structure de coûts)
3. **B.1 à B.3** → `crm_v_*` + `v_supplier_offer_priority` → `security_invoker = true`
4. **C.1 à C.3** → `competitors*` drop policies anon
5. **A.2 à A.6** → les 5 autres tables sans RLS
6. **C.5 à C.7** → `supplier_stock_snapshots`, `pricing_category_coefficients`, `consumable_import_logs`
7. **D** → audit `qual` des 3 policies suspectes, décision au cas par cas
8. **Décisions business** (§3) → validation Élie avant d'ajuster les 2 policies concernées

### Ce qu'il NE FAUT PAS casser

Les tables/vues intentionnellement publiques utilisées par le frontend V1 :

- `products`, `categories`, `brands`, `product_images`, `product_packagings`, `product_relations`, `product_seo`, `product_attributes`
- `price_current`, `price_exceptions`, `price_snapshots`
- `eco_tax_rates`, `shipping_methods`, `shipping_zones`
- CMS : `blog_articles`, `blog_seo_metadata`, `menu_items`, `navigation_menus`, `static_pages`, `site_globals`
- Feature consumables : `consumables`, `consumable_cross_selling`, `compatibility_matrix`, `printer_brands`, `printer_models`, `printer_consumable_links`, `stamp_models`
- Forms INSERT anon : `analytics_events`, `blog_article_views`, `recommendation_logs`, `leasing_quotes`, `blog_comments`, `newsletter_subscriptions`, `gdpr_requests`, `user_consents`

---

## Annexe — méthodologie de l'audit

3 requêtes SQL sur `pg_policies`, `pg_class`, `information_schema.table_privileges` + 2 requêtes complémentaires (vues `security_invoker`, volumes rows tables sans RLS). Exécuté via le MCP Supabase en lecture seule. Aucune modification DB. Résultats bruts non conservés (trop volumineux pour le context window).

Pour reproduire l'audit, voir les 5 requêtes dans la conversation de session du 2026-04-22 après-midi.
