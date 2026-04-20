# Architecture — ma-papeterie-v1

## Vue d'ensemble

Astro SSR sur Netlify, backend Supabase Pro existant, commerce via Shopify Storefront API. Aucun admin custom : Supabase Studio + Shopify Admin font le job.

```
                         ┌──────────────────────────────┐
                         │   Navigateur (mobile-first)  │
                         │  Astro SSR rendered HTML     │
                         │  + React islands (client:*)  │
                         └──────────────┬───────────────┘
                                        │ HTTPS
                                        ▼
                         ┌──────────────────────────────┐
                         │   Netlify (ma-papeterie-v1)  │
                         │   Astro @astrojs/netlify SSR │
                         │   CDN + edge headers         │
                         └──────┬───────┬───────┬───────┘
                                │       │       │
                    ┌───────────┘       │       └─────────────┐
                    ▼                   ▼                     ▼
         ┌─────────────────┐ ┌────────────────────┐ ┌──────────────────┐
         │   Supabase Pro  │ │  Shopify Storefront│ │     Brevo API    │
         │  Postgres + RLS │ │   API (GraphQL)    │ │  Transac emails  │
         │  Auth + Storage │ │  Cart + Checkout   │ │  Newsletter (V2) │
         │  Edge Functions │ │                    │ │                  │
         └─────────────────┘ └────────────────────┘ └──────────────────┘
                  ▲
                  │ Cron quotidien (existant)
                  │
         ┌─────────────────┐
         │  SFTP Liderpapel│
         │ (sync produits) │
         └─────────────────┘
```

## Couches

### Rendu

- **Astro SSR** (`output: 'server'`) : toutes les pages sont rendues à la demande sauf les assets statiques (`/robots.txt`, fonts, images).
- **React islands** : composants interactifs isolés (panier, upload liste, search auto-complete en Phase 2).
- **Prefetch viewport** : Astro préfetch les liens visibles dans le viewport — navigation perçue quasi-instantanée.

### Data

- **Supabase** (existant, Pro) : source de vérité produits/stocks/catégories/devis B2B/listes scolaires.
  - Clients : `@/lib/supabase` (serveur, service role) et `@/lib/supabase-browser` (anon, RLS).
  - Types : `src/types/database.ts` — régénérés via `npm run gen:types`.
- **Shopify Storefront API** : panier, checkout, inventaire vendable.
  - Client : `@/lib/shopify` (`shopifyFetch<T>`).
  - Types : `src/types/shopify.ts` (stubs, codegen en Phase 2).

### Commerce

- **Panier** Zustand local (`@/stores/cartStore`) avec persist `localStorage`, sync Shopify Cart (Storefront API) en Phase 2.
- **Checkout** 100% Shopify hosted — aucune redev paiement.
- **POS** Shopify POS : stock temps réel, sync bidirectionnelle (Phase J13–J14).

### Email

- **Brevo** (`@/lib/brevo`) : emails transactionnels (confirmation devis B2B, contact).

### Auth

- **Supabase Auth** (Phase 2, F6) : email + password, flag `is_pro` + SIRET pour B2B.
- Store session : `@/stores/authStore` (stub en V1).

## Flux critiques

### 1. Page produit rendue (Phase 2)

```
Browser → Netlify → Astro SSR page.astro
                       │
                       ├── Supabase.from('products').single()
                       ├── Supabase.from('product_stocks').select()
                       └── Shopify products(handle) [prix variants + dispo]
                    ↓
                    HTML + JSON-LD Product schema
```

### 2. Ajout panier (Phase 2)

```
Click "Ajouter" → React island → Zustand addItem()
                                    ↓
                                 Shopify cartLinesAdd(cartId, lines)
                                    ↓
                                 maj store cartCount (badge header)
```

### 3. Devis B2B (Phase 2)

```
Form submit → API route Astro → Supabase insert b2b_quotes
                                    ↓
                                 Brevo sendTransactionalEmail (notif Élie)
                                    ↓
                                 Redirect /devis/confirmation
```

## Sécurité

- `SUPABASE_SERVICE_ROLE_KEY` : **jamais** exposé au browser — uniquement `@/lib/supabase`.
- RLS Supabase actif sur toutes les tables (lecture publique produits, écriture auth).
- Headers sécurité baseline dans `netlify.toml` (HSTS, X-Frame, Referrer-Policy, Permissions-Policy). CSP strict à finaliser en Phase 2 après audit des scripts tiers.
- Secrets : `.env.local` gitignored, valeurs de prod saisies dans Netlify UI.

## Performance

- **Budget** `main.js < 50 KB gzipped` sur la home.
- `inlineStylesheets: 'auto'` + `compressHTML: true`.
- Fonts self-hostées (pas de CDN Google) — bonus RGPD + bonus LCP.
- `@fontsource` subset via Vite → chargement minimal.

## Observabilité

- **`/api/health`** : endpoint JSON statut Supabase + Shopify.
- **Shopify Analytics** : dashboard commerce (remplace un dashboard custom).
- **Netlify Analytics** : trafic (optionnel, payant).
- **Supabase logs** : erreurs DB + RLS.

## Édition produit

Tous les chemins admin passent par les UI existantes :

- Fiches produit / catégories / stocks → **Supabase Studio**.
- Prix vendables / promos / checkout → **Shopify Admin**.
- Emails / templates → **Brevo Dashboard**.

Pas d'UI admin custom en V1 (règle SPEC §5).
