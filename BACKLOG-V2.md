# BACKLOG V2 — Idées hors scope V1

> Toute feature listée ici est **explicitement exclue** de la V1 (cf. `docs/SPEC-V1.md` §5).
> Ne pas implémenter avant le go-live V1 (cible J+16 = 5 mai 2026) et validation explicite d'Élie.

## Features reportées à V2

### Outils créatifs / design

- **Tampon designer Konva.js** — éditeur WYSIWYG pour tampons personnalisés.
- **Impression fine art** — gamme spécialisée (papiers techniques, formats grand tirage).
- **Plaques immatriculation** — catalogue + config.
- **Papier peint** — catalogue mètres linéaires.
- **Patrons** — catalogue couture / loisirs créatifs.

### Recherche / catalogue avancé

- **Finder consommables imprimantes** — matcher marque/modèle → cartouches compatibles.
- **Scraping concurrents** — veille prix automatisée.

### IA / prédictions

- **Prédictions IA / RFM / scoring clients** — segmentation automatique.
- **Recommandations personnalisées** — au-delà des produits liés statiques de F3.

### Marketing

- **Amazon marketplace export** — listing produits Amazon.
- **SMS gateway** — notifs commandes par SMS.
- **Blog CMS / page builder** — contenu éditorial dynamique.
- **Social media automation** — publication auto Instagram / Facebook.

### B2B avancé

- **Module leasing B2B** — landing existe déjà en repo séparé, **ne pas merger** en V1.
- **Génération PDF devis automatique** — V1 = devis manuel via Shopify.

### Admin / analytics

- **Module CRM/ERP natif** — Supabase Studio + Shopify suffisent en V1.
- **Dashboard KPI custom** — on lit Shopify Analytics directement.
- **Admin UI custom** — Supabase Studio = admin.

## Améliorations techniques V2

- Migration vers images AVIF/WebP avec `<picture>` responsive.
- Génération types Supabase au runtime CI (actuellement manuel).
- Mobile menu : remplacer `<details>` natif par composant React island animé.
- Suite de tests E2E Playwright sur les 8 flux critiques.
- CSP strict (actuellement baseline, Phase 2 audit).
- Full generated Shopify types (remplacer stubs `src/types/shopify.ts`).
- Lighthouse CI bloquant sur PR.
- OG image générateur dynamique (Satori).

## Règle de priorisation V2

Après go-live V1, prioriser par :

1. **Impact CA direct** (panier moyen, conversion).
2. **Impact SEO** (pages indexées, position mots-clés).
3. **Charge opérationnelle réduite** pour Élie.

---

**Dernière mise à jour** : 20 avril 2026 — scaffold Phase 1.
