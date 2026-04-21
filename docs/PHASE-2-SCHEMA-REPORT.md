# PHASE 2 — Supabase schema reconnaissance

> Rapport généré le 2026-04-21T06:38:17.950Z via `npx tsx scripts/inspect-schema.ts`.
> Source : OpenAPI PostgREST (`https://mgojmkzovqgpipybelrr.supabase.co/rest/v1/`) + échantillons `from().select()`.
> Projet Supabase : `mgojmkzovqgpipybelrr`. Lecture seule (service_role bypass RLS + test anon).

## Section A — Inventaire des tables

| Table | Lignes | Méthode | Description déduite |
|---|---:|---|---|
| `abandoned_carts` | 0 | exact | paniers |
| `admin_secrets` | 4 | exact | (non déduit) |
| `agent_logs` | 3 339 | exact | (non déduit) |
| `analytics_events` | 4 290 | exact | (non déduit) |
| `app_settings` | 4 | exact | (non déduit) |
| `audit_logs` | 0 | exact | (non déduit) |
| `b2b_accounts` | 0 | exact | clients / comptes |
| `b2b_budgets` | 0 | exact | (non déduit) |
| `b2b_company_users` | 0 | exact | utilisateurs |
| `b2b_customer_grids` | 0 | exact | clients / comptes |
| `b2b_grid_categories` | 0 | exact | catégories |
| `b2b_interactions` | 0 | exact | (non déduit) |
| `b2b_invoice_orders` | 0 | exact | commandes |
| `b2b_invoices` | 0 | exact | (non déduit) |
| `b2b_price_grids` | 0 | exact | prix |
| `b2b_prospects` | 0 | exact | (non déduit) |
| `b2b_reorder_template_items` | 0 | exact | commandes |
| `b2b_reorder_templates` | 0 | exact | commandes |
| `blog_article_views` | 3 | exact | (non déduit) |
| `blog_articles` | 1 | exact | (non déduit) |
| `blog_comments` | 0 | exact | (non déduit) |
| `blog_seo_metadata` | 1 | exact | (non déduit) |
| `brands` | 442 | exact | marques |
| `catalog_stats` | 1 | exact | (non déduit) |
| `categories` | 494 | exact | catégories |
| `compatibility_matrix` | 0 | exact | (non déduit) |
| `competitor_prices` | 26 | exact | prix |
| `competitor_product_map` | 0 | exact | données produit |
| `competitors` | 12 | exact | (non déduit) |
| `consumable_cross_selling` | 8 | exact | (non déduit) |
| `consumable_import_logs` | 1 | exact | (non déduit) |
| `consumables` | 32 | exact | (non déduit) |
| `crawl_images` | 0 | exact | médias / images |
| `crawl_jobs` | 6 | exact | (non déduit) |
| `crawl_pages` | 3 | exact | (non déduit) |
| `crm_accounts` | 1 | exact | clients / comptes |
| `crm_ai_logs` | 0 | exact | (non déduit) |
| `crm_ai_models` | 0 | exact | (non déduit) |
| `crm_contacts` | 0 | exact | (non déduit) |
| `crm_documents` | 0 | exact | (non déduit) |
| `crm_email_accounts` | 0 | exact | clients / comptes |
| `crm_email_templates` | 0 | exact | (non déduit) |
| `crm_emails` | 0 | exact | (non déduit) |
| `crm_entities` | 0 | exact | (non déduit) |
| `crm_entity_tags` | 0 | exact | (non déduit) |
| `crm_events` | 0 | exact | (non déduit) |
| `crm_import_batches` | 0 | exact | (non déduit) |
| `crm_import_errors` | 0 | exact | (non déduit) |
| `crm_interactions` | 0 | exact | (non déduit) |
| `crm_invoice_items` | 0 | exact | (non déduit) |
| `crm_invoices` | 0 | exact | (non déduit) |
| `crm_notes` | 0 | exact | (non déduit) |
| `crm_opportunities` | 0 | exact | (non déduit) |
| `crm_payments` | 0 | exact | (non déduit) |
| `crm_pipeline` | 0 | exact | (non déduit) |
| `crm_pipeline_stages` | 8 | exact | (non déduit) |
| `crm_pipelines` | 1 | exact | (non déduit) |
| `crm_products` | 11 | exact | données produit |
| `crm_quote_items` | 0 | exact | devis |
| `crm_quotes` | 0 | exact | devis |
| `crm_rgpd_log` | 0 | exact | (non déduit) |
| `crm_settings` | 1 | exact | (non déduit) |
| `crm_sources` | 0 | exact | (non déduit) |
| `crm_tags` | 0 | exact | (non déduit) |
| `crm_tasks` | 0 | exact | (non déduit) |
| `crm_ticket_messages` | 0 | exact | (non déduit) |
| `crm_tickets` | 0 | exact | (non déduit) |
| `crm_users` | 0 | exact | utilisateurs |
| `crm_v_pipeline_summary` | 0 | exact | (non déduit) |
| `crm_v_sales_summary` | 0 | exact | (non déduit) |
| `cron_job_logs` | 628 | exact | (non déduit) |
| `customer_interactions` | 0 | exact | clients / comptes |
| `customer_recommendations` | 0 | exact | clients / comptes |
| `customer_rfm_scores` | 0 | exact | clients / comptes |
| `dashboard_stats` | 1 | exact | (non déduit) |
| `data_gouv_sync_runs` | 0 | exact | mapping Shopify |
| `data_processing_register` | 5 | exact | (non déduit) |
| `data_retention_logs` | 0 | exact | (non déduit) |
| `eco_tax_rates` | 15 | exact | (non déduit) |
| `enrich_import_jobs` | 138 | exact | (non déduit) |
| `entreprises_cache` | 0 | exact | (non déduit) |
| `gdpr_requests` | 0 | exact | (non déduit) |
| `import_job_rows` | 0 | exact | (non déduit) |
| `import_jobs` | 0 | exact | (non déduit) |
| `import_mapping_templates` | 0 | exact | mapping Shopify |
| `import_snapshots` | 0 | exact | (non déduit) |
| `kpi_snapshots` | 12 | exact | (non déduit) |
| `leasing_quotes` | 1 | exact | devis |
| `liderpapel_pricing_coefficients` | 0 | exact | (non déduit) |
| `marketplace_connections` | 3 | exact | (non déduit) |
| `marketplace_product_mappings` | 0 | exact | données produit |
| `marketplace_sales` | 0 | exact | (non déduit) |
| `marketplace_sync_logs` | 0 | exact | mapping Shopify |
| `menu_items` | 44 | exact | (non déduit) |
| `navigation_menus` | 6 | exact | (non déduit) |
| `newsletter_subscriptions` | 0 | exact | (non déduit) |
| `order_items` | 0 | exact | commandes |
| `orders` | 0 | exact | commandes |
| `page_revisions` | 0 | exact | (non déduit) |
| `photo_order_items` | 1 | exact | commandes |
| `photo_orders` | 2 | exact | commandes |
| `photo_pricing` | 8 | exact | (non déduit) |
| `pos_cleanup_log` | 157 | exact | (non déduit) |
| `price_adjustments` | 0 | exact | prix |
| `price_changes_log` | 0 | exact | prix |
| `price_current` | 0 | exact | prix |
| `price_exceptions` | 0 | exact | prix |
| `price_snapshots` | 0 | exact | prix |
| `pricing_alerts` | 193 393 | exact | (non déduit) |
| `pricing_insights` | 2 | exact | (non déduit) |
| `pricing_rules` | 0 | exact | (non déduit) |
| `pricing_ruleset_rules` | 0 | exact | (non déduit) |
| `pricing_rulesets` | 0 | exact | (non déduit) |
| `pricing_simulation_items` | 0 | exact | (non déduit) |
| `pricing_simulations` | 0 | exact | (non déduit) |
| `print_orders` | 1 | exact | commandes |
| `print_pricing` | 10 | exact | (non déduit) |
| `printer_brands` | 11 | exact | marques |
| `printer_consumable_links` | 45 | exact | (non déduit) |
| `printer_models` | 27 | exact | (non déduit) |
| `product_attributes` | 0 | exact | données produit |
| `product_exceptions` | 59 883 | exact | données produit |
| `product_images` | 48 298 | exact | images / médias produits |
| `product_lifecycle_logs` | 28 679 | exact | données produit |
| `product_packagings` | 0 | exact | données produit |
| `product_price_history` | 6 815 | exact | prix produits |
| `product_relations` | 0 | exact | produits liés (cross-sell) |
| `product_reviews` | 0 | exact | données produit |
| `product_seo` | 12 398 | exact | données produit |
| `product_stock_locations` | 7 | exact | stocks produits |
| `product_volume_pricing` | 5 | exact | données produit |
| `products` | 141 040 | est. | données produit |
| `profiles` | 3 | exact | utilisateurs |
| `purchase_order_items` | 0 | exact | commandes |
| `purchase_orders` | 1 | exact | commandes |
| `quotes` | 0 | exact | devis |
| `rate_limit_entries` | 381 | exact | (non déduit) |
| `recommendation_logs` | 1 | exact | (non déduit) |
| `reorder_suggestions` | 0 | exact | commandes |
| `rollup_state` | 1 | exact | (non déduit) |
| `school_list_carts` | 0 | exact | paniers |
| `school_list_items` | 37 | exact | listes scolaires |
| `school_list_matches` | 0 | exact | listes scolaires |
| `school_list_templates` | 0 | exact | listes scolaires |
| `school_list_uploads` | 0 | exact | listes scolaires |
| `school_lists` | 7 | exact | listes scolaires |
| `schools` | 5 | exact | (non déduit) |
| `scrape_runs` | 5 | exact | (non déduit) |
| `service_impressions_pricing` | 11 | exact | (non déduit) |
| `service_photocopies_pricing` | 8 | exact | (non déduit) |
| `service_photos_pricing` | 9 | exact | (non déduit) |
| `shipping_methods` | 3 | exact | (non déduit) |
| `shipping_zones` | 1 | exact | (non déduit) |
| `shopify_config` | 1 | exact | mapping Shopify |
| `shopify_product_mapping` | 43 000 | exact | données produit |
| `shopify_sync_log` | 100 804 | exact | mapping Shopify |
| `site_globals` | 2 | exact | (non déduit) |
| `sms_campaigns` | 0 | exact | (non déduit) |
| `sms_daily_counts` | 0 | exact | (non déduit) |
| `sms_logs` | 0 | exact | (non déduit) |
| `sms_preferences` | 0 | exact | (non déduit) |
| `sms_templates` | 8 | exact | (non déduit) |
| `softcarrier_pricing_coefficients` | 1 | exact | (non déduit) |
| `stamp_designs` | 0 | exact | (non déduit) |
| `stamp_models` | 15 | exact | (non déduit) |
| `static_pages` | 23 | exact | (non déduit) |
| `stock_reception_items` | 0 | exact | stocks |
| `stock_receptions` | 0 | exact | stocks |
| `supplier_category_mappings` | 0 | exact | catégories |
| `supplier_import_logs` | 38 | exact | (non déduit) |
| `supplier_offers` | 129 837 | exact | (non déduit) |
| `supplier_price_tiers` | 242 266 | exact | prix |
| `supplier_products` | 118 265 | exact | données produit |
| `supplier_stock_snapshots` | 0 | exact | stocks |
| `suppliers` | 4 | exact | (non déduit) |
| `sync_log` | 114 | exact | mapping Shopify |
| `sync_pipeline` | 1 | exact | mapping Shopify |
| `tarifs_b2b_staging` | 107 | exact | (non déduit) |
| `temp_stock_update` | 24 749 | exact | stocks |
| `user_consents` | 0 | exact | utilisateurs |
| `user_roles` | 3 | exact | utilisateurs |
| `v_product_review_stats` | 0 | exact | données produit |
| `v_products_vendable` | 34 613 | est. | données produit |
| `v_prospects_priorises` | 0 | exact | (non déduit) |
| `v_stock_virtuel` | 139 726 | exact | stocks |
| `v_supplier_offer_priority` | 17 482 | exact | (non déduit) |

