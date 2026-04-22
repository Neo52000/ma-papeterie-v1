# PROMPT CLAUDE CODE — PHASE 1 : Repo Astro + Base Technique (v2)

> À exécuter **après** validation du `SPEC-V1.md` et tag Git `v5-archive` posé sur l'ancien repo.
> Ce prompt ne crée **que la fondation**. Les pages métier viennent en Phase 2.
> Durée estimée : 10h sur 2 jours (J2–J3).
> Version 2.0 — 19 avril 2026 — tokens DS réels conservés + Netlify nouveau site dédié.

---

## Rôle

Tu es architecte frontend senior avec 10 ans d'expérience en e-commerce français, spécialisé en Astro SSR, React islands, TypeScript strict et intégrations headless (Supabase, Shopify Storefront). Tu as déployé 20+ sites e-commerce en production sur Netlify. Tu maîtrises le SEO technique FR, les Core Web Vitals, et les architectures composables.

## Mission

Initialiser le **nouveau repo Astro v1** pour ma-papeterie.fr avec une fondation technique production-ready : structure de projet, design tokens **identiques à la v5**, intégrations Supabase/Shopify/Brevo câblées, layout de base, SEO helpers, CI/CD Netlify sur un **nouveau site Netlify dédié**. **Aucune page métier** créée à ce stade — juste la home minimaliste de test.

## Contexte projet

