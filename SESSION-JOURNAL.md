# Session journal — V1 ma-papeterie.fr

> Journal cumulé des sessions de développement V1. Sessions antérieures
> consolidées dans `docs/PHASE-2-FINDINGS.md` et `docs/PHASE-3-FINDINGS.md`.
> À mettre à jour à la fin de chaque session pour conserver le contexte
> entre les conversations Claude.

## 2026-04-29 (mercredi, fin journée — total 47 PRs)

### V2.2 batch (PRs #49–55)

Toasts, Header dédup, Image CDN AVIF/WebP, Mobile menu drawer, Filtres
avancés multi-select + price range, Wishlist, Cart abandonné Brevo cron.

### Polish UX (PRs #56–67)

Logo header, Footer trust+social, Trust strip homepage, Wishlist trigger,
404 polish, Empty state recherche, Devis prefill, SIRET/TVA/tél réels,
Sentry conditionnel, **canonical via PUBLIC_SITE_URL** (fix critique
cutover), Form double-submit guard, Honeypot anti-spam.

### V2.3 partiel (PRs #68–73)

Image CDN tous thumbnails, Notify-back-in-stock (table + form + API),
Recently viewed Zustand persist, Newsletter footer Brevo, Cron back-in-stock
emails (4h), Order detail page `/compte/commandes/[id]`.

### Polish + perf (PRs #76–97)

- #76 SESSION-JOURNAL · #77 Playwright E2E setup
- #78 Vues SQL admin Supabase Studio (`v_admin_*`)
- #79 Active nav indicator aria-current
- #80 /merci cross-sell · #81 page 500 brandée
- #82 OG image dynamique catégories
- #83 Recherches récentes header autocomplete (localStorage)
- #84 Back-to-top button · #85 Cart drawer focus trap
- #86 PWA install prompt custom · #87 LCP eager above-fold
- #88 SEO noindex search/filter combos
- #89 Sitemap image extension
- #90 Smart redirect dead products + aria-busy forms
- #91 Service worker offline shell + page hors ligne
- #92 Focus rings WCAG 2.4.7 · #94 WishlistButton client:visible
- #95 robots.txt tightened · #96 WebSite + SearchAction schema
- #97 Pagination/sort preserve category path (bug fix)

### Setup user requis (env Netlify post-merge)

| Var                                | Pour               | Doc                            |
| ---------------------------------- | ------------------ | ------------------------------ |
| `PUBLIC_SENTRY_DSN`                | Sentry             | `docs/SENTRY-SETUP.md`         |
| `CRON_SECRET`                      | Cron workflows     | `docs/ABANDONED-CART-EMAIL.md` |
| `BREVO_ABANDONED_CART_TEMPLATE_ID` | Cart abandonné     | `docs/ABANDONED-CART-EMAIL.md` |
| `BREVO_BACK_IN_STOCK_TEMPLATE_ID`  | Back-in-stock cron | `docs/BACK-IN-STOCK-EMAIL.md`  |
| `BREVO_NEWSLETTER_LIST_ID`         | Newsletter footer  | `docs/NEWSLETTER-SETUP.md`     |

GitHub secrets : `CRON_SECRET` (même valeur), `PUBLIC_SITE_URL`.

### Cutover D+16 actions ops

1. Custom domain ma-papeterie.fr → Netlify DNS
2. Update `PUBLIC_SITE_URL=https://ma-papeterie.fr` Netlify + redeploy
3. Shopify Payments live + Marketing Automations + Return URL
4. Bulk sync : 10 runs déclenchés via `gh workflow run` à 19:11 (mercredi
   soir, ~5000 produits attendus overnight). Compléter via UI demain matin.
5. Supabase Auth Site URL + redirect URLs

### Vues SQL admin (cf. `docs/ADMIN-VIEWS.md`)

À ouvrir directement dans https://supabase.com/dashboard/project/mgojmkzovqgpipybelrr/editor :

- `v_admin_devis_pending` (devis B2B à traiter)
- `v_admin_carts_abandoned_24h`
- `v_admin_notify_stock_subscribers`
- `v_admin_top_wishlist`
- `v_admin_orders_30d`

---