**Verdict A** : ✅ 186 tables détectées dans `public`.

## Section B — Structure `products`

Colonnes : **76**.

| Colonne | Type | Nullable | FK | Default |
|---|---|---|---|---|
| `id` | string (uuid) | non | — | `"gen_random_uuid()"` |
| `name` | string (text) | non | — | — |
| `description` | string (text) | oui | — | — |
| `price` | number (numeric) | non | — | — |
| `image_url` | string (text) | oui | — | — |
| `category` | string (text) | non | — | — |
| `badge` | string (text) | oui | — | — |
| `eco` | boolean (boolean) | oui | — | `false` |
| `stock_quantity` | integer (integer) | oui | — | `0` |
| `is_featured` | boolean (boolean) | oui | — | `false` |
| `created_at` | string (timestamp with time zone) | non | — | `"now()"` |
| `updated_at` | string (timestamp with time zone) | non | — | `"now()"` |
| `ean` | string (text) | oui | — | — |
| `manufacturer_code` | string (text) | oui | — | — |
| `price_ht` | number (numeric) | oui | — | — |
| `price_ttc` | number (numeric) | oui | — | — |
| `tva_rate` | number (numeric) | oui | — | `20` |
| `eco_tax` | number (numeric) | oui | — | `0` |
| `eco_contribution` | number (numeric) | oui | — | `0` |
| `weight_kg` | number (numeric) | oui | — | — |
| `dimensions_cm` | string (text) | oui | — | — |
| `min_stock_alert` | integer (integer) | oui | — | `10` |
| `reorder_quantity` | integer (integer) | oui | — | `50` |
| `margin_percent` | number (numeric) | oui | — | — |
| `is_active` | boolean (boolean) | oui | — | `true` |
| `sku_interne` | string (text) | oui | — | — |
| `attributs` | (?) (jsonb) | non | — | — |
| `ref_softcarrier` | string (character varying) | oui | — | — |
| `ref_b2b` | string (character varying) | oui | — | — |
| `code_b2b` | integer (integer) | oui | — | — |
| `name_short` | string (character varying) | oui | — | — |
| `subcategory` | string (text) | oui | — | — |
| `brand` | string (text) | oui | — | — |
| `oem_ref` | string (character varying) | oui | — | — |
| `vat_code` | integer (smallint) | oui | — | `1` |
| `country_origin` | string (character varying) | oui | — | — |
| `is_end_of_life` | boolean (boolean) | oui | — | `false` |
| `is_special_order` | boolean (boolean) | oui | — | `false` |
| `customs_code` | string (character varying) | oui | — | — |
| `family` | string (text) | oui | — | — |
| `subfamily` | string (text) | oui | — | — |
| `cost_price` | number (numeric) | oui | — | — |
| `status` | string (text) | oui | — | `"active"` |
| `warranty_months` | integer (integer) | oui | — | — |
| `delivery_days` | integer (integer) | oui | — | — |
| `is_fragile` | boolean (boolean) | oui | — | `false` |
| `is_heavy` | boolean (boolean) | oui | — | `false` |
| `requires_special_shipping` | boolean (boolean) | oui | — | `false` |
| `manufacturer_ref` | string (text) | oui | — | — |
| `public_price_ttc` | number (numeric) | oui | — | — |
| `public_price_source` | string (text) | oui | — | — |
| `public_price_updated_at` | string (timestamp with time zone) | oui | — | — |
| `is_available` | boolean (boolean) | oui | — | `false` |
| `available_qty_total` | integer (integer) | oui | — | `0` |
| `availability_updated_at` | string (timestamp with time zone) | oui | — | — |
| `icecat_id` | integer (bigint) | oui | — | — |
| `icecat_enriched_at` | string (timestamp with time zone) | oui | — | — |
| `icecat_title` | string (text) | oui | — | — |
| `icecat_description` | string (text) | oui | — | — |
| `icecat_images` | (?) (jsonb) | non | — | — |
| `specifications` | (?) (jsonb) | non | — | — |
| `bullet_points` | array (text[]) | oui | — | — |
| `multimedia` | (?) (jsonb) | non | — | — |
| `reasons_to_buy` | (?) (jsonb) | non | — | — |
| `product_story_url` | string (text) | oui | — | — |
| `icecat_category` | string (text) | oui | — | — |
| `icecat_brand_logo` | string (text) | oui | — | — |
| `icecat_warranty` | string (text) | oui | — | — |
| `icecat_leaflet_url` | string (text) | oui | — | — |
| `icecat_manual_url` | string (text) | oui | — | — |
| `shopify_product_id` | string (text) | oui | — | — |
| `shopify_variant_id` | string (text) | oui | — | — |
| `shopify_inventory_item_id` | string (text) | oui | — | — |
| `shopify_synced_at` | string (timestamp with time zone) | oui | — | — |
| `slug` | string (text) | oui | — | — |
| `is_vendable` | boolean (boolean) | oui | — | `false` |

