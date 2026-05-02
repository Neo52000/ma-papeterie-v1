# BACKLOG V2 — Idées hors scope V1

> Toute feature listée ici est **explicitement exclue** de la V1 (cf. `docs/SPEC-V1.md` §5).
> Ne pas implémenter avant le go-live V1 (cible J+16 = 5 mai 2026) et validation explicite d'Élie.

## ✅ Shipped 2026-04-29 (48 PRs, batch pre-cutover)

**V2.1** : CSP tightening (#46), Lighthouse CI (#47), OG image (#48 + #82),
Sentry conditionnel (#64).

**V2.2** : Toasts (#49), Image CDN AVIF/WebP (#51 + #68), Mobile menu (#52),
Filtres avancés (#53), Wishlist + RLS (#54 + #59), Cart abandonné cron (#55),
Logo (#56), Footer enrichi (#57), Trust strip (#58), 404 polish (#60),
Empty state (#61), Devis prefill (#62), SIRET/TVA/tél (#63),
Canonical via env (#65), Form double-submit (#66), Honeypot (#67).

**V2.3 partiel** : Notify-back-in-stock + cron (#69 + #72), Recently viewed (#70),
Newsletter Brevo (#71), Order detail page (#73), Playwright E2E (#77),
Admin SQL views (#78), 500 page (#81), Search recents (#83),
Back-to-top (#84), Cart focus trap (#85), PWA install (#86), LCP eager (#87),
SEO noindex filters (#88), Sitemap images (#89), Smart redirect dead products (#90),
Service worker offline (#91), Focus rings WCAG (#92),
WishlistButton client:visible (#94), robots.txt tightened (#95),
WebSite SearchAction schema (#96), Pagination basePath fix (#97).

### Setup user requis pour activer

| Var Netlify                        | Active                    | Doc                            |
| ---------------------------------- | ------------------------- | ------------------------------ |
| `PUBLIC_SENTRY_DSN`                | Sentry observability      | `docs/SENTRY-SETUP.md`         |
| `CRON_SECRET`                      | Tous les cron workflows   | `docs/ABANDONED-CART-EMAIL.md` |
| `BREVO_ABANDONED_CART_TEMPLATE_ID` | Cart abandonné            | `docs/ABANDONED-CART-EMAIL.md` |
| `BREVO_BACK_IN_STOCK_TEMPLATE_ID`  | Notify-back-in-stock cron | `docs/BACK-IN-STOCK-EMAIL.md`  |
| `BREVO_NEWSLETTER_LIST_ID`         | Newsletter footer         | `docs/NEWSLETTER-SETUP.md`     |

### V2.3 reste à scoper

- OCR liste scolaire (OpenAI Vision API, 1-2 sem)
- Reco IA produits (pgvector + embeddings, 1+ sem)
- Recherche sémantique (pgvector vs tsvector, 1+ sem)
- Refactor pricing SSOT (RPC compute_display_price, risque)
- Multi-livraison Shopify (zones + retraits)
- Linking compte Shopify ↔ Supabase auth
- **Module Promotions** : ajouter colonne `compare_at_ttc` (Shopify-style)
  + filtre `?promo=1` dans `/catalogue` + lien header/mobile + badge "Promo"
  sur ProductCard quand `compare_at_ttc > price_ttc`. Remettre l'entrée
  sub-nav "Promotions" supprimée pré-cutover (lien pointait vers du vide).

---

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
