# CODEBASE-MAP — ma-papeterie-v1

> Carte structurelle à lire en début de session. Évite de parcourir les sources
> pour comprendre l'architecture. Dernière mise à jour : 2026-05-04.

---

## 1. Stack en un coup d'œil

| Couche        | Technologie                                                         |
| ------------- | ------------------------------------------------------------------- |
| Rendu         | Astro 4.16.7 SSR (`output: 'server'`), adapter `@astrojs/netlify`   |
| Interactivité | React 18 islands (`client:load` / `client:idle` / `client:visible`) |
| Style         | Tailwind CSS 3.4, design-system figé (`tailwind.config.mjs`)        |
| DB / Auth     | Supabase Pro (Postgres + RLS actif)                                 |
| Commerce      | Shopify Storefront API 2025-01 (cart + checkout headless)           |
| Email         | Brevo — transactionnel + newsletter                                 |
| Hosting       | Netlify (CDN + Functions)                                           |
| Monitoring    | Sentry (`@sentry/astro`, conditionnel sur `PUBLIC_SENTRY_DSN`)      |
| Tests         | Playwright E2E (`playwright.config.ts`)                             |
| Search/Reco   | OpenAI `text-embedding-3-small` + pgvector HNSW                     |

---

## 2. Layouts

| Fichier                         | Rôle                                                    |
| ------------------------------- | ------------------------------------------------------- |
| `src/layouts/BaseLayout.astro`  | Shell HTML universel : SEO, Marquee, Header, Footer, SW |
| `src/layouts/AdminLayout.astro` | Shell admin : AdminGuard + navigation admin             |

`BaseLayout` accepte : `title`, `description`, `canonical`, `ogImage`, `ogType`, `noindex`, `jsonLd[]`.

---

## 3. Pages et routes

### Pages publiques

| Route                          | Fichier source                               |
| ------------------------------ | -------------------------------------------- | --------------- | ------- | ---------------- | ----------------------- |
| `/`                            | `src/pages/index.astro`                      |
| `/catalogue`                   | `src/pages/catalogue/index.astro`            |
| `/catalogue/[category]`        | `src/pages/catalogue/[category].astro`       |
| `/produit/[slug]`              | `src/pages/produit/[slug].astro`             |
| `/connexion`                   | `src/pages/connexion.astro`                  |
| `/inscription`                 | `src/pages/inscription.astro`                |
| `/compte`                      | `src/pages/compte.astro`                     |
| `/compte/commandes/[id]`       | `src/pages/compte/commandes/[id].astro`      |
| `/compte/favoris`              | `src/pages/compte/favoris.astro`             |
| `/liste-scolaire`              | `src/pages/liste-scolaire.astro`             |
| `/devis`                       | `src/pages/devis.astro`                      |
| `/tampon`                      | `src/pages/tampon.astro`                     |
| `/blog`, `/blog/[slug]`        | `src/pages/blog/index.astro`, `[slug].astro` |
| `/contact`, `/merci`, 404, 500 | `src/pages/`                                 |
| Pages légales                  | `src/pages/cgv                               | confidentialite | cookies | mentions-legales | livraison-retour.astro` |

### Pages admin (protégées par `AdminGuard`)

| Route                               | Composant principal                |
| ----------------------------------- | ---------------------------------- |
| `/admin`                            | `AdminDashboard.tsx`               |
| `/admin/commandes`                  | `CommandesList.tsx`                |
| `/admin/devis`, `/admin/devis/[id]` | `DevisList.tsx`, `DevisDetail.tsx` |
| `/admin/listes-scolaires`           | `ListesScolairesList.tsx`          |
| `/admin/produits`                   | `ProduitsBrowser.tsx`              |
| `/admin/blog`, `/admin/blog/[id]`   | `BlogList.tsx`, `BlogEditor.tsx`   |
| `/admin/stock-boutique`             | `AdminStockBoutique.tsx`           |
| `/admin/search-insights`            | `SearchInsightsView.tsx`           |
| `/admin/cutover`                    | `CutoverStatus.tsx`                |
| `/admin/notifications`              | `WaitlistView.tsx`                 |