**Colonnes critiques e-commerce :**

| Rôle | Colonne(s) | État |
|---|---|---|
| identifiant (id/uuid) | `id` | ✅ |
| SKU / référence / EAN | `ean` | ✅ |
| nom / titre | `name` | ✅ |
| description courte | `description` | ✅ |
| description longue | — | ⚠️ |
| prix HT | `price`, `price_ht` | ✅ |
| prix TTC | `price_ttc`, `public_price_ttc` | ✅ |
| TVA | `tva_rate` | ✅ |
| stock | `stock_quantity`, `min_stock_alert` | ✅ |
| marque | `brand` | ✅ |
| slug | `slug` | ✅ |
| created_at | `created_at` | ✅ |
| updated_at | `updated_at` | ✅ |

✅ **Verdict B** : toutes les colonnes critiques sont présentes.

## Section C — Structure `categories`

Colonnes : **11**. Lignes : **494**.

| Colonne | Type | Nullable | FK |
|---|---|---|---|
| `id` | string (uuid) | non | — |
| `name` | string (text) | non | — |
| `slug` | string (text) | non | — |
| `level` | string (text) | non | — |
| `parent_id` | string (uuid) | oui | → `categories.id` |
| `description` | string (text) | oui | — |
| `image_url` | string (text) | oui | — |
| `sort_order` | integer (integer) | non | — |
| `is_active` | boolean (boolean) | non | — |
| `created_at` | string (timestamp with time zone) | non | — |
| `updated_at` | string (timestamp with time zone) | non | — |