- **Propriétaire** : Élie Reine, solo, 5h/jour sur ce projet
- **Ancien repo** : `Neo52000/ma-papeterie` (React SPA Lovable) — archivé en tag `v5-archive`, Netlify site existant **à NE PAS toucher**
- **Nouveau repo** : `Neo52000/ma-papeterie-v1` (à créer)
- **Nouveau site Netlify** : `ma-papeterie-v1.netlify.app` (à créer, compte Netlify existant d'Élie)
- **Domaine cible** : ma-papeterie.fr (bascule DNS en dernière étape, J+16)
- **Stratégie cutover** : l'ancien site Netlify reste live jusqu'au swap DNS, puis archivé 30 jours comme rollback
- **Stack figée non négociable** :
  - Astro 4.15+ (SSR via `@astrojs/netlify`)
  - React 18 (islands via `@astrojs/react`)
  - TypeScript strict
  - Tailwind CSS 3.4+ (via `@astrojs/tailwind`)
  - shadcn/ui (adapté Astro — composants React islands)
  - Zustand (panier, session) — pas de Redux
  - Supabase client (`@supabase/supabase-js` v2)
  - Shopify Storefront API (`@shopify/storefront-api-client`)
- **Backend existant à préserver** (Supabase Pro, ne pas recréer) :
  - URL projet : à récupérer depuis l'ancien repo (fichier `.env` ou dashboard)
  - Tables clés : `products`, `product_stocks`, `product_images`, `product_descriptions`, `categories`, `b2b_quotes`, `school_lists`
  - RLS actif
- **Shopify existant** : store `ma-papeterie.myshopify.com`, Storefront API token à réutiliser

## Design tokens — IDENTIQUES à la v5 (cohérence visuelle garantie)

**Palette de couleurs** :

```
--color-primary:        #121c2a   (navy encre, quasi-noir bleuté)
--color-primary-muted:  #121c2a/40 (texte secondaire)
--color-primary-light:  #121c2a/30 (labels/meta)
--color-accent:         #fd761a   (orange chaleureux, CTA & badges)
--color-bg:             #ffffff   (blanc pur)
--color-bg-soft:        #fafaf9   (off-white, cards alternées)
--color-border:         #e5e5e3
--color-success:        #16a34a
--color-danger:         #dc2626
```

**Typographie** :

- Display (headings h1–h3) : **Poppins** (400, 500, 600, 700)
- Body & UI : **Inter** (400, 500, 600)
- Fonts **self-hosted** (fichiers dans `/public/fonts/`) via `@fontsource/poppins` et `@fontsource/inter` — pas de CDN Google Fonts (RGPD)

**Radius & shadows** :

- Cards : `rounded-[1rem]`
- Badges : `rounded-[0.4rem]`
- Buttons : `rounded-[0.5rem]`
- Shadow card : `0 20px 40px rgba(18, 28, 42, 0.04)`
- Shadow hover : `0 24px 48px rgba(18, 28, 42, 0.08)`

**Patterns UI récurrents (v5)** :

- Card produit : fond blanc, border subtil, hover `-translate-y-1 transition-all duration-200`
- Label catégorie : `text-[0.65rem] uppercase tracking-[0.08em] font-semibold text-primary/30`
- Badge "NOUVEAU" : `bg-accent text-white px-2 py-0.5 rounded-[0.4rem] text-xs`
- Prix : `text-lg font-semibold` + suffixe `HT` en `text-[0.65rem] text-primary/40 ml-1 font-inter`

## Process interne (ne pas afficher dans la réponse finale)

Avant d'exécuter, effectue mentalement :

1. Vérifier qu'aucun fichier n'existe déjà (repo neuf)
2. Lister les dépendances exactes dans le bon ordre d'installation
3. Prévoir la structure de dossiers avant de coder
4. Identifier les 7 variables d'environnement minimales et vérifier qu'elles sont bien typées
5. Valider que chaque fichier créé a un rôle clair dans le SPEC V1
6. Contrôler que tous les helpers SEO couvrent Schema.org + OG + Twitter
7. Vérifier que les tokens DS sont **strictement identiques** à la v5
8. Tester mentalement le build local avant de commit

## Livrables attendus (structure exacte)

```
ma-papeterie-v1/
├── .github/
│   └── workflows/
│       └── ci.yml                    # Lint + typecheck + build
├── .env.example                      # Template variables
├── .gitignore
├── astro.config.mjs                  # SSR Netlify + React + Tailwind
├── netlify.toml                      # Config deploy
├── package.json                      # Dépendances verrouillées
├── tsconfig.json                     # Strict mode
├── tailwind.config.mjs               # Design tokens v5 conservés
├── components.json                   # Config shadcn
├── README.md                         # Doc projet
├── CLAUDE.md                         # Instructions IA pour devs
├── BACKLOG-V2.md                     # Ideas hors scope
├── docs/
│   ├── ARCHITECTURE.md               # Diagramme stack
│   ├── DESIGN-SYSTEM.md              # Tokens + composants
│   └── DNS-CUTOVER.md                # Procédure swap DNS J+16
├── public/
│   ├── favicon.ico
│   ├── fonts/                        # Poppins + Inter self-hosted
│   ├── robots.txt                    # Allow all + sitemap ref
│   └── site.webmanifest              # PWA basics
├── src/
│   ├── env.d.ts                      # Typage env vars strict
│   ├── layouts/
│   │   └── BaseLayout.astro          # HTML shell + SEO + footer
│   ├── components/
│   │   ├── ui/                       # shadcn primitives (Button, Input, Card, Badge)
│   │   ├── layout/
│   │   │   ├── Header.astro
│   │   │   └── Footer.astro
│   │   └── seo/
│   │       └── SEO.astro
│   ├── lib/
│   │   ├── supabase.ts               # Client server-side
│   │   ├── supabase-browser.ts       # Client browser-side
│   │   ├── shopify.ts                # Storefront API client
│   │   ├── brevo.ts                  # Email wrapper
│   │   ├── schema.ts                 # Helpers Schema.org
│   │   └── utils.ts                  # cn(), formatPrice(), etc.
│   ├── stores/
│   │   ├── cartStore.ts              # Zustand panier (stub)
│   │   └── authStore.ts              # Zustand session (stub)
│   ├── styles/
│   │   └── global.css                # Tailwind base + fonts
│   ├── types/
│   │   ├── database.ts               # Types générés Supabase
│   │   └── shopify.ts
│   └── pages/
│       ├── index.astro               # Home minimaliste (test)
│       └── api/
│           └── health.ts             # Endpoint /api/health (test SSR)
└── scripts/
    └── generate-db-types.sh          # Regen types Supabase
```

## Exigences techniques détaillées

### 1. `astro.config.mjs`

- Output : `server` (SSR)
- Adapter : `@astrojs/netlify` avec `edgeMiddleware: false`
- Integrations : `react()`, `tailwind({ applyBaseStyles: false })`, `sitemap()`
- `site: 'https://ma-papeterie-v1.netlify.app'` (à changer en `https://ma-papeterie.fr` à J+16)
- `prefetch: { prefetchAll: true, defaultStrategy: 'viewport' }`
- Compression activée

### 2. `tailwind.config.mjs` — TOKENS V5 STRICTS

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#121c2a',
        50: 'rgba(18, 28, 42, 0.04)',
        100: 'rgba(18, 28, 42, 0.08)',
        300: 'rgba(18, 28, 42, 0.3)',
        400: 'rgba(18, 28, 42, 0.4)',
      },
      accent: {
        DEFAULT: '#fd761a',
        hover: '#e8651a',
      },
      'bg-soft': '#fafaf9',
    },
    fontFamily: {
      display: ['Poppins', 'sans-serif'],
      sans: ['Inter', 'system-ui', 'sans-serif'],
    },
    borderRadius: {
      'card': '1rem',
      'badge': '0.4rem',
      'btn': '0.5rem',
    },
    boxShadow: {
      'card': '0 20px 40px rgba(18, 28, 42, 0.04)',
      'card-hover': '0 24px 48px rgba(18, 28, 42, 0.08)',
    },
    letterSpacing: {
      'label': '0.08em',
    },
  },
},
plugins: [
  require('@tailwindcss/forms'),
  require('@tailwindcss/typography'),
],
```

### 3. `src/styles/global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import '@fontsource/poppins/400.css';
@import '@fontsource/poppins/500.css';
@import '@fontsource/poppins/600.css';
@import '@fontsource/poppins/700.css';
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
    color: #121c2a;
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
  }
}

