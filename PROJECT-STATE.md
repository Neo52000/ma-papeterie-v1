# PROJECT-STATE — Ma Papeterie V1

> Snapshot **30 avril 2026** (D+11). Cible cutover **5 mai 2026** (D+16).

## Identité

- **Site** : https://ma-papeterie.fr (Astro 4 SSR sur Netlify, Supabase Pro, Shopify Headless, Stripe LIVE, Brevo)
- **Owner** : Élie Reine — `contact@ma-papeterie.fr` / `reine.elie@gmail.com`
- **Repo** : https://github.com/Neo52000/ma-papeterie-v1
- **Boutique physique** : 10 rue Toupot de Béveaux, 52000 Chaumont — `03 10 96 02 24`

## Stack

| Couche | Tech |
| --- | --- |
| Frontend | Astro 4.16 SSR, React 18 islands, Tailwind 3.4 |
| Hosting | Netlify (site `ma-papeterie-v1`, ID `12dd7fe5-f25b-4cd7-91ed-6e6bd6209411`) |
| DB | Supabase Pro (`mgojmkzovqgpipybelrr`, region `eu-west-3`, Postgres 17.6 + pgvector) |
| Commerce | Shopify Headless storefront `Papeterie Reine & Fils` (créée 26 févr) |
| Paiement | Stripe **LIVE** (via Shopify Checkout) |
| Mail | Brevo transactional + lists (free 300 credits/jour) |
| Observability | Sentry (project `ma-papeterie-web`, DSN actif) |
| Search/Reco | pgvector HNSW + OpenAI text-embedding-3-small (1536 dim) |

## Périmètre V1 — 8 features

| F# | Feature | Status |
| --- | --- | --- |
| F1 | Home | ✅ live |
| F2 | Catalogue (filtres, search, pagination) | ✅ live |
| F3 | Fiche produit + reco IA + similar | ✅ live |
| F4 | Panier + checkout (Shopify Storefront API) | ✅ live |
| F5 | Upload liste scolaire + OCR Vision | ✅ live |
| F6 | Compte client (login, /compte, wishlist, orders) | ✅ live |
| F7 | Devis B2B (form + Brevo) | ✅ live |
| F8 | Pages légales + SEO local + sitemaps | ✅ live |

## Bonus shippé hors SPEC V1

