# Rapport d'analyse repo `ma-papeterie-v1`

> Snapshot au **2026-05-01** — branche `claude/analyze-repo-structure-Nyilr`
> Comparaison de l'état du code avec `PROJECT-STATE.md` (D-5 cutover, 2026-04-28).

---

## 1. Historique PRs récentes (depuis 2026-04-22)

```
b21dfc4 Merge PR #133 feat/phase5-home-v5-integration
b871913 Merge PR #132 feat/phase5-univers-grid
6d6f94f Merge PR #131 feat/phase5-price-mode-toggle
cad194c Merge PR #130 feat/phase5-seo-conseils-indispensables
55d6962 Merge PR #128 feat/phase5-trust-newsletter-find-cards
5d60c0d Merge PR #129 feat/phase5-b2b-testi-promo
340d19f Merge PR #126 chore/phase5-fix-ts-deprecation
3fb2219 feat(phase5): integrate V5 components into the home
2204b3f feat(phase5): CategoryUniversGridV5 — Explorez nos univers
dfa1e36 feat(phase5): HT/TTC toggle store + island + PriceDisplay update
3f455d5 feat(phase5): SeoTextBlockV5 + ConseilsCardsV5
b0e0c4e feat(phase5): B2bCalloutV5 + TestimonialsV5 + PromoBlocksV5
6b44537 feat(phase5): TrustStripV5 + NewsletterCardV5 + FindUsCardV5
72b16f1 Merge PR #127 feat/phase5-header-v5-layout
a6de27f feat(phase5): align header layout with V5 (item 4/9)
cee440d chore: silence baseUrl deprecation warning until TS 7
991de56 Merge PR #123 fix/phase5-marquee-yellow-bg
97e7f9b Merge PR #125 docs/project-state
afae27a Merge PR #124 feat/phase5-1-slider-hero
de96cc5 feat(phase5): add hero slider on home (V5 parity #3)
1f604c6 fix(phase5): marquee bar yellow bg + V5 default content
310ea0c feat(phase5): add CSS-only marquee bar (#122)
332dec0 feat(phase5): align design tokens to V5 — palette + typography (#121)
4037c29 docs(project-state): align with user's canonical content
a1b86e1 docs: add PROJECT-STATE.md snapshot D-5 cutover (#120)
bdebd94 feat: weekly off-site Supabase backup via GitHub Actions (#119)
949bc18 chore: add backfill-embeddings script (#118)
d31595f fix(admin): drop SHOPIFY_ADMIN_ACCESS_TOKEN from cutover-status (#117)
7e6f078 fix(admin): cutover-status sync count + env var names (#116)
476989b fix: apply security headers on SSR via middleware (#115)
8f8b7e0 chore: add cutover-site-url script (#114)
6207293 feat(c1): Phase C Alkor foundation — supplier column + adapter stub (#113)
541014a feat(a1): /admin/cutover GO/NO-GO checklist (#112)
c677c90 feat(b3): recherche sémantique catalogue (#111)
5985821 feat(b2): pgvector reco IA produits similaires (#110)
a7c7350 feat(b1): OCR liste scolaire via OpenAI Vision (#109)
f904e81 feat(admin): D5 /admin/produits browse + sync status (#108)
bd6461c feat(admin): D4 listes-scolaires + notifications waitlist (#107)
edf80d0 feat(admin): D3 /admin/commandes read-only (#106)
7c7d4c9 feat(admin): D2 /admin/devis CRUD via Bearer (#105)
57eead2 fix(admin): client-side gate (#104)
6c04111 feat(admin): D1 foundation — admin_users + dashboard (#102)
b03ed8a fix(seo): sitemap index uses RPC exact count (#101)
8b3b2d8 docs(sync): document CLI parallel-trigger gotcha (#100)
41efaca docs(backlog): mark 48 PRs shipped (#99)
d721275 docs(journal): wrap up 2026-04-29 (#98)
153a76d fix(catalogue): pagination + sort preserve category (#97)
4388e45 feat(seo): WebSite SearchAction + Organization sameAs (#96)
8acfced fix(seo): disallow private + filter URLs in robots.txt (#95)
26978c1 perf(catalogue): hydrate WishlistButton on visible (#94)
da2d4b5 fix(a11y): visible accent focus ring WCAG 2.4.7 (#92)
c76ec7b feat(ux,a11y): smart redirect dead products + aria-busy (#93)
af72cae feat(pwa): service worker offline shell + fallback (#91)
06c0ac1 feat(ux,a11y): smart redirect dead products + aria-busy (#90)
b45452f feat(seo): image extension on products sitemap (#89)
6e4d934 fix(seo): noindex filtered + paginated catalogue (#88)
ccf2327 perf(lcp): eager load above-the-fold product images (#87)
963c0bc feat(pwa): custom install prompt banner (#86)
```