@layer components {
  .card-product {
    @apply overflow-hidden rounded-card bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover;
  }
  .label-category {
    @apply text-[0.65rem] font-semibold uppercase tracking-label text-primary-300;
  }
  .badge-new {
    @apply rounded-badge bg-accent px-2 py-0.5 text-xs font-medium text-white;
  }
  .price-ht-suffix {
    @apply ml-1 font-sans text-[0.65rem] text-primary-400;
  }
}
```

### 4. `src/env.d.ts`

```typescript
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly PUBLIC_SHOPIFY_DOMAIN: string;
  readonly PUBLIC_SHOPIFY_STOREFRONT_TOKEN: string;
  readonly BREVO_API_KEY: string;
  readonly PUBLIC_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 5 à 17 — Composants, lib, layouts, pages, CI

- `lib/supabase.ts` + `supabase-browser.ts` : deux clients distincts (server avec service role, browser avec anon), types auto-générés
- `lib/shopify.ts` : client Storefront API + helpers typés
- `components/seo/SEO.astro` : props typées, OG Graph complet, Twitter Card, JSON-LD injecté
- `lib/schema.ts` : helpers Schema.org (Organization, LocalBusiness, Product, Breadcrumb, FAQ)
- `layouts/BaseLayout.astro` : HTML shell, SEO component, Header + slot + Footer, skip link a11y
- `components/layout/Header.astro` : logo + nom (Poppins 600), nav, recherche stub, panier, compte, mobile menu (React island)
- `components/layout/Footer.astro` : 4 colonnes, Schema LocalBusiness injecté, SIRET placeholder
- `pages/index.astro` : home minimaliste utilisant strictement les tokens DS (card-product, label-category, badge-new, etc.), avec test Supabase live
- `pages/api/health.ts` : endpoint GET validant Supabase + Shopify
- `netlify.toml` : Node 20, headers sécurité, redirects
- `ci.yml` : lint + typecheck + build sur push/PR
- `docs/DNS-CUTOVER.md` : procédure détaillée swap DNS J+16 avec rollback plan

### 18. `README.md`, `CLAUDE.md`, `BACKLOG-V2.md`, `.env.example`

Contenus classiques.

## Setup Netlify (à faire manuellement après le build du repo)

**Important** : Le repo Git est créé par Claude Code, le site Netlify doit être créé manuellement par Élie avec son compte.

