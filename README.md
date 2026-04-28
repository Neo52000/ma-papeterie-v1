# ma-papeterie-v1

Astro 4 SSR + React 18 + Supabase + Shopify Storefront — V1 production de **ma-papeterie.fr**.

Boutique physique à Chaumont (52) + e-commerce B2C/B2B, propriétaire : Élie Reine (Reine & Fils).

> Scope V1 figé par [`docs/SPEC-V1.md`](./docs/SPEC-V1.md). Toute idée hors scope → [`BACKLOG-V2.md`](./BACKLOG-V2.md).
> Cutover D+16 : [`docs/CUTOVER-CHECKLIST.md`](./docs/CUTOVER-CHECKLIST.md).

## État V1 (snapshot 2026-04-28)

| Feature                                                      | Statut                   | Page(s)                                                                                      |
| ------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------- |
| F1 — Home                                                    | ✅ live                  | `/`                                                                                          |
| F2 — Catalogue + facets dynamiques (304 cats / 401 marques)  | ✅ live                  | `/catalogue`, `/catalogue/[category]`                                                        |
| F3 — Fiche produit (Schema.org Product, breadcrumb, related) | ✅ live                  | `/produit/[slug]`                                                                            |
| F4 — Panier / checkout (Shopify Storefront, drawer, /merci)  | ✅ E2E payé              | header → drawer → checkout Shopify                                                           |
| F5 — Liste scolaire (matcher live + waitlist 2026-27)        | ✅ live                  | `/liste-scolaire`                                                                            |
| F6 — Compte client (auth Supabase, dashboard, orders)        | ✅ live                  | `/connexion`, `/inscription`, `/compte`                                                      |
| F7 — Devis B2B (form + endpoint + Brevo notif)               | ✅ live                  | `/devis`                                                                                     |
| F8 — Légal + SEO local                                       | ✅ avec `[à compléter]`  | `/mentions-legales`, `/cgv`, `/confidentialite`, `/cookies`, `/contact`, `/livraison-retour` |
| Header autocomplete search                                   | ✅ FTS                   | dropdown desktop                                                                             |
| Webhook orders Shopify → Supabase + Brevo notif              | ✅ HMAC verify           | `/api/webhooks/shopify-order`                                                                |
| Sync incrémental Supabase → Shopify (CLI + cron nightly)     | ✅ workflow              | `scripts/shopify-sync-products.mjs`, `.github/workflows/shopify-sync.yml`                    |
| Cart session tracking                                        | ✅ table `cart_sessions` | `/api/cart/track`                                                                            |
| Polish a11y + perf (WCAG AA / Lighthouse)                    | ✅ batch 1               | —                                                                                            |

## Stack