- Hiérarchie : ✅ colonne `parent_id` (string (uuid))
- Relation produits : 🚨 aucune FK détectée

✅ **Verdict C** : structure catégories OK.

## Section D — Images produit

- Colonne image inline dans `products` : `image_url`, `icecat_images`, `multimedia`

### Table `crawl_images`
- Lignes : **0**
- Colonne URL : `page_url`
- FK vers `products` : ⚠️ aucune FK détectée

### Table `photo_order_items`
- Lignes : **1**
- Colonne URL : ⚠️ non identifiée
- FK vers `products` : ⚠️ aucune FK détectée

### Table `photo_orders`
- Lignes : **2**
- Colonne URL : ⚠️ non identifiée
- FK vers `products` : ⚠️ aucune FK détectée

### Table `photo_pricing`
- Lignes : **8**
- Colonne URL : ⚠️ non identifiée
- FK vers `products` : ⚠️ aucune FK détectée

### Table `product_images`
- Lignes : **48 298**
- Colonne URL : `url_originale`
- FK vers `products` : `product_id` → products.id
- Domaines observés (sur échantillon) :
  - `www.comlandi.fr` (500 URL)
- Exemples d'URLs :
  - `https://www.comlandi.fr/resources/img/products/multi/9171646_s2_5e067.jpg`
  - `https://www.comlandi.fr/resources/img/products/multi/9171646_s3_493ad.jpg`
  - `https://www.comlandi.fr/resources/img/products/multi/158211_s5_8f011.jpg`