### API routes clés

| Route                                     | Rôle                                                           |
| ----------------------------------------- | -------------------------------------------------------------- |
| `POST /api/demande-devis`                 | Insère `b2b_quotes` + Brevo notif                              |
| `POST /api/newsletter`                    | Abonnement Brevo liste                                         |
| `POST /api/notify-stock`                  | Inscription `notification_waitlist`                            |
| `POST /api/liste-scolaire/match`          | Match FTS — rate-limited 5/min                                 |
| `POST /api/liste-scolaire/ocr`            | OCR GPT-4o-mini — rate-limited 5/min                           |
| `GET  /api/products/[id]/similar`         | Reco pgvector — JIT embedding                                  |
| `POST /api/products/search-semantic`      | Recherche sémantique embedding                                 |
| `POST /api/search/track`                  | Search Intelligence capture                                    |
| `POST /api/search/click`                  | Click-through tracking                                         |
| `POST /api/cart/track`                    | Persist `cart_sessions` pour abandon                           |
| `POST /api/webhooks/shopify-order`        | Webhook → upsert `shopify_orders`                              |
| `GET  /api/health`                        | JSON statut Supabase + Shopify                                 |
| `GET  /api/me/orders`, `/api/me/wishlist` | Compte client (Bearer auth requis)                             |
| Crons                                     | `api/cron/abandoned-cart-emails.ts`, `back-in-stock-emails.ts` |
| Admin API                                 | `api/admin/**` — Bearer + `is_admin()` RPC                     |

### Sitemaps SSR

`/sitemap-index.xml`, `/sitemap-products-[page].xml`, `/sitemap-categories.xml`, `/sitemap-blog.xml`, `/sitemap-static.xml` — tous dans `src/pages/sitemap-*.xml.ts`.

---

## 4. Composants — responsabilités

### `account/`

| Composant              | Rôle                                           |
| ---------------------- | ---------------------------------------------- |
| `AccountDashboard.tsx` | Dashboard compte : orders list, liens          |
| `LoginForm.tsx`        | Formulaire login Supabase Auth                 |
| `RegisterForm.tsx`     | Inscription avec flag `isPro` + SIRET          |
| `OrderDetail.tsx`      | Détail commande depuis `shopify_orders`        |
| `WishlistList.tsx`     | Favoris persistés Supabase (`wishlists` table) |

### `admin/`

| Composant                | Rôle                                          |
| ------------------------ | --------------------------------------------- |
| `AdminGuard.tsx`         | HOC — vérifie Bearer token + `is_admin()` RPC |
| `AdminDashboard.tsx`     | KPIs dashboard (stats API `/api/admin/stats`) |
| `DevisList/Detail.tsx`   | CRUD b2b_quotes avec statuts                  |
| `CommandesList.tsx`      | Liste `shopify_orders` via API admin          |
| `ProduitsBrowser.tsx`    | Parcours catalogue admin + trigger sync       |
| `BlogEditor.tsx`         | Éditeur Markdown + génération IA              |
| `SearchInsightsView.tsx` | Vues SQL `v_search_*`                         |
| `CutoverStatus.tsx`      | Checklist GO/NO-GO cutover temps réel         |

### `cart/`

| Composant          | Rôle                                                      |
| ------------------ | --------------------------------------------------------- |
| `CartTrigger.tsx`  | Badge icône panier — lit `useCartItemsCount()`            |
| `CartDrawer.tsx`   | Panneau glissant panier complet                           |
| `CartLineItem.tsx` | Ligne article individuelle avec quantité                  |
| `CartSummary.tsx`  | Total + bouton checkout (→ `checkoutUrl` Shopify)         |
| `CartCleaner.tsx`  | Island silencieux — revalide cartId Shopify au chargement |

### `catalogue/`

| Composant                 | Rôle                                                  |
| ------------------------- | ----------------------------------------------------- |
| `CatalogueFilters.astro`  | Sidebar filtres (category, brand, prix, stock, promo) |
| `Pagination.astro`        | Pagination paginée avec lien href                     |
| `SortSelect.astro`        | Tri (pertinence / prix asc/desc / récent)             |
| `SemanticSuggestions.tsx` | Suggestions IA si 0 résultats FTS                     |
| `SearchTracker.astro`     | Script inline — track côté SSR via URL params         |