---

## 2. Arborescence `src/` (151 fichiers)

```
src/components/account/    AccountDashboard, LoginForm, OrderDetail, RegisterForm, WishlistList
src/components/admin/      AdminDashboard, AdminGuard, CommandesList, CutoverStatus,
                           DevisDetail, DevisList, ListesScolairesList, ProduitsBrowser, WaitlistView
src/components/cart/       CartCleaner, CartDrawer, CartEmpty, CartLineItem, CartSummary, CartTrigger
src/components/catalogue/  CatalogueFilters.astro, Pagination.astro,
                           SemanticSuggestions.tsx, SortSelect.astro
src/components/home/       B2bCalloutV5, CategoryTile, CategoryUniversGridV5, ConseilsCardsV5,
                           FindUsCardV5, HeroSlider.tsx, NewsletterCardV5, PromoBlocksV5,
                           SeoTextBlockV5, TestimonialsV5.tsx, TrustStripV5
src/components/layout/     AccountTrigger, Footer, Header, HeaderSearchAutocomplete,
                           Marquee, MobileMenu, NewsletterSignup, PriceModeToggle, WishlistTrigger
src/components/product/    AddToCartButton, ImageGallery, NotifyBackInStock, PriceDisplay,
                           ProductCard, RecentlyViewedSection, RecentlyViewedTracker,
                           SimilarProductsAI, StockBadge, WishlistButton
src/components/school-list/  SchoolListMatcher.tsx
src/components/seo/        SEO.astro
src/components/ui/         BackToTop, Badge, Button, Card, CdnImage, Input,
                           PwaInstallPrompt, Toaster
```

---

## 3. Pages Astro (routes)

```
src/pages/
  404.astro, 500.astro
  index.astro                                (home)
  catalogue/index.astro, catalogue/[category].astro
  produit/[slug].astro
  liste-scolaire.astro, devis.astro, contact.astro
  compte.astro, compte/commandes/[id].astro, compte/favoris.astro
  connexion.astro, inscription.astro, merci.astro
  Pages légales : cgv, confidentialite, cookies, livraison-retour, mentions-legales
  SEO : robots.txt.ts, sitemap-index.xml.ts, sitemap-categories.xml.ts,
        sitemap-products-[page].xml.ts, sitemap-static.xml.ts

src/pages/admin/
  index.astro, cutover/index.astro
  commandes/, devis/[id].astro, devis/index.astro
  listes-scolaires/, notifications/, produits/

src/pages/api/
  admin/{commandes, cutover-status, devis/[id], devis, listes-scolaires,
         me, produits, stats, waitlist}
  cart/track
  cron/{abandoned-cart-emails, back-in-stock-emails}
  liste-scolaire/{match, ocr}
  me/{orders, orders/[id], wishlist}
  products/{[id]/similar, search-semantic, search}
  webhooks/shopify-order
  demande-devis, health, inscription-liste-scolaire, newsletter, notify-stock
```

---

## 4. Components clés (counts)

| Dossier | Fichiers |
|---|---|
| `cart/` | 6 |
| `product/` | 10 |
| `layout/` | 9 |
| `admin/` | 9 |

---

## 5. Stores Zustand

```
authStore, cartStore, priceModeStore, recentlyViewedStore, toastStore, wishlistStore
```