### Table `service_photocopies_pricing`
- Lignes : **8**
- Colonne URL : ⚠️ non identifiée
- FK vers `products` : ⚠️ aucune FK détectée

### Table `service_photos_pricing`
- Lignes : **9**
- Colonne URL : ⚠️ non identifiée
- FK vers `products` : ⚠️ aucune FK détectée

**Taux de remplissage** : 12 370 / 141 040 produits ont au moins 1 image (**8.8 %**). Sans image : **128 670**.

**Stockage** : URLs externes (CDN non-Supabase détecté).

## Section E — Stocks

- Colonne stock inline dans `products` : `stock_quantity` (integer (integer))
- Table `product_stock_locations` : 7 lignes, 12 colonnes (`id`, `product_id`, `location_type`, `location_name`, `supplier_id`, `stock_quantity`, `min_stock_alert`, `reorder_point`, `last_inventory_date`, `notes`, `created_at`, `updated_at`)
- Table `stock_reception_items` : 0 lignes, 8 colonnes (`id`, `reception_id`, `product_id`, `purchase_order_item_id`, `expected_quantity`, `received_quantity`, `notes`, `created_at`)
- Table `stock_receptions` : 0 lignes, 8 colonnes (`id`, `purchase_order_id`, `reception_date`, `notes`, `received_by`, `created_at`, `status`, `reception_number`)
- Table `supplier_stock_snapshots` : 0 lignes, 5 colonnes (`id`, `ref_softcarrier`, `qty_available`, `delivery_week`, `fetched_at`)
- Table `temp_stock_update` : 24 749 lignes, 2 colonnes (`supplier_ref`, `qty`)
- Table `v_stock_virtuel` : 139 726 lignes, 14 colonnes (`product_id`, `product_name`, `ean`, `sku_interne`, `stock_propre`, `stock_boutique`, `stock_entrepot`, `stock_fournisseur`, `stock_fournisseurs_distant`, `stock_virtuel`, `seuil_alerte`, `quantite_reappro`, `statut_stock`, `nb_fournisseurs_actifs`)
- Distribution (sur échantillon de 7) : **0** à 0 · **6** entre 1 et 5 · **1** > 5

## Section F — Recherche full-text

⚠️ Aucune colonne `tsvector` / `search_vector` / `fts` détectée sur `products`.

Coût estimé pour ajouter : sur ~141 040 lignes, un `ALTER TABLE products ADD COLUMN search_vector tsvector` + `CREATE INDEX ... USING GIN` prend typiquement 10-60 s suivant la volumétrie.

ℹ️ *Les indexes GIN ne sont pas visibles via OpenAPI — vérification à faire côté Supabase Studio ou via une RPC custom.*

## Section G — Relations et contraintes

