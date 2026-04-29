# BACKLOG V2 — Idées hors scope V1

> Toute feature listée ici est **explicitement exclue** de la V1 (cf. `docs/SPEC-V1.md` §5).
> Ne pas implémenter avant le go-live V1 (cible J+16 = 5 mai 2026) et validation explicite d'Élie.

## Roadmap V2 priorisée (post-cutover)

Découpage en 3 batches selon impact / risque / effort. Issu de l'audit
security + Lighthouse + a11y batch 1 mené 28 avril, et des items "hors
scope V1" relevés au fil des PR Phase 2-3.

### V2.1 — Critique post-cutover (semaine 1-2 après D+16)

Items qui auraient pu être V1 mais ont été reportés faute de temps.
À shipper avant que la prod commence à voir du vrai trafic / vraies
commandes en volume.

| Item                                                                                      | Effort | Impact                                                                                         | Référence                                   |
| ----------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Rate limiting** sur POST publics (Netlify Pro ou Upstash counter)                       | 1j     | Anti-DoS sur `/api/liste-scolaire/match` notamment (jusqu'à 80 FTS séquentielles par appel)    | audit security 2026-04-28 §3                |
| **Sentry / observability** (swap impl `src/lib/logger.ts`, garder l'API `logError`)       | 0.5j   | Aujourd'hui les erreurs vont à `process.stderr` Netlify Functions = visible mais pas alertable | logger pré-cablé pour ce swap               |
| **Vrai OG image 1200×630 PNG** (logo sur fond blanc)                                      | 0.5j   | Fallback SVG actuel passe Lighthouse mais Slack/FB rendent mal                                 | `src/components/seo/SEO.astro:25`           |
| **CSP header tightening** dans `netlify.toml`                                             | 0.5j   | Audit "tighten in Phase 2" déjà tagué                                                          | allowlist shopify.com / supabase.co / brevo |
| **Backup Supabase nightly automatisé** + monitoring uptime (UptimeRobot ou Better Uptime) | 0.5j   | Aujourd'hui aucun backup → 0 résilience si DB perdue                                           | —                                           |
| **Lighthouse CI** dans `.github/workflows/`                                               | 1j     | Empêche les régressions perf invisibles. Cap `≥ 90` mobile sur PR                              | CLAUDE.md performance budget                |

**~4 jours** pour boucler les "critiques manqués V1".

### V2.2 — Boost conversion (mois 2)

Items qui boostent le panier moyen / la conversion / l'UX mobile (où
on attend la majorité du trafic).

| Item                                                                                         | Effort | Impact business                                                             | Notes                                                                |
| -------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Image CDN webp/avif** (Netlify Image Optimization sur les URLs Comlandi/Shopify)           | 1j     | LCP mobile, +5-10% conversion estimés                                       | hors scope V1 — JPEG bruts comlandi.fr passent quand même            |
| **Mobile menu rewrite** (React Sheet plein écran vs `<details>` natif) + autocomplete mobile | 1.5j   | Mobile = majorité trafic, UX critique                                       | `<details>` retenu V1 par simplicité, à upgrader                     |
| **Toasts notifications** (add to cart success, erreurs forms)                                | 0.5j   | Add to cart muet aujourd'hui — drawer s'ouvre mais pas de feedback "ajouté" | utiliser `sonner` ou custom                                          |
| **Filtres catalogue avancés** (prix range, stock only, brands multi)                         | 2j     | Pour 11k produits, facets = ergonomie clé                                   | UI filters island, params ?brand=&priceMax= déjà supportés en partie |
| **Loading skeletons** sur catalogue + fiche produit                                          | 1j     | Perçu UX, pas perf brute                                                    | shimmer over `card-product`                                          |
| **Wishlist / favoris** côté `/compte` (table `product_favorites`)                            | 1.5j   | Engagement long-terme + relance email "ton favori en promo"                 | RLS user_id                                                          |
| **Cart abandonné Brevo custom** (cron Edge Function + email après 1h)                        | 1j     | Shopify natif ne couvre pas le cart hors checkout                           | scope BACKLOG.improv-tech                                            |

**~9 jours** pour le batch "boost conversion".

### V2.3 — Features sophistiquées (T+3 mois)

Items qui demandent plus de R&D, d'AI, ou de refacto profond.

| Item                                                                                            | Effort | Pourquoi                                                                                               |
| ----------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| **OCR liste scolaire** (image/PDF via OpenAI Vision API)                                        | 2.5j   | F5 V1 = texte uniquement. Photo de la liste papier = use case réel parents                             |
| **Recommandations produits IA** ("vous aimerez aussi…") via embeddings pgvector                 | 3j     | Cross-sell automatique. ROI si volume                                                                  |
| **Recherche sémantique** (vs FTS exact match) — pgvector + embeddings Cohere/OpenAI             | 3j     | "stylo qui efface" matche FriXion sans le mot dans le nom                                              |
| **Multi-livraison** : Mondial Relay / Colissimo / Click & Collect (Shopify Carrier Service API) | 4j     | V1 = Stripe générique. Choix au checkout = plus pro                                                    |
| **Linking compte Supabase ↔ customer Shopify** (par customer ID Shopify, pas par email)         | 2j     | Aujourd'hui matching `/api/me/orders` par email. Linking explicit = order history même si email change |
| **Page `/commande/[id]`** avec détail order + tracking + facture PDF                            | 2j     | "Mon compte" V1 liste les orders mais pas de détail. Réduit emails support                             |
| **Refactor pricing** : RPC `compute_display_price` comme SSOT (lib/pricing.ts en wrapper)       | 1j     | Logique en double TS + SQL. Risque drift                                                               |
| **Newsletter Brevo segmentée** (B2C / B2B / écoles) avec opt-in granulaire                      | 2j     | `listIds: []` actuels (tag V2 dans le code) → vraies listes                                            |
| **Playwright E2E** smoke tests (add-to-cart / checkout / login)                                 | 2j     | Régression detection avant que ça touche prod                                                          |

**~21 jours** pour le batch sophistiqué.

### Total V2 estimé

| Batch            | Effort | Quand                    |
| ---------------- | ------ | ------------------------ |
| V2.1 critique    | ~4j    | Semaine 1-2 post-cutover |
| V2.2 conversion  | ~9j    | Mois 2                   |
| V2.3 sophistiqué | ~21j   | T+3                      |

**~34 jours-développeur cumulés** pour V2 complet. Avec marge réaliste = 2-3 mois si même rythme que le sprint V1.

## Features explicitement reportées (du SPEC V1)

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
- **Recommandations personnalisées** — au-delà des produits liés statiques de F3 (cf V2.3 ci-dessus pour le cas pgvector).

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

## Règle de priorisation V2

Après go-live V1, prioriser par :

1. **Impact CA direct** (panier moyen, conversion).
2. **Impact SEO** (pages indexées, position mots-clés).
3. **Charge opérationnelle réduite** pour Élie.

---

**Dernière mise à jour** : 29 avril 2026 — scope V2.1/V2.2/V2.3 priorisé après audit security + Lighthouse + a11y.