### `home/`

| Composant                     | Rôle                                      |
| ----------------------------- | ----------------------------------------- |
| `HeroSlider.tsx`              | Carrousel plein-écran avec autoplay       |
| `CategoryUniversGridV5.astro` | Grille univers catégories                 |
| `PromoBlocksV5.astro`         | Blocs promotionnels statiques             |
| `B2bCalloutV5.astro`          | Bannière appel à l'action B2B             |
| `TestimonialsV5.tsx`          | Témoignages clients carrousel             |
| `TrustStripV5.astro`          | Bande de réassurance                      |
| `NewsletterCardV5.astro`      | CTA newsletter (→ `NewsletterSignup.tsx`) |

### `layout/`

| Composant                      | Rôle                                               |
| ------------------------------ | -------------------------------------------------- |
| `Header.astro`                 | Nav principale, logo, icônes cart/account/wishlist |
| `Footer.astro`                 | Colonnes infos, légal, réseaux sociaux             |
| `Marquee.astro`                | Bandeau texte défilant CSS pur                     |
| `MobileMenu.tsx`               | Drawer hamburger mobile                            |
| `HeaderSearchAutocomplete.tsx` | Recherche avec suggestions + trackSearch()         |
| `AccountTrigger.tsx`           | Icône compte — redirige selon auth state           |
| `WishlistTrigger.tsx`          | Badge favoris                                      |
| `PriceModeToggle.tsx`          | Toggle HT/TTC — écrit `body[data-price-mode]`      |
| `NewsletterSignup.tsx`         | Formulaire abonnement Brevo                        |

### `product/`

| Composant                   | Rôle                                                   |
| --------------------------- | ------------------------------------------------------ |
| `ProductCard.astro`         | Carte catalogue : image CDN, prix, badge, stock        |
| `PriceDisplay.astro`        | Affichage HT/TTC via CSS `data-price-mode` (0 JS)      |
| `StockBadge.astro`          | Badge stock (in_stock / low / out)                     |
| `AddToCartButton.tsx`       | Bouton ajout panier — appelle `useCartStore.addLine()` |
| `ImageGallery.tsx`          | Galerie fiche produit (miniatures + zoom)              |
| `WishlistButton.tsx`        | Toggle favoris — appelle `useWishlistStore.toggle()`   |
| `SimilarProductsAI.tsx`     | Recommandations IA via `/api/products/[id]/similar`    |
| `NotifyBackInStock.tsx`     | Form inscription `notification_waitlist`               |
| `RecentlyViewedSection.tsx` | Carousel produits vus récemment (30j)                  |
| `RecentlyViewedTracker.tsx` | Island silencieux — persist dans `recentlyViewedStore` |

### `school-list/`

`SchoolListMatcher.tsx` — Formulaire upload texte/OCR + appels `/api/liste-scolaire/match` + `/ocr`.

### `seo/`

`SEO.astro` — Balises meta, OG, canonical, JSON-LD injection.

### `tampon/`

`TamponDesigner.tsx` — Canvas SVG tampon (sans Konva en V1), envoi devis via `/api/tampon/order`.

### `ui/`

Composants partagés : `Button`, `Badge`, `Card`, `Input`, `Toaster`, `BackToTop`, `PwaInstallPrompt`, `CdnImage`.

---

## 5. lib/ — utilitaires et API exposées