| De | Vers |
|---|---|
| `shopify_product_mapping.product_id` | → `products.id` |
| `price_snapshots.product_id` | → `products.id` |
| `price_snapshots.competitor_id` | → `competitors.id` |
| `supplier_products.supplier_id` | → `suppliers.id` |
| `supplier_products.product_id` | → `products.id` |
| `price_exceptions.product_id` | → `products.id` |
| `consumables.product_id` | → `products.id` |
| `pricing_simulation_items.simulation_id` | → `pricing_simulations.id` |
| `pricing_simulation_items.product_id` | → `products.id` |
| `pricing_simulation_items.rule_id` | → `pricing_ruleset_rules.id` |
| `crm_notes.account_id` | → `crm_accounts.id` |
| `crm_notes.entity_id` | → `crm_entities.id` |
| `crm_notes.contact_id` | → `crm_contacts.id` |
| `crm_notes.opportunity_id` | → `crm_opportunities.id` |
| `crm_notes.created_by` | → `crm_users.id` |
| `purchase_order_items.purchase_order_id` | → `purchase_orders.id` |
| `purchase_order_items.product_id` | → `products.id` |
| `purchase_order_items.supplier_product_id` | → `supplier_products.id` |
| `crm_import_errors.batch_id` | → `crm_import_batches.id` |
| `pricing_simulations.ruleset_id` | → `pricing_rulesets.id` |
| `product_reviews.product_id` | → `products.id` |
| `crm_email_accounts.account_id` | → `crm_accounts.id` |
| `product_lifecycle_logs.product_id` | → `products.id` |
| `crm_contacts.account_id` | → `crm_accounts.id` |
| `crm_contacts.entity_id` | → `crm_entities.id` |
| `crm_documents.account_id` | → `crm_accounts.id` |
| `crm_documents.entity_id` | → `crm_entities.id` |
| `crm_documents.opportunity_id` | → `crm_opportunities.id` |
| `crm_documents.uploaded_by` | → `crm_users.id` |
| `crm_quote_items.quote_id` | → `crm_quotes.id` |
| `crm_quote_items.product_id` | → `crm_products.id` |
| `price_adjustments.product_id` | → `products.id` |
| `price_adjustments.pricing_rule_id` | → `pricing_rules.id` |
| `b2b_grid_categories.grid_id` | → `b2b_price_grids.id` |
| `blog_seo_metadata.article_id` | → `blog_articles.id` |
| `crm_pipeline.profile_id` | → `profiles.id` |
| `reorder_suggestions.product_id` | → `products.id` |
| `school_lists.school_id` | → `schools.id` |
| `crm_pipelines.account_id` | → `crm_accounts.id` |
| `marketplace_sales.product_id` | → `products.id` |
| `product_volume_pricing.product_id` | → `products.id` |
| `b2b_company_users.account_id` | → `b2b_accounts.id` |
| `school_list_carts.upload_id` | → `school_list_uploads.id` |
| `crm_ai_logs.account_id` | → `crm_accounts.id` |
| `crm_ai_logs.entity_id` | → `crm_entities.id` |
| `crm_ai_logs.contact_id` | → `crm_contacts.id` |
| `crm_ai_logs.opportunity_id` | → `crm_opportunities.id` |
| `crm_ai_logs.ai_model_id` | → `crm_ai_models.id` |
| `crm_ai_logs.created_by` | → `crm_users.id` |
| `crm_email_templates.account_id` | → `crm_accounts.id` |
| `crm_tags.account_id` | → `crm_accounts.id` |
| `product_exceptions.product_id` | → `products.id` |
| `school_list_matches.upload_id` | → `school_list_uploads.id` |
| `school_list_matches.selected_product_id` | → `products.id` |
| `agent_logs.product_id` | → `products.id` |
| `b2b_reorder_templates.account_id` | → `b2b_accounts.id` |
| `crm_entities.account_id` | → `crm_accounts.id` |
| `crm_entities.source_id` | → `crm_sources.id` |
| `crm_entities.duplicate_of_entity_id` | → `crm_entities.id` |
| `crm_entities.created_by` | → `crm_users.id` |
| `crm_entities.updated_by` | → `crm_users.id` |
| `crawl_images.job_id` | → `crawl_jobs.id` |
| `crm_quotes.account_id` | → `crm_accounts.id` |
| `crm_quotes.entity_id` | → `crm_entities.id` |
| `crm_quotes.contact_id` | → `crm_contacts.id` |
| `crm_quotes.opportunity_id` | → `crm_opportunities.id` |
| `crm_quotes.created_by` | → `crm_users.id` |
| `import_jobs.supplier_id` | → `suppliers.id` |
| `crm_pipeline_stages.pipeline_id` | → `crm_pipelines.id` |
| `import_snapshots.job_id` | → `import_jobs.id` |
| `import_snapshots.product_id` | → `products.id` |
| `crm_opportunities.account_id` | → `crm_accounts.id` |
| `crm_opportunities.entity_id` | → `crm_entities.id` |
| `crm_opportunities.pipeline_id` | → `crm_pipelines.id` |
| `crm_opportunities.stage_id` | → `crm_pipeline_stages.id` |
| `crm_opportunities.created_by` | → `crm_users.id` |
| `crm_opportunities.assigned_to` | → `crm_users.id` |
| `b2b_invoices.account_id` | → `b2b_accounts.id` |
| `crawl_pages.job_id` | → `crawl_jobs.id` |
| `product_attributes.product_id` | → `products.id` |
| `crm_invoice_items.invoice_id` | → `crm_invoices.id` |
| `crm_invoice_items.product_id` | → `crm_products.id` |
| `menu_items.menu_id` | → `navigation_menus.id` |
| `menu_items.parent_id` | → `menu_items.id` |
| `crm_emails.account_id` | → `crm_accounts.id` |
| `crm_emails.entity_id` | → `crm_entities.id` |
| `crm_emails.contact_id` | → `crm_contacts.id` |
| `crm_emails.opportunity_id` | → `crm_opportunities.id` |
| `crm_emails.email_account_id` | → `crm_email_accounts.id` |
| `crm_emails.template_id` | → `crm_email_templates.id` |
| `crm_emails.created_by` | → `crm_users.id` |
| `stamp_designs.stamp_model_id` | → `stamp_models.id` |
| `printer_models.brand_id` | → `printer_brands.id` |
| `b2b_invoice_orders.invoice_id` | → `b2b_invoices.id` |
| `b2b_invoice_orders.order_id` | → `orders.id` |
| `school_list_items.list_id` | → `school_lists.id` |
| `customer_recommendations.product_id` | → `products.id` |
| `marketplace_product_mappings.product_id` | → `products.id` |
| `crm_rgpd_log.account_id` | → `crm_accounts.id` |
| `crm_rgpd_log.entity_id` | → `crm_entities.id` |
| `crm_rgpd_log.contact_id` | → `crm_contacts.id` |
| `crm_rgpd_log.performed_by` | → `crm_users.id` |
| `quotes.profile_id` | → `profiles.id` |
| `quotes.pipeline_id` | → `crm_pipeline.id` |
| `price_current.product_id` | → `products.id` |
| `price_current.best_competitor_id` | → `competitors.id` |
| `blog_comments.article_id` | → `blog_articles.id` |
| `b2b_interactions.prospect_id` | → `b2b_prospects.id` |
| `pricing_alerts.product_id` | → `products.id` |
| `blog_article_views.article_id` | → `blog_articles.id` |
| `crm_products.account_id` | → `crm_accounts.id` |
| `photo_order_items.order_id` | → `photo_orders.id` |
| `shopify_sync_log.product_id` | → `products.id` |
| `crm_settings.account_id` | → `crm_accounts.id` |
| `b2b_reorder_template_items.template_id` | → `b2b_reorder_templates.id` |
| `b2b_reorder_template_items.product_id` | → `products.id` |
| `compatibility_matrix.product_id` | → `products.id` |
| `compatibility_matrix.compatible_product_id` | → `products.id` |
| `b2b_budgets.account_id` | → `b2b_accounts.id` |
| `order_items.order_id` | → `orders.id` |
| `order_items.product_id` | → `products.id` |
| `competitor_prices.product_id` | → `products.id` |
| `crm_payments.account_id` | → `crm_accounts.id` |
| `crm_payments.invoice_id` | → `crm_invoices.id` |
| `crm_v_sales_summary.account_id` | → `crm_accounts.id` |
| `v_product_review_stats.product_id` | → `products.id` |
| `crm_v_pipeline_summary.account_id` | → `crm_accounts.id` |
| `crm_invoices.account_id` | → `crm_accounts.id` |
| `crm_invoices.entity_id` | → `crm_entities.id` |
| `crm_invoices.contact_id` | → `crm_contacts.id` |
| `crm_invoices.quote_id` | → `crm_quotes.id` |
| `crm_invoices.created_by` | → `crm_users.id` |
| `stock_receptions.purchase_order_id` | → `purchase_orders.id` |
| `crm_tasks.profile_id` | → `profiles.id` |
| `crm_tasks.pipeline_id` | → `crm_pipeline.id` |
| `crm_tasks.quote_id` | → `quotes.id` |
| `crm_interactions.account_id` | → `crm_accounts.id` |
| `crm_interactions.entity_id` | → `crm_entities.id` |
| `crm_interactions.contact_id` | → `crm_contacts.id` |
| `crm_interactions.opportunity_id` | → `crm_opportunities.id` |
| `crm_interactions.email_id` | → `crm_emails.id` |
| `crm_interactions.created_by` | → `crm_users.id` |
| `printer_consumable_links.printer_model_id` | → `printer_models.id` |
| `printer_consumable_links.consumable_id` | → `consumables.id` |
| `product_images.product_id` | → `products.id` |
| `b2b_accounts.price_grid_id` | → `b2b_price_grids.id` |
| `crm_ai_models.account_id` | → `crm_accounts.id` |
| `abandoned_carts.profile_id` | → `profiles.id` |
| `consumable_cross_selling.consumable_id` | → `consumables.id` |
| `consumable_cross_selling.related_consumable_id` | → `consumables.id` |
| `supplier_category_mappings.category_id` | → `categories.id` |
| `supplier_category_mappings.supplier_id` | → `suppliers.id` |
| `shipping_methods.zone_id` | → `shipping_zones.id` |
| `crm_users.account_id` | → `crm_accounts.id` |
| `v_supplier_offer_priority.product_id` | → `products.id` |
| `supplier_offers.product_id` | → `products.id` |
| `crm_import_batches.account_id` | → `crm_accounts.id` |
| `crm_import_batches.source_id` | → `crm_sources.id` |
| `customer_interactions.profile_id` | → `profiles.id` |
| `crm_entity_tags.entity_id` | → `crm_entities.id` |
| `crm_entity_tags.tag_id` | → `crm_tags.id` |
| `crm_ticket_messages.ticket_id` | → `crm_tickets.id` |
| `supplier_price_tiers.product_id` | → `products.id` |
| `import_job_rows.job_id` | → `import_jobs.id` |
| `import_job_rows.product_id` | → `products.id` |
| `import_mapping_templates.supplier_id` | → `suppliers.id` |
| `product_price_history.product_id` | → `products.id` |
| `product_price_history.supplier_id` | → `suppliers.id` |
| `price_changes_log.product_id` | → `products.id` |
| `price_changes_log.simulation_id` | → `pricing_simulations.id` |
| `price_changes_log.rollback_of` | → `price_changes_log.id` |
| `b2b_customer_grids.grid_id` | → `b2b_price_grids.id` |
| `purchase_orders.supplier_id` | → `suppliers.id` |
| `pricing_ruleset_rules.ruleset_id` | → `pricing_rulesets.id` |
| `categories.parent_id` | → `categories.id` |
| `pricing_insights.product_id` | → `products.id` |
| `crm_events.account_id` | → `crm_accounts.id` |
| `crm_events.entity_id` | → `crm_entities.id` |
| `crm_events.contact_id` | → `crm_contacts.id` |
| `crm_events.opportunity_id` | → `crm_opportunities.id` |
| `crm_events.created_by` | → `crm_users.id` |
| `supplier_import_logs.supplier_id` | → `suppliers.id` |
| `stock_reception_items.reception_id` | → `stock_receptions.id` |
| `stock_reception_items.product_id` | → `products.id` |
| `stock_reception_items.purchase_order_item_id` | → `purchase_order_items.id` |
| `crm_sources.account_id` | → `crm_accounts.id` |
| `product_seo.product_id` | → `products.id` |
| `product_stock_locations.product_id` | → `products.id` |
| `product_stock_locations.supplier_id` | → `suppliers.id` |
| `product_packagings.product_id` | → `products.id` |
| `crm_tickets.account_id` | → `crm_accounts.id` |
| `crm_tickets.entity_id` | → `crm_entities.id` |
| `crm_tickets.contact_id` | → `crm_contacts.id` |
| `crm_tickets.opportunity_id` | → `crm_opportunities.id` |
| `crm_tickets.assigned_to` | → `crm_users.id` |
| `crm_tickets.created_by` | → `crm_users.id` |
| `competitor_product_map.product_id` | → `products.id` |
| `competitor_product_map.competitor_id` | → `competitors.id` |

