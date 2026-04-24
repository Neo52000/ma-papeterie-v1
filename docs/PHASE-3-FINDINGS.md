# Phase 3 Shopify — Jour 1 (2026-04-23)

## Livré

- Token Storefront API opérationnel (shop query + products query OK)
- Token Admin API opérationnel avec scope `write_publications` après réinstall app custom
- Migration alignment colonnes `shopify_product_id`, `shopify_variant_id`, `shopify_inventory_item_id`, `shopify_synced_at`
- Script `scripts/shopify-import-test.mjs` créé
- 10 produits test créés dans Shopify (avec bugs à fixer)

## Bugs identifiés à résoudre lundi

1. **Prix Shopify = 88 €** (`public_price_ttc`) au lieu de **64 €** (logique `lib/pricing.ts`)
   → Solution : RPC `compute_display_price` (préparée, non déployée)
2. **Stock 0 au lieu de 100** : `inventoryActivate(available:)` déprécié API 2025-01
   → Solution : `inventorySetOnHandQuantities` mutation séparée
3. **Publication** : pas de canal "Headless" trouvé via `publications` GraphQL
   → 4 publications détectées :
     - Online Store (`175324004596`)
     - Point of Sale (`175324070132`)
     - Shop (`175324102900`)
     - Papeterie Reine & Fils (`184801689844`)
   → Clarifier lundi : canal Headless visible dans sidebar Shopify Admin = quelle publication API ?

## Plan lundi matin (30-45 min)

1. Identifier le canal de publication correct (cliquer sur "Headless" dans sidebar Shopify Admin, noter l'URL/ID)
2. Appliquer migration RPC `compute_display_price`
3. Supprimer les 10 produits buggés via `productDelete`
4. Patcher le script : RPC pour prix + `inventorySetOnHandQuantities` pour stock + bon Publication ID
5. Re-run import from clean slate
6. Valider visuellement Shopify Admin (prix, stock, canal)
7. Commit + PR + merge

## Ce qu'on ne commit PAS aujourd'hui

- PR non mergée : les 10 produits Shopify sont buggés, on ne veut pas intégrer un script cassé
