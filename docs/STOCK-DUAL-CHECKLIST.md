# Stock dual + sales_channel — checklist déploiement

V2.1 BACKLOG. Sépare le stock vendable en ligne (`stock_online`) du stock POS boutique (`stock_boutique`) et masque les produits POS-only (`sales_channel = 'pos'`) du catalogue web.

## Vue d'ensemble

| PR     | Objet                                                              | Status   |
| ------ | ------------------------------------------------------------------ | -------- |
| `#196` | Migration DB (colonnes + trigger + view) + lecture catalogue/fiche | ✅ mergé |
| `#197` | Sync Shopify multi-location (script + workflow)                    | ✅ mergé |
| `#198` | Doc + checklist post-déploiement (cette PR)                        | ✅ mergé |

Webhook quasi temps-réel (RPO < 60 s) reste backloggé pour V2.2 — trade-off RPO ~24 h via cron nightly accepté pour V2.1.

## Séquence Élie post-merge

### 1. Appliquer la migration Supabase

Coller le contenu de [`supabase/migrations/20260504140000_stock_dual_sales_channel.sql`](../supabase/migrations/20260504140000_stock_dual_sales_channel.sql) dans Supabase Studio → SQL Editor → Run.

La migration est **idempotente** — peut tourner plusieurs fois sans casse (`ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE`, backfill conditionnel).

Vérifications post-application :

```sql
-- Trigger en place ?
SELECT tgname FROM pg_trigger
 WHERE tgrelid = 'public.products'::regclass
   AND tgname = 'trg_enforce_stock_dual';
-- attendu : 1 ligne

-- Distribution canaux après backfill (tous 'both' au démarrage)
SELECT sales_channel, count(*) FROM public.products GROUP BY 1;
-- attendu : majorité 'both', 0 'pos'

-- Cohérence stock_online ↔ stock_quantity
SELECT count(*) FROM public.products WHERE stock_quantity != stock_online;
-- attendu : 0 (le trigger force l'égalité à chaque write — peut être > 0
-- pour les rows backfillées qui n'ont pas encore re-trigger; un
-- UPDATE products SET id = id touchera tout, mais 141k rows = lourd, OK
-- de laisser converger naturellement au prochain sync)

-- POS-only ne peut pas avoir de stock_online
SELECT count(*) FROM public.products
 WHERE sales_channel = 'pos' AND stock_online > 0;
-- attendu : 0
```

### 2. Récupérer les Location IDs Shopify

Dans Shopify Admin → Apps → Headless / Custom App → API GraphQL Explorer (ou via curl) :

```graphql
{
  locations(first: 5) {
    edges {
      node {
        id # → "gid://shopify/Location/87345332468"
        name # → "Boutique Chaumont" / "POS Chaumont"
        isActive
        fulfillsOnlineOrders
      }
    }
  }
}
```

Identifier :

- `SHOPIFY_LOCATION_ONLINE_ID` = location qui `fulfillsOnlineOrders = true` (vraisemblablement le warehouse/back-office)
- `SHOPIFY_LOCATION_POS_ID` = location physique POS (le magasin Chaumont si tu as 2 entités distinctes Shopify)

⚠️ **Si tu n'as qu'une seule location Shopify aujourd'hui** (cas probable selon ton historique), tu dois d'abord créer la deuxième dans Shopify Admin → Settings → Locations → Add location, puis l'activer pour POS uniquement.

Format des secrets : juste l'ID numérique (87345332468), pas le `gid://...`. Le script préfixe automatiquement.

### 3. Provisionner les secrets GitHub Actions

```bash
gh secret set SHOPIFY_LOCATION_ONLINE_ID --body=<id_numérique_online>
gh secret set SHOPIFY_LOCATION_POS_ID --body=<id_numérique_pos>
```

(Tu peux aussi le faire via UI : https://github.com/Neo52000/ma-papeterie-v1/settings/secrets/actions)

L'ancien `SHOPIFY_LOCATION_ID` reste lu en fallback de `_ONLINE_` — tu peux le laisser tant que la transition n'est pas finie, puis le supprimer une fois `_ONLINE_` confirmé OK.

### 4. Test dry-run sur 5 produits

```bash
gh workflow run shopify-sync.yml -f mode=stale -f max=5
```

Suivre le run dans Actions. Le banner doit afficher :

```
Location ONLINE    : gid://shopify/Location/<online_id>
Location POS       : gid://shopify/Location/<pos_id>
```

Vérifier dans Shopify Admin → Inventory que `stock_online` apparaît bien sur la location ONLINE et `stock_boutique` sur la POS pour les 5 produits poussés.

### 5. Curate les produits POS-only

Dans Supabase Studio → Table editor → `products`, marquer en `sales_channel = 'pos'` les produits qui ne doivent jamais apparaître côté site (services, vrac, articles à pas de code-barres). Dès qu'ils sont marqués :

- Le trigger force `stock_online = 0`.
- Le catalogue les exclut (filter `IN ('online','both')`).
- Leur fiche directe `/produit/<slug>` renvoie 404.
- Le prochain sync Shopify ne les pousse plus vers le storefront Headless.

### 6. Activer le cron nightly multi-location

Le workflow tourne déjà chaque nuit 03:00 UTC. Aucune action — la prochaine run consommera les nouveaux secrets et fera le push dual.

## Pourquoi pas SF2 (webhook quasi temps-réel) en V2.1

BACKLOG-V2 §« Stock dual & sales_channel — détail » §SF2 décrit une approche Edge Functions Deno + webhook `inventory_levels/update` qui aurait amené le RPO à < 60 s côté boutique. **Reportée à V2.2** car :

- Aucune Edge Function n'existe aujourd'hui dans ce projet — setup Deno + secrets Supabase + pipeline deploy = ~1.5j supplémentaire.
- Le besoin RPO < 60 s n'est pas démontré tant que le volume POS de la boutique reste limité (ouverture probablement progressive).
- SF1 cron 5 min serait un compromis intermédiaire mais déclenche déjà 288 runs/jour pour gain marginal versus nightly. Si on en arrive là, autant directement faire SF2.

À reprendre quand : (a) la boutique POS génère assez de ventes pour que le RPO 24 h cause un oversell observable côté site, ou (b) Élie demande explicitement le quasi temps-réel.

## Réversibilité

Si la couche stock dual cause un problème en prod :

```sql
-- Désactive uniquement le filtre catalogue (les colonnes restent)
-- en re-créant fetchCatalogue / fetchProductBySlug sans le .in()
-- Faisable via une PR rollback côté code, sans toucher la DB.

-- Pour revert le trigger (ne supprime pas les colonnes) :
DROP TRIGGER IF EXISTS trg_enforce_stock_dual ON public.products;
```

Les colonnes peuvent rester en place sans impact — sans le trigger, elles sont juste inertes.
