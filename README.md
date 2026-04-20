# ma-papeterie-v1

Nouveau repo Astro SSR pour **ma-papeterie.fr** — fondation V1 production-ready.

Boutique physique à Chaumont (52) + e-commerce B2C/B2B, propriétaire : Élie Reine (Reine & Fils).

> Scope V1 figé par [`docs/SPEC-V1.md`](./docs/SPEC-V1.md). Toute idée hors scope → [`BACKLOG-V2.md`](./BACKLOG-V2.md).

## Stack

| Couche | Techno |
|---|---|
| Frontend | Astro 4.16 (SSR via `@astrojs/netlify`) + React 18 islands + TypeScript strict |
| Styling | Tailwind 3.4 + shadcn/ui (tokens **identiques v5**) |
| State | Zustand (panier, session) |
| Backend | Supabase Pro (existant, non recréé) |
| E-commerce | Shopify Storefront API + Shopify POS |
| Email | Brevo |
| Hébergement | Netlify (nouveau site dédié : `ma-papeterie-v1.netlify.app`) |

## Quickstart

```bash
# 1. Clone
git clone git@github.com:Neo52000/ma-papeterie-v1.git && cd ma-papeterie-v1

# 2. Env
cp .env.example .env.local
# → remplir les 7 variables (Supabase × 3, Shopify × 2, Brevo, SITE_URL)

# 3. Install
npm install

# 4. Dev (http://localhost:4321)
npm run dev

# 5. Production build
npm run build
npm run preview
```

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur dev Astro |
| `npm run build` | Build production |
| `npm run preview` | Preview du build local |
| `npm run typecheck` | `astro check` strict |
| `npm run lint` | Prettier check |
| `npm run format` | Prettier write |
| `npm run gen:types` | Régénère `src/types/database.ts` depuis Supabase CLI |

## Variables d'environnement

7 variables, toutes listées dans `.env.example` :

- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_SHOPIFY_DOMAIN`, `PUBLIC_SHOPIFY_STOREFRONT_TOKEN`
- `BREVO_API_KEY`
- `PUBLIC_SITE_URL`

Typées strictement dans `src/env.d.ts`.

## Endpoint santé

`GET /api/health` → JSON status Supabase + Shopify. Attendu : `200` avec les deux `ok: true`.

## Design System

Tokens strictement identiques à la v5 — voir [`docs/DESIGN-SYSTEM.md`](./docs/DESIGN-SYSTEM.md).

- **Palette** : `primary #121c2a`, `accent #fd761a`, `bg-soft #fafaf9`
- **Fonts** : Poppins (headings) + Inter (body), **self-hosted** via `@fontsource` (RGPD)
- **Radius** : `card 1rem` · `badge 0.4rem` · `btn 0.5rem`
- **Shadows** : `0 20px 40px rgba(18,28,42,0.04)` (card) / `0 24px 48px rgba(18,28,42,0.08)` (hover)

## Déploiement Netlify

Procédure manuelle de création du **nouveau** site Netlify : voir [`docs/DNS-CUTOVER.md`](./docs/DNS-CUTOVER.md).

**Important** : l'ancien site Netlify (`Neo52000/ma-papeterie`) reste live jusqu'au swap DNS J+16 — **ne pas y toucher**.

## Assets à ajouter manuellement

Les fichiers binaires suivants doivent être déposés dans `public/` avant le premier deploy :

- `favicon.ico` — récupérer depuis l'ancien repo ou générer via [realfavicongenerator.net](https://realfavicongenerator.net)
- `og-default.png` (1200×630) — image OG par défaut (logo sur fond blanc)

## Phase suivante

Phase 2 = catalogue + fiche produit (F2 + F3 du SPEC) — J4–J6.

## Licence

Propriétaire — usage interne Ma Papeterie uniquement.