ℹ️ *Indexes secondaires et contraintes UNIQUE non-PK : invisibles via OpenAPI.*

## Section H — RLS (test comportemental avec clé anon)

| Table | Accès anon | Détail |
|---|---|---|
| `products` | ✅ | 1 ligne visible |
| `categories` | ✅ | 1 ligne visible |
| `crawl_images` | ✅ | 0 ligne visible |
| `photo_order_items` | ✅ | 0 ligne visible |
| `photo_orders` | ✅ | 0 ligne visible |
| `photo_pricing` | ✅ | 1 ligne visible |
| `product_images` | ✅ | 1 ligne visible |
| `service_photocopies_pricing` | ✅ | 1 ligne visible |
| `service_photos_pricing` | ✅ | 1 ligne visible |
| `product_stock_locations` | ✅ | 1 ligne visible |
| `stock_reception_items` | ✅ | 0 ligne visible |
| `stock_receptions` | ✅ | 0 ligne visible |
| `supplier_stock_snapshots` | ✅ | 0 ligne visible |
| `temp_stock_update` | ✅ | 1 ligne visible |
| `v_stock_virtuel` | ✅ | 1 ligne visible |

✅ **Verdict H** : anon peut SELECT sur toutes les tables catalogue.

## Recommandations — pré-Phase 2

- ⚠️ **Ajouter une colonne `search_vector` tsvector + index GIN** pour la recherche full-text performante.
- 🚨 **Fill rate images à 8.77 %** — 128 670 produits sans image sur 141 040. Impact direct sur la Phase 2 (catalogue / fiche produit) : stratégie placeholder à définir, ou filtrer `is_vendable` côté requête publique.

**À clarifier avec Élie :**
- Fréquence réelle de la synchro Comlandi (nightly attendu)
- Stratégie si un produit n'a aucune image (placeholder ? filtrage du catalogue public ?)
- Si le slug doit être généré côté Postgres (trigger) ou côté app (au moment du sync)

## Migration SQL proposée (NON appliquée)

```sql
-- 2. Full-text search (français)
ALTER TABLE products ADD COLUMN search_vector tsvector;
CREATE INDEX products_search_vector_idx ON products USING GIN (search_vector);
-- Populate : à faire en batch, colonne cible à ajuster selon schéma réel
-- UPDATE products SET search_vector = to_tsvector('french', coalesce(name, '') || ' ' || coalesce(description, ''));

```

> **Ne pas exécuter sans validation d'Élie.** Tester d'abord en dev (branche Supabase preview).
