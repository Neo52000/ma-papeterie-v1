# CLAUDE.md — Instructions IA pour développeurs

> **Carte structurelle du dépôt** : lire `.claude/CODEBASE-MAP.md` en priorité au démarrage de chaque session avant d'explorer les fichiers sources. La carte documente composants, lib/, types, routes, stores et flux de données.

> **Commande `/compact`** disponible : tape `/compact` pour générer un résumé de session prêt à copier-coller dans un nouvel onglet Claude Code.

> Consignes impératives pour Claude Code (et autres IA) travaillant sur ce repo pendant la fenêtre V1 (16 jours).

## Règle d'or

**Aucune feature hors du périmètre `docs/SPEC-V1.md`.** Si une idée émerge, elle va dans `BACKLOG-V2.md`, pas dans le code.

## Les 8 features V1 autorisées

Voir `docs/SPEC-V1.md` §4. Résumé :

- F1 Home · F2 Catalogue · F3 Fiche produit · F4 Panier/checkout
- F5 Upload liste scolaire · F6 Compte client · F7 Devis B2B · F8 Légal + SEO local

**Interdit en V1** (liste explicite dans `BACKLOG-V2.md`) : tampon Konva, finder consommables, scoring IA, Amazon export, SMS, blog CMS, leasing, impression fine art, admin custom, dashboard KPI, scraping.

## Conventions de code

- **TypeScript strict absolu** — `any` interdit sauf justification commentée.
- **Zéro `console.log`** dans le code livré (erreurs = `throw new Error(...)`, pas de logs).
- **Zéro "TODO" flottant** — tout TODO doit référencer une phase future (`Phase 2`, `F4`, etc.).
- **Commits Conventional** : `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- **Imports** : chemin absolu `@/...` pour tout ce qui est dans `src/`.
- **Composants React** : `.tsx` (islands), sinon `.astro` par défaut.
- **Styling** : uniquement classes Tailwind ou composants helpers de `global.css` (`card-product`, `label-category`, `badge-new`, `price-ht-suffix`). Pas de CSS inline.

## Design System

**Strictement identique à la v5.** Ne jamais modifier les tokens dans `tailwind.config.mjs` sans validation explicite d'Élie.

Palette figée : `primary #121c2a` / `accent #fd761a` / `bg-soft #fafaf9`. Polices : Poppins (display) + Inter (body), self-hosted.

## Périmètre technique figé

- Pas d'ajout de dépendance sans justification 1-ligne dans le PR.
- Pas de refactoring "pendant qu'on y est" (règle SPEC §9.5).
- Pas de page admin custom (Supabase Studio + Shopify suffisent en V1).
- Pas de Google Fonts CDN (RGPD) — fonts via `@fontsource`.

## Performance budget

- `main.js` < 50 KB gzipped sur la home.
- Lighthouse mobile ≥ 90 sur toutes les pages avant merge.
- Images : `<img loading="lazy">` par défaut, `<picture>` avec AVIF/WebP en Phase 2.

## Accessibilité

- `aria-label` sur tout bouton sans texte visible.
- Contraste AA minimum partout.
- Skip-link en haut de `BaseLayout.astro` (`#main-content`).
- Fonts lisibles : jamais en dessous de `text-sm` (14px) pour du corps de texte.

## Sécurité

- Secrets : **jamais** commit. `.env.local` ignoré.
- RLS Supabase actif — ne pas désactiver.
- `SUPABASE_SERVICE_ROLE_KEY` : uniquement côté serveur (`@/lib/supabase`, pas `supabase-browser`).
- Headers sécurité : configurés dans `netlify.toml`, voir `docs/ARCHITECTURE.md`.

## Process de PR

1. Branche : `feat/<numéro-feature>-<slug>` (ex : `feat/f3-fiche-produit`).
2. CI verte obligatoire (typecheck + build).
3. Screenshot / vidéo du livrable dans la description.
4. Merge en squash sur `main`.

## En cas de blocage

> Règle SPEC §9.6 : si bloqué > 30 min → demander aide.

Canaux : Claude Code en session, Claude chat, doc officielle Astro / Supabase / Shopify.