- **V2.1 critique** (mois 1 post-cutover anticipé) : CSP, Lighthouse CI, OG image, Sentry, security headers SSR (1 reste : backup Supabase weekly via PR #119)
- **V2.2 conversion** : Toasts, Image CDN AVIF/WebP, Mobile menu, Filtres avancés, Wishlist, Cart abandonné cron, Footer enrichi, Trust strip
- **V2.3 partiel** : Notify back-in-stock cron, Recently viewed, Newsletter Brevo, Order detail page, Playwright E2E, Admin SQL views, 500 page, Search recents, PWA install, Service worker
- **V2.3 IA** : OCR Vision GPT-4o-mini, Reco IA pgvector, Recherche sémantique (embeddings 100% pré-warmed)
- **Phase D** : Admin custom `/admin/*` avec AdminGuard Bearer (déroge à la règle "no admin custom" du SPEC)
- **Phase A** : Cutover monitoring `/admin/cutover` checklist GO/NO-GO
- **Phase C foundation** : `products.supplier` + `supplier_sku` + `lib/suppliers/alkor.ts` stub

## État cutover D+16

### ✅ Bloquants critiques résolus

| | |
| --- | --- |
| Sync Shopify ≥ 80% | ✅ 82.6% (9575/11590) |
| Stripe encaisse | ✅ LIVE |
| Auth Supabase Site URL + Redirect URLs | ✅ ma-papeterie.fr/** + localhost:4321 |
| Headers sécurité SSR (CSP, X-Frame, Referrer, Permissions, HSTS) | ✅ middleware Astro merged + déployé |
| Bus factor admin (≥ 2) | ✅ Élie + contact@ma-papeterie.fr |
| Brevo API key valide | ✅ `xkeysib-...`, IP allowlist disabled |
| Sentry observability | ✅ DSN actif, event smoke accepté |
| Shopify post-paiement redirect | ✅ Lovable Redirect Theme `settings_data.json` → ma-papeterie.fr |
| 1 seule storefront Headless | ✅ duplicate `Headless 02` supprimée |
| 0 domaine résiduel Shopify | ✅ `ma-papeterie-v1.netlify.app` retiré |
| Embeddings IA pré-warm | ✅ 11587/11587 (100%) |

### ⏳ Reste à faire (toi)

| # | Item | Effort | Bloquant ? |
| --- | --- | --- | --- |
| 1 | Brevo DMARC + 2 templates (panier abandonné, retour stock) + 1 liste newsletter + 5 vars Netlify | ~45 min | ⚠ sans : devis sans mail, newsletter cassée, cron emails 500 |
| 2 | PR #119 backup Supabase : add `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` GH secrets + trigger manual run | 5 min | Recommandé pour résilience |
| 3 | Test E2E coupon 100% le jour J | 5 min | Confirme parcours complet |
| 4 | Annonces FB + Insta jour J | manuel | Prep marketing |
| 5 | Sitemap GSC submission post-cutover | 10 min | Non bloquant |
| 6 | Rotation `NETLIFY_AUTH_TOKEN` post-cutover | 30 sec | Sécurité (token compromis dans chat) |

## Volontairement non-implémenté (cf BACKLOG-V2.md)

| Item | Pourquoi |
| --- | --- |
| Multi-livraison (Mondial Relay/Colissimo/C&C) | 4j d'effort, Stripe générique suffit V1 |
| Linking compte Supabase ↔ Shopify customer ID | Email matching V1 fonctionne |
| Page `/commande/[id]` détail + facture PDF | Basique présent, facture PDF = V2 |
| Refactor pricing SSOT RPC `compute_display_price` | RPC existe, TS + SQL toujours en double |
| Newsletter segmentée B2C/B2B/écoles | Liste unique V1 |
| Alkor parser + import | Specs Alkor non reçues |
| Konva tampons, fine art, plaques, papier peint, patrons | Hors scope V1 |
| Finder consommables, scraping prix | Hors scope V1 |
| Amazon, SMS, blog CMS, social automation | Hors scope V1 |
| Leasing B2B, génération PDF devis auto | Hors scope V1 |
| CRM/ERP, dashboard KPI custom | Supabase Studio + Shopify suffit |

## Infrastructure clé

### Env vars

- **Netlify** : 18 vars (9 critiques, 9 optionnelles). Liste exhaustive dans `docs/CUTOVER-CHECKLIST.md`.
- **GitHub Actions secrets** : 10 vars (sync Shopify + cron emails + backup Supabase post-merge #119).
- **`PUBLIC_SITE_URL`** : aligné `https://ma-papeterie.fr` Netlify + GitHub.

### Workflows GitHub Actions

- `verify.yml` — typecheck + lint + build sur PR
- `audit.yml` — npm audit sur PR
- `smoke.yml` — Playwright E2E sur PR
- `lighthouse.yml` — Lighthouse CI sur PR (cap ≥ 90)
- `shopify-sync.yml` — cron 03:00 UTC + manual dispatch
- `abandoned-cart.yml` — cron horaire (cron emails)
- `back-in-stock.yml` — cron 4h
- `supabase-backup.yml` — cron dimanche 03:00 UTC (PR #119, à merger)

### Commandes utiles

```bash
# Sync Shopify manuel batch 200
gh workflow run shopify-sync.yml -f mode=full -f max=200

# Backfill embeddings (rerun jusqu'à 100%)
node scripts/backfill-embeddings.mjs

# Dump backup ad-hoc
gh workflow run supabase-backup.yml

# Cutover URL flip (rollback en cas de pb)
NETLIFY_AUTH_TOKEN=xxx ./scripts/cutover-site-url.sh --rollback

# Smoke prod headers
curl -sI https://ma-papeterie.fr/ | grep -iE "^(content-security|x-frame|referrer-policy|permissions-policy|strict-transport):"
```

### URLs clés

| | |
| --- | --- |
| Site prod | https://ma-papeterie.fr |
| Admin | https://ma-papeterie.fr/admin/ |
| Cutover dashboard | https://ma-papeterie.fr/admin/cutover/ |
| Health | https://ma-papeterie.fr/api/health |
| Sitemap | https://ma-papeterie.fr/sitemap-index.xml |
| Netlify dashboard | https://app.netlify.com/sites/ma-papeterie-v1 |
| Supabase dashboard | https://supabase.com/dashboard/project/mgojmkzovqgpipybelrr |
| Shopify admin | https://admin.shopify.com/store/ma-papeterie52 |
| GitHub Actions | https://github.com/Neo52000/ma-papeterie-v1/actions |
| Sentry | https://sentry.io/organizations/papeterie-reine-fils/ |
| Brevo | https://app.brevo.com |

## Risques connus

- **Astro 4.16 vulns** : 9 high severity dans npm audit. Aucune ne s'applique au code (analyse dans memory). Upgrade Astro 6 = V2.1 stabilization week (2-3 jours, breaking changes).
- **Free tier Supabase write timeouts** : embeddings backfill timeout au-delà de 500-3000 updates par run. Pas un problème runtime (JIT couvre), juste pour les batchs.
- **Brevo free tier** : 300 credits/jour. Si volume mail dépasse → upgrade Lite (15€/mois, 20k mails).
- **Netlify Functions cold start** : TTFB home ~600ms-1.2s, catalogue ~2s. Acceptable V1, à profiler V2.

## Documentation existante

`docs/` contient toute la doc opérationnelle. Quelques pointers :

- `docs/SPEC-V1.md` — spec figée 8 features
- `docs/ARCHITECTURE.md` — diagramme stack
- `docs/CUTOVER-CHECKLIST.md` — checklist détaillée
- `docs/SUPABASE-BACKUP.md` — procédure backup + restore (PR #119)
- `docs/SENTRY-SETUP.md` — config observability
- `docs/ABANDONED-CART-EMAIL.md` + `docs/BACK-IN-STOCK-EMAIL.md` — cron emails
- `docs/ALKOR-INTEGRATION.md` — Phase C en attente

`BACKLOG-V2.md` — roadmap V2.1/V2.2/V2.3 priorisée + items reportés explicitement.

`SESSION-JOURNAL.md` — log des sessions de dev (à compléter régulièrement).

## Dernière session de dev (30 avril)

8h de cutover prep. Commits sur `main` :

- PR #114 — `chore: add cutover-site-url script`
- PR #115 — `fix: apply security headers on SSR responses via middleware`
- PR #116 — `fix(admin): cutover-status sync count + env var names`
- PR #117 — `fix(admin): drop SHOPIFY_ADMIN_ACCESS_TOKEN from cutover-status checks`
- PR #118 — `chore: add backfill-embeddings script`
- PR #119 — `feat: weekly off-site Supabase backup` (en review)

Configs prod corrigées :
- Lovable Redirect Theme `settings_data.json` → ma-papeterie.fr
- Supabase Auth Site URL + wildcard redirects
- Brevo SMTP→API key swap + IP allowlist disabled
- 9 GitHub secrets vérifiés/alignés
- 1 admin ajouté (bus factor)
- 1 Headless storefront supprimée (duplicate)
- 1 domaine Shopify résiduel supprimé

Données prod :
- Sync Shopify : 28% → 82.6% (+6300 produits)
- Embeddings IA : 0% → 100% (11587 backfillés)
