# Intégration Alkor — Phase C

> Statut : **fondation posée, intégration en attente des specs Alkor**.
> Migration `products.supplier` + `supplier_sku` livrée. Adapter `lib/suppliers/alkor.ts` stub.

## Pourquoi Alkor

Alkor est un grossiste fournitures bureau (concurrent / complémentaire de Comlandi). L'objectif est de pouvoir :

1. **Importer leur catalogue** dans `public.products` à côté des produits Comlandi
2. **Envoyer les commandes** Shopify reçues sur des produits Alkor au format EDI Alkor (au lieu de les transmettre manuellement)

## Ce qui est déjà en place

- `products.supplier` (text, default `'comlandi'`) avec check `IN ('comlandi', 'alkor', 'manual')`
- `products.supplier_sku` (text nullable) — clé de réconciliation lors des syncs
- Index sur `(supplier, supplier_sku)` pour upserts rapides
- `src/lib/suppliers/alkor.ts` stub avec interfaces TypeScript prêtes

## Ce qui manque côté Élie pour avancer

### 1. Credentials sandbox Alkor

- Comment se connecter à leur API ? (HTTP REST ? SOAP ? SFTP drop ?)
- URL endpoint
- Token / login / password
- Doc d'authentification

### 2. Schéma XML / EDI

Alkor utilise quoi comme format d'échange ? Probablement l'un de :

- **EDIFACT** (norme ONU, format texte structuré : `UNH+1+ORDERS:D:96A:UN'`)
- **XML propriétaire** (DTD ou XSD à fournir)
- **CSV bricolé** (peu probable pour un grossiste B2B)

→ Demander à Alkor un fichier exemple :

- 1 catalogue produit (PRICAT EDIFACT ou catalogue.xml)
- 1 commande (ORDERS EDIFACT ou order.xml)
- 1 confirmation (ORDRSP / response.xml)

### 3. Mapping champs Alkor → Supabase products

Quand on aura un fichier exemple, on alignera :

| Champ Alkor (à confirmer) | Champ `products`   |
| ------------------------- | ------------------ |
| `ProductCode` / `EAN`     | `ean`              |
| `Description`             | `name`             |
| `Brand` / `Manufacturer`  | `brand`            |
| `Category`                | `category`         |
| `NetPrice` / `CostPrice`  | `cost_price`       |
| `RetailPrice`             | `public_price_ttc` |
| `VATRate`                 | `tva_rate`         |
| `StockQty`                | `stock_quantity`   |
| `ImageURL`                | `image_url`        |
| `?`                       | `supplier_sku`     |

## Roadmap suite

1. ✅ Migration `supplier` + `supplier_sku` (livré)
2. ⏳ **Spec Alkor reçue** — Élie remplit le doc avec exemples
3. ⏳ `parseAlkorCatalogue(xml) → AlkorProductSource[]` — implémentation parser
4. ⏳ Script `scripts/alkor-import.mjs` — fetch + parse + upsert
5. ⏳ GitHub Actions cron quotidien (mirror `shopify-sync.yml`)
6. ⏳ Webhook Shopify `orders/paid` filtre les line_items avec `supplier='alkor'` → genère + envoie XML commande Alkor
7. ⏳ Réception confirmations Alkor (ORDRSP) → met à jour `shopify_orders.fulfillment_status`

## Risques connus

- **Doublons** : un EAN peut exister à la fois Comlandi et Alkor. Stratégie : upsert sur `(supplier, supplier_sku)` puis post-traitement pour merger les doublons EAN si pertinent (rare en pratique car catalogues spécialisés).
- **Concurrence prix** : si un produit a 2 sources, on garde celle dont le `cost_price` est le plus bas. À décider avec Élie.
- **Stock split** : si on commande 50× sur Alkor mais qu'on en a 30 en stock Comlandi, le stock affiché doit être la SOMME (à confirmer business).

## Test plan post-implémentation

- [ ] Import catalogue Alkor sandbox → 100 produits fictifs créés en DB
- [ ] Vérifier que `is_vendable` + filtres existing tiennent le coup
- [ ] Commande test sur produit `supplier='alkor'` → XML envoyé + accusé reçu
- [ ] Webhook ORDRSP simulé → `shopify_orders.fulfillment_status` mis à jour
- [ ] Production : 1 commande réelle E2E avant ouverture grand public