| Couche      | Techno                                                                         |
| ----------- | ------------------------------------------------------------------------------ |
| Frontend    | Astro 4.16 (SSR via `@astrojs/netlify`) + React 18 islands + TypeScript strict |
| Styling     | Tailwind 3.4 (tokens **identiques v5**) + composants helpers `global.css`      |
| State       | Zustand (cart, persist localStorage `mapap-cart-v1`)                           |
| Backend     | Supabase Pro (projet `mgojmkzovqgpipybelrr`, partagé avec d'autres repos)      |
| E-commerce  | Shopify Storefront API (cart, checkout) + Admin API (sync produits)            |
| Email       | Brevo transactionnel                                                           |
| Hébergement | Netlify (`ma-papeterie-v1.netlify.app` → `ma-papeterie.fr` au cutover)         |

## Quickstart

```bash
git clone git@github.com:Neo52000/ma-papeterie-v1.git && cd ma-papeterie-v1
cp .env.example .env.local   # remplir les 8 variables
npm install
npm run dev                  # http://localhost:4321
```

## Scripts

| Script                                                                           | Rôle                                                                  |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                                                                    | Serveur dev Astro                                                     |
| `npm run build`                                                                  | Build production                                                      |
| `npm run preview`                                                                | Preview du build local                                                |
| `npm run typecheck`                                                              | `astro check` strict                                                  |
| `npm run lint`                                                                   | Prettier check                                                        |
| `npm run format`                                                                 | Prettier write                                                        |
| `node --env-file=.env.local scripts/shopify-sync-products.mjs --dry-run --max=5` | Sync incrémental Supabase → Shopify (cf script header pour les flags) |

## Variables d'environnement

Toutes dans `.env.example`, typées dans `src/env.d.ts` :

- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_SHOPIFY_STOREFRONT_DOMAIN`, `PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- `BREVO_API_KEY`
- `SHOPIFY_WEBHOOK_SECRET` (généré par Shopify Admin → Notifications → Webhooks)
- `PUBLIC_SITE_URL`

Pour le script de sync (CLI hors-Astro), il faut en plus dans `.env.local` :
`SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_ADMIN_API_VERSION`, `SHOPIFY_HEADLESS_PUBLICATION_ID`, `SUPABASE_URL`.

## Endpoints API

| Endpoint                                                                                          | Méthode      | Rôle                                                         |
| ------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------ |
| `/api/health`                                                                                     | GET          | Status Supabase + Shopify (ping `shop` query)                |
| `/api/products/search`                                                                            | GET          | Autocomplete header (FTS, debounce client)                   |
| `/api/cart/track`                                                                                 | POST         | Track cart session (fire-and-forget depuis cartStore)        |
| `/api/me/orders`                                                                                  | GET (Bearer) | Orders Shopify de l'utilisateur connecté (auth Supabase)     |
| `/api/webhooks/shopify-order`                                                                     | POST         | Réception ordres Shopify (HMAC verify, upsert + Brevo notif) |
| `/api/liste-scolaire/match`                                                                       | POST         | Match texte → produits FTS pour le matcher                   |
| `/api/inscription-liste-scolaire`                                                                 | POST (form)  | Waitlist liste scolaire 2026-27 → Brevo                      |
| `/api/demande-devis`                                                                              | POST (form)  | Devis B2B → table `b2b_quotes` + Brevo                       |
| `/sitemap-index.xml`, `/sitemap-static.xml`, `/sitemap-categories.xml`, `/sitemap-products-N.xml` | GET          | Sitemaps SEO                                                 |

## Design System

Tokens **strictement identiques v5**, jamais modifier sans validation explicite. Voir [`docs/DESIGN-SYSTEM.md`](./docs/DESIGN-SYSTEM.md).

- Palette : `primary #121c2a`, `accent #fd761a`, `bg-soft #fafaf9`
- Fonts : Poppins (display) + Inter (body), **self-hosted** via `@fontsource` (RGPD, no Google CDN)
- Radius : card `1rem`, badge `0.4rem`, btn `0.5rem`

## Déploiement & cutover

- Site staging : <https://ma-papeterie-v1.netlify.app>
- Cutover D+16 vers `ma-papeterie.fr` : procédure complète dans [`docs/CUTOVER-CHECKLIST.md`](./docs/CUTOVER-CHECKLIST.md) (Shopify, Netlify, GH secrets, DNS, légal, post-cutover).
- L'ancien site Lovable reste live sur `ma-papeterie.fr` jusqu'au swap DNS — **ne pas y toucher**.

## Assets manuels dans `public/`

- `favicon.ico` (récupéré ancien repo ou via realfavicongenerator.net)
- `og-default.png` 1200×630 (logo sur fond blanc)
- `placeholder-product.svg` (déjà présent)

## Documentation

- [`docs/SPEC-V1.md`](./docs/SPEC-V1.md) — scope figé V1 (8 features autorisées)
- [`docs/CUTOVER-CHECKLIST.md`](./docs/CUTOVER-CHECKLIST.md) — actions humaines pré/pendant cutover
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — schéma Astro + Supabase + Shopify
- [`docs/DESIGN-SYSTEM.md`](./docs/DESIGN-SYSTEM.md) — tokens, composants helpers
- [`docs/DNS-CUTOVER.md`](./docs/DNS-CUTOVER.md) — détail DNS swap
- [`docs/PHASE-2-FINDINGS.md`](./docs/PHASE-2-FINDINGS.md), [`docs/PHASE-3-FINDINGS.md`](./docs/PHASE-3-FINDINGS.md) — décisions techniques
- [`docs/RLS-HARDENING-PLAN.md`](./docs/RLS-HARDENING-PLAN.md) — plan sécurité RLS
- [`CLAUDE.md`](./CLAUDE.md) — règles d'or pour les assistants IA travaillant sur ce repo

## Licence

Propriétaire — usage interne Ma Papeterie uniquement.