### Procédure nouveau site Netlify

1. Se connecter à netlify.com avec le compte actuel
2. "Add new site" → "Import an existing project" → GitHub → `Neo52000/ma-papeterie-v1`
3. Build command : `npm run build` | Publish dir : `dist` | Node 20
4. **Custom site name** : `ma-papeterie-v1` (URL : `ma-papeterie-v1.netlify.app`)
5. **Environment variables** à saisir (récupérées depuis l'ancien repo ou dashboards) :
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PUBLIC_SHOPIFY_DOMAIN`
   - `PUBLIC_SHOPIFY_STOREFRONT_TOKEN`
   - `BREVO_API_KEY`
   - `PUBLIC_SITE_URL` = `https://ma-papeterie-v1.netlify.app`
6. **Déploiement** : premier deploy auto déclenché
7. **Ancien site Netlify** : **ne pas toucher**. Il continue à servir ma-papeterie.fr (même dégradé)

## Format de sortie imposé

**Étape 1** — Affiche le plan complet en tableau numéroté avant d'écrire du code :

| #   | Fichier | Rôle | Durée estimée |
| --- | ------- | ---- | ------------- |

**Étape 2** — Demande validation explicite : "Valider le plan ? [y/N]"

**Étape 3** — Après validation, génère **tous les fichiers dans l'ordre** avec commentaires inline pour les zones non triviales.

**Étape 4** — Produit la checklist finale :

- [ ] Repo initialisé sur GitHub (`Neo52000/ma-papeterie-v1`)
- [ ] `npm install` passe sans warning critique
- [ ] `npm run dev` démarre → http://localhost:4321 affiche la home v1
- [ ] `npm run build` termine sans erreur
- [ ] `/api/health` retourne 200 avec Supabase + Shopify connectés
- [ ] Lighthouse local sur home ≥ 95 (mobile)
- [ ] Tokens DS vérifiés visuellement vs v5 (screenshots comparés)
- [ ] Instructions fournies à Élie pour créer le nouveau site Netlify

**Étape 5** — Produit les commandes bash exactes :

```bash
# 1. Init repo et code
git clone git@github.com:Neo52000/ma-papeterie-v1.git && cd ma-papeterie-v1
cp .env.example .env.local && # puis remplir avec les valeurs réelles
npm install

# 2. Test local
npm run dev  # http://localhost:4321
npm run build
npm run preview

# 3. Push initial
git add . && git commit -m "chore: initial scaffold v1.0" && git push origin main

# 4. Créer nouveau site Netlify (procédure manuelle ci-dessus)
```

## Règles strictes

- **Zéro feature hors périmètre Phase 1**. Pas de page produit, pas de panier, pas d'upload.
- **Zéro dépendance inutile**. Chaque package ajouté = justifié en 1 ligne.
- **TypeScript strict absolu** — `any` interdit sauf si justifié par commentaire.
- **Zéro secret commité**. `.env.local` dans `.gitignore`.
- **Zéro "TODO" commenté** qui ne soit pas lié à une phase future référencée.
- **Commits atomiques** suivant Conventional Commits.
- **Pas de `console.log`** dans le code livré.
- **Performance budget** : `main.js` < 50 KB gzipped sur la home V1.
- **Accessibilité** : ARIA labels sur tous les boutons, contraste AA minimum.
- **RGPD-ready** : fonts self-hostées (pas de CDN Google Fonts), pas de scripts tiers sans consent.
- **DS strictement identique à la v5** — tous les tokens vérifiés visuellement avant commit.
- **Si une info manque** → signale-le et propose une valeur par défaut plutôt que de s'arrêter.
- **Ne pas toucher à l'ancien repo ni à l'ancien site Netlify**. Jamais.

---

## Instruction de lancement

Dans ton terminal :

```bash
cd ~/projets
mkdir ma-papeterie-v1 && cd ma-papeterie-v1
claude-code --dangerously-skip-permissions < PROMPT-PHASE1-ASTRO.md
```

À la fin de la phase 1, revenir en chat pour valider avant la Phase 2 (catalogue + fiche produit).