Nouveau depuis PROJECT-STATE : **`priceModeStore.ts`** (toggle HT/TTC, PR #131).

---

## 6. Lib

```
admin-api, brevo, cdn-image, embeddings, logger, pricing, queries, schema,
shopify-cart, shopify, supabase-browser, supabase, suppliers/alkor.ts, utils
```

---

## 7. Migrations Supabase (20 dernières)

```
20260422120100  pricing_coefficients
20260422174500  partial_index_products_displayable
20260422175000  rpc_count_displayable
20260423090000  fix_count_displayable_exact
20260423100000  notification_waitlist
20260423190000  products_shopify_link_alignment
20260424090000  compute_display_price_rpc
20260424100000  b2b_quotes_table
20260427000000  public_price_ttc_sentinel_cleanup
20260427150000  public_product_facets_rpcs
20260427160000  shopify_orders_table
20260428070000  cart_sessions_table
20260429120000  wishlists_table
20260429130000  cart_sessions_abandoned_email
20260429140000  notification_waitlist_back_in_stock
20260429150000  admin_views
20260430060000  admin_users
20260430090000  products_embedding_pgvector
20260430100000  search_products_semantic
20260430110000  products_supplier
```

---

## 8. GitHub workflows

```
abandoned-cart.yml, back-in-stock.yml, ci.yml, e2e.yml,
lighthouse.yml, shopify-sync.yml, supabase-backup.yml
```

---

## 9. Scripts

```
backfill-embeddings.mjs, cutover-site-url.sh, generate-db-types.sh,
inspect-schema.ts, shopify-import-test.mjs, shopify-sync-products.mjs,
shopify-test-products.json
```

---

## 10. Docs

```
ABANDONED-CART-EMAIL, ADMIN-VIEWS, ALKOR-INTEGRATION, ARCHITECTURE,
BACK-IN-STOCK-EMAIL, COWORK-PLAYBOOK, CUTOVER-CHECKLIST, DESIGN-SYSTEM,
DNS-CUTOVER, NEWSLETTER-SETUP, PHASE-2-FINDINGS, PHASE-2-SCHEMA-REPORT,
PHASE-3-FINDINGS, PHASE-3-NOTES, PROMPT-PHASE1-ASTRO, RLS-HARDENING-PLAN,
SENTRY-SETUP, SPEC-V1, SUPABASE-BACKUP, next-steps
```

---

## 11. `.env.example` (clés non-secrètes)

```
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY            (placeholder)
PUBLIC_SHOPIFY_STOREFRONT_DOMAIN
SHOPIFY_WEBHOOK_SECRET
PUBLIC_SITE_URL = "https://ma-papeterie-v1.netlify.app"   ← pas encore cutover
```

---

## 12. `package.json` scripts

```json
{
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "typecheck": "astro check",
  "lint": "prettier --check ...",
  "format": "prettier --write ...",
  "gen:types": "bash scripts/generate-db-types.sh",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

---

## 13. Bulk sync status

Non exécuté dans cette session : pas de `project_ref` Supabase fourni au MCP. À lancer si besoin.

---

## 14. PROJECT-STATE.md vs réalité repo

Le fichier est à la racine (`./PROJECT-STATE.md`, 646 lignes), pas dans `docs/`. Daté **2026-04-28**, donc antérieur à toute la **Phase 5 V5-parity** mergée depuis (PRs #121 → #133).

| PROJECT-STATE prévoit | Réalité repo |
|---|---|
| Phase 5.1 design parity « semaine du 5 mai » | ✅ Déjà largement livrée : tokens V5, marquee, hero slider, header V5, TrustStrip/Newsletter/FindUs, B2bCallout/Testimonials/Promo, Conseils, PriceMode toggle, CategoryUniversGrid, intégration home (PRs #121-133) |
| Bulk sync 4.3 % → 100 % bloquant | ⏳ Statut non vérifié dans cette session |
| Cutover DNS vendredi 2 mai 22 h | ⏳ `PUBLIC_SITE_URL` toujours `ma-papeterie-v1.netlify.app` |
| Test E2E final vendredi matin | ⏳ Workflow `e2e.yml` présent |
| Phase C Alkor : stub seul | ✅ Conforme — `lib/suppliers/alkor.ts` stub + colonne `products.supplier` |
| Cards produits V5 / Fiche produit V5 / Responsive V5 | ⏳ Non visibles dans les commits Phase 5 mergés (uniquement home + header) |

---

## Écarts notables / points à vérifier

1. **PROJECT-STATE.md non mis à jour depuis la Phase 5** — annonce « à faire semaine du 5 mai », alors que 13 PRs Phase 5 sont déjà mergées au 2026-05-01.
2. **Items Phase 5.1 restants selon le plan** : Footer V5, Cards produits V5, Fiche produit V5, Responsive V5. Aucun commit `feat(phase5): footer-v5` / `cards-v5` / `pdp-v5` / `responsive-v5` dans l'historique récent → probablement non faits.
3. **Cutover DNS** : `PUBLIC_SITE_URL` encore `ma-papeterie-v1.netlify.app` dans `.env.example` — bascule pas effectuée.
4. **Bulk sync** : statut à confirmer via Supabase (le MCP est dispo, vérification possible en fournissant le `project_ref`).
5. **Branche courante** : `claude/analyze-repo-structure-Nyilr` (créée comme demandé).