| Fichier               | API exportée / rôle                                                                                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase.ts`         | `supabaseServer` — client service role (SSR uniquement)                                                                                                                                                                                             |
| `supabase-browser.ts` | `supabaseBrowser` — client anon + RLS (React islands)                                                                                                                                                                                               |
| `shopify.ts`          | `shopifyClient`, `shopifyFetch<T>()` — wrapper GraphQL avec gestion erreurs                                                                                                                                                                         |
| `shopify-cart.ts`     | `cartCreate`, `cartGet`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`                                                                                                                                                                       |
| `queries.ts`          | `fetchCatalogue()`, `fetchProductBySlug()`, `fetchRelatedProducts()`, `fetchRootCategories()`, `fetchDistinctCategoryNames()`, `fetchDistinctBrands()`, `getStockState()`, `getDisplayPrices()`, `productHref()`, `productImage()`, sitemap helpers |
| `pricing.ts`          | `computeDisplayPrice()`, `fetchPricingCoefficients()`, `invalidatePricingCache()` — règle : manual > cost×coef > public_price_ttc > price_ttc                                                                                                       |
| `embeddings.ts`       | `generateEmbedding()`, `ensureProductEmbedding()`, `buildEmbeddingSource()`                                                                                                                                                                         |
| `search-tracking.ts`  | `trackSearch()`, `trackClick()` — client-side, sessionStorage (exempté CNIL)                                                                                                                                                                        |
| `brevo.ts`            | `sendTransactionalEmail()`, `escapeHtml()` — emails via Brevo API v3                                                                                                                                                                                |
| `admin-api.ts`        | `requireAdmin()` — valide Bearer token + `is_admin()` RPC                                                                                                                                                                                           |
| `admin-fetch.ts`      | Helpers fetch authentifié côté admin client                                                                                                                                                                                                         |
| `admin-format.ts`     | `eurFmt`, `numFmt`, `dateFmtShort`, `dateTimeFmt` — Intl formatters partagés                                                                                                                                                                        |
| `rate-limit.ts`       | `rateLimit()`, `extractClientIp()`, `RATE_LIMITS` — token-bucket in-memory                                                                                                                                                                          |
| `schema.ts`           | `organizationSchema()`, `localBusinessSchema()`, `productSchema()`, `breadcrumbSchema()`, `faqSchema()`, `itemListSchema()`, `websiteSchema()` — JSON-LD                                                                                            |
| `cdn-image.ts`        | `cdnImage()`, `cdnSrcSet()` — Netlify Image CDN transform URLs                                                                                                                                                                                      |
| `utils.ts`            | `cn()` (Tailwind merge), `formatPrice()`, `formatDate()`, `slugify()`                                                                                                                                                                               |
| `logger.ts`           | `logError(scope, message, err)` — stderr + Sentry forward                                                                                                                                                                                           |
| `order-status.ts`     | `formatOrderStatus()`, `orderStatusTone()` — labels FR Shopify statuts                                                                                                                                                                              |
| `blog.ts`             | CRUD blog_posts Supabase (list, bySlug, create, update, delete, generateWithAI)                                                                                                                                                                     |
| `csv-export.ts`       | Export CSV admin commandes/devis                                                                                                                                                                                                                    |
| `cron-auth.ts`        | Validation secret cron pour endpoints cron API                                                                                                                                                                                                      |
| `origin-guard.ts`     | Validation HMAC webhook Shopify                                                                                                                                                                                                                     |

---

## 6. Stores Zustand (`src/stores/`)

| Store                    | Persisté      | Responsabilité                                       |
| ------------------------ | ------------- | ---------------------------------------------------- | ------------------------- |
| `cartStore.ts`           | localStorage  | État panier complet + mutations Shopify Storefront   |
| `authStore.ts`           | Non           | `user: AuthUser                                      | null`+`setUser`, `logout` |
| `wishlistStore.ts`       | Non (serveur) | Set `productIds` + `load()`, `toggle()`, `isSaved()` |
| `priceModeStore.ts`      | localStorage  | Mode HT/TTC + sync `body[data-price-mode]`           |
| `recentlyViewedStore.ts` | localStorage  | Array produits vus (30j, max 10)                     |
| `toastStore.ts`          | Non           | File de toasts : `toast.success/error/info()`        |

---

## 7. Types clés (`src/types/`)

