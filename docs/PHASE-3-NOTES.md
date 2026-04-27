# PHASE 3 — Notes de reprise

> Items identifiés en fin de Phase 1 à traiter en début de Phase 3 (panier / checkout).

## 🔴 Shopify Storefront API — token / channel KO

### Symptôme

`/api/health` renvoie `statut: "degraded"` (HTTP 207) : Supabase `ok:true`, Shopify `ok:false`.

Dernier message observé côté endpoint :

```
Shopify Storefront error: GraphQL Client: Not Found
```

### Diagnostic effectué (Phase 1)

Tests directs via `curl` contre le domaine réel `ma-papeterie-pro-boutique-hcd1j.myshopify.com` :

| Test                                                    | Résultat                                                                                             | Lecture                                               |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `HEAD /`                                                | `302 → /password` avec headers Shopify complets (`powered-by: Shopify`, `theme;desc="155829043444"`) | Boutique existe, theme installé, password page active |
| `POST /api/2025-01/graphql.json` avec token `shpss_...` | `401 UNAUTHORIZED` (message vide)                                                                    | Token rejeté par le store                             |
| `POST /api/2025-01/graphql.json` sans token             | `400 "Online Store channel is locked."`                                                              | Canal Online Store verrouillé                         |

### Actions à faire en Phase 3

Admin Shopify → `https://admin.shopify.com/store/ma-papeterie-pro-boutique-hcd1j/settings/apps/development`

1. **Custom app → Storefront API** : cocher au minimum les scopes suivants :
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_inventory`
   - `unauthenticated_read_product_tags`
   - `unauthenticated_read_selling_plans` (optionnel, pour abonnements)
2. **Installer l'app** → copier le nouveau **Storefront API access token**.
3. Remplacer `PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN` dans `.env.local` (et dans les env vars Netlify).
4. **Settings → Sales channels** : vérifier que "Online Store" est présent et activé. Sans ce channel, la Storefront API reste limitée/verrouillée.
5. Re-tester `curl http://localhost:4321/api/health` → attendu `statut: "ok"`.

### Notes

- Le préfixe `shpss_` est le bon format pour un Storefront token (legacy). Pas besoin de migrer vers `shpat_` (qui est réservé aux Admin API).
- Le domaine a été corrigé en fin de Phase 1 : `ma-papeterie.myshopify.com` → `ma-papeterie-pro-boutique-hcd1j.myshopify.com`.
- Le TODO correspondant est inline dans `src/pages/api/health.ts` au-dessus du bloc `try` Shopify — supprimer le commentaire une fois le fix validé.