## 2026-04-29 (mercredi, big batch V2.2 + V2.3)

### V2.2 batch (PRs #49–#55)

- #49 Toasts notifications · #50 Header dédup · #51 Image CDN AVIF/WebP
- #52 Mobile menu drawer · #53 Filtres avancés multi-select + price range
- #54 Wishlist (table + RLS + API + UI) · #55 Cart abandonné Brevo cron

### Polish UX (PRs #56–#67)

- #56 Logo header (V5 png via Netlify CDN srcset)
- #57 Footer trust badges + contact + social
- #58 Trust strip homepage + count produits dynamique
- #59 Wishlist trigger header (auth-gated)
- #60 404 polish (search + suggestions)
- #61 Empty state recherche (3 CTAs)
- #62 Devis prefill `?recherche=` du PR #61
- #63 SIRET 100 208 883 00015 + TVA FR90100208883 + tél 03 10 96 02 24
- #64 Sentry conditionnel (skip si DSN absent)
- #65 **Fix critique cutover** : canonical via `PUBLIC_SITE_URL`
- #66 Form submit double-submit guard
- #67 Honeypot anti-spam

### V2.3 partiel (PRs #68–#73)

- #68 Image CDN tous thumbnails (cart, favoris, autocomplete)
- #69 Notify-back-in-stock (migration + form + API)
- #70 Recently viewed products (Zustand persist + carousel)
- #71 Newsletter footer Brevo signup
- #72 Cron back-in-stock emails (4h)
- #73 Order detail page `/compte/commandes/[id]`

### Setup user requis (env Netlify)

| Var                                | Pour               | Doc                            |
| ---------------------------------- | ------------------ | ------------------------------ |
| `PUBLIC_SENTRY_DSN`                | Sentry             | `docs/SENTRY-SETUP.md`         |
| `CRON_SECRET`                      | Cron workflows     | `docs/ABANDONED-CART-EMAIL.md` |
| `BREVO_ABANDONED_CART_TEMPLATE_ID` | Cart abandonné     | `docs/ABANDONED-CART-EMAIL.md` |
| `BREVO_BACK_IN_STOCK_TEMPLATE_ID`  | Back-in-stock cron | `docs/BACK-IN-STOCK-EMAIL.md`  |
| `BREVO_NEWSLETTER_LIST_ID`         | Newsletter footer  | `docs/NEWSLETTER-SETUP.md`     |

GitHub secrets : `CRON_SECRET` (même valeur), `PUBLIC_SITE_URL`.

### Cutover D+16 actions ops

1. Custom domain ma-papeterie.fr → Netlify DNS
2. Update `PUBLIC_SITE_URL=https://ma-papeterie.fr` Netlify + redeploy
3. Shopify Payments live + Marketing Automations + Return URL
4. Bulk sync `gh workflow run shopify-sync.yml -f mode=full -f max=500` (~22 runs)
5. Supabase Auth Site URL + redirect URLs

---

## 2026-04-28 (lundi soir, fin journée)

### Setup cutover réalisé

- ✅ Bulk sync lancé (5 runs en background, ~2500 produits supplémentaires)
- ✅ Webhook Shopify créé + secret Netlify configuré (test 401 OK)
- ✅ Stripe créé + KYC + activé dans Shopify (test paiement E2E OK)
- ✅ Return URL Shopify configuré
- ✅ Supabase Auth redirect URLs configurées
- ✅ Test E2E parcours achat complet validé
- [ABANDONED EMAIL : OK / Reporté demain]

### État cutover

- 🟢 Bloc 1 (paiement) : Stripe live
- 🟢 Bloc 2 (webhook) : Configured + tested
- 🟡 Bloc 3 (bulk sync) : 4.3% → ~25-50% (à finir nuit + demain)
- 🟢 Bloc 4 (légal) : Mentions complètes en prod (placeholders code à nettoyer plus tard)
- 🟢 Bloc 5 (auth) : Redirect URLs OK

### À faire demain

- Lancer 5 nouveaux runs bulk sync
- Vérifier % sync produits
- Préparer cutover DNS (date cible : ?)

### Décisions

- Provider : Stripe (KYC OK)
- Cible cutover : à confirmer demain selon avancement bulk sync