| Fichier       | Types principaux                                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `database.ts` | `Product` (76 colonnes), `Category`, `B2BQuote`, `SchoolList`, `CartSession`, `ShopifyOrder`, `Wishlist`, `AdminUser`, `SearchQuery`, vues `v_search_*`, RPCs DB |
| `shopify.ts`  | `ShopifyProduct`, `ShopifyProductVariant`, `ShopifyCart`, `ShopifyCartLine`, `MoneyV2`                                                                           |
| `devis.ts`    | `DevisStatus`, `DEVIS_STATUSES`, `DEVIS_STATUS_LABELS`, `DEVIS_STATUS_TONES`, `DevisRow`, `DevisDetail`                                                          |
| `tampon.ts`   | `TamponShape`, `TamponLine`, `TamponDesign`, `TAMPON_FONTS`, `TAMPON_SHAPES`, `DEFAULT_TAMPON`                                                                   |
| `blog.ts`     | `BlogPost`, `BlogPostListItem`                                                                                                                                   |

---

## 8. Flux de données critiques

### F4 — Ajout panier

```
ProductCard / AddToCartButton.tsx
  → useCartStore.addLine(line, qty)
  → cartCreate() ou cartLinesAdd() [lib/shopify-cart.ts]
    → Shopify Storefront API (GraphQL)
  → mergeShopifyCart() → set store
  → trackCartSession() [POST /api/cart/track]
    → upsert cart_sessions [Supabase]
```

### F6 — Auth utilisateur

```
LoginForm.tsx / RegisterForm.tsx
  → supabaseBrowser.auth.signIn/Up()
  → onAuthStateChange() → useWishlistStore.load()
    → GET /api/me/wishlist [Bearer]
      → supabaseServer.from('wishlists') [RLS par user_id]
  → useAuthStore.setUser()
```

### F2/F3 — Catalogue SSR

```
Browser → Netlify → catalogue/[category].astro
  → fetchCatalogue({ category, page, sort, ... }) [lib/queries.ts]
    → supabaseServer.from('products') [FTS + filtres]
  → fetchPricingCoefficients() [lib/pricing.ts] — cache 5min
  → computeDisplayPrice(product, coefs) par produit
  → HTML rendu + JSON-LD itemListSchema()
```

### F7 — Devis B2B

```
devis.astro → formulaire
  → POST /api/demande-devis
    → supabaseServer.from('b2b_quotes').insert()
    → sendTransactionalEmail() [lib/brevo.ts]
    → redirect /merci
```

### Recherche sémantique

```
HeaderSearchAutocomplete.tsx
  → POST /api/products/search-semantic
    → generateEmbedding(query) [lib/embeddings.ts → OpenAI]
    → supabaseServer.rpc('search_products_semantic', { embedding, count })
    → produits triés par similarité cosinus
```

### Admin — auth

```
AdminGuard.tsx
  → supabaseBrowser.auth.getSession()
  → GET /api/admin/me [Bearer]
    → requireAdmin(request) [lib/admin-api.ts]
      → supabaseServer.rpc('is_admin', { p_user_id })
    → 401/403 si non autorisé
```

---

## 9. Sécurité — règles critiques

- `SUPABASE_SERVICE_ROLE_KEY` : uniquement `lib/supabase.ts`. Jamais dans islands React.
- `supabaseBrowser` : clé anon + RLS. Utilisable dans islands.
- `requireAdmin()` : obligatoire sur tous les endpoints `api/admin/**`.
- CSP défini en miroir dans `netlify.toml` (statique) et `src/middleware.ts` (SSR).
- `rateLimit()` : actif sur les endpoints coûteux (OCR, embed, match, forms).
- RLS Supabase actif — ne jamais désactiver même en dev.

---

## 10. Conventions à respecter

- Imports : `@/...` pour tout dans `src/`.
- Composants interactifs : `.tsx` (islands). Composants SSR purs : `.astro`.
- Pricing : passer par `computeDisplayPrice()` — jamais lire `price_ht` directement.
- Stock : lire `stock_online` (canal e-commerce), pas `stock_quantity` (colonne legacy).
- Commits : `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- CSS : classes Tailwind ou helpers `global.css` (`card-product`, `label-category`, `badge-new`, `price-ht-suffix`). Pas de `style` inline.
- Performance : `main.js < 50 KB gzipped` sur la home. Lighthouse mobile ≥ 90.
