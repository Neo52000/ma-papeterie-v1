# Cutover Checklist — V1 → ma-papeterie.fr

> Liste consolidée des actions humaines (UI dashboards, dashboards externes,
> DNS, légal) à exécuter avant et pendant le cutover D+16.
>
> Généré 2026-04-28 après livraison F1-F8 + polish a11y/perf. À ouvrir
> AU FUR ET À MESURE et cocher au crayon.

## Inventaire éclair de ce qui est déjà livré côté code

| Item                                             | Statut                  | Référence                     |
| ------------------------------------------------ | ----------------------- | ----------------------------- |
| Site Astro 4 SSR + React 18 + Tailwind           | ✅ déployé Netlify      | `ma-papeterie-v1.netlify.app` |
| Catalogue 11 587 produits visibles + facets      | ✅                      | F2 + PR #22 RPCs              |
| Cart drawer Shopify Storefront API               | ✅ E2E payé             | F4 + PR #18-#20               |
| Sync CLI Supabase → Shopify + cron nightly       | ✅ workflow + script    | PR #21 + #26                  |
| Webhook orders Shopify → Supabase + Brevo        | ✅ endpoint + table     | PR #23                        |
| Page /merci + clearCart auto                     | ✅                      | PR #24                        |
| Cart session tracking                            | ✅ table cart_sessions  | PR #25                        |
| 6 pages légales + sitemap-static                 | ✅ avec `[à compléter]` | PR #27                        |
| Compte client (auth Supabase + /compte + orders) | ✅                      | PR #28                        |
| Liste scolaire matcher live                      | ✅                      | PR #29                        |
| Polish a11y + perf (Lighthouse + WCAG batch 1)   | ✅                      | PR #30                        |

## Actions Toi (Élie) — à faire avant ou pendant le cutover

### A. Setup Shopify Admin (~30 min)

Store : `ma-papeterie52.myshopify.com` (alias DNS : `ma-papeterie-pro-boutique-hcd1j`).

#### A.1 — Activer un provider de paiement (BLOQUANT pour vendre)

- [ ] Settings → Payments → activer Shopify Payments OU Stripe OU Bogus Gateway (test only)
- [ ] Tester un paiement de bout en bout en mode test
- [ ] Vérifier qu'une commande arrive bien dans Orders + qu'un email Brevo est reçu (via le webhook PR #23)

#### A.2 — Créer les webhooks orders → notre endpoint

URL endpoint : `https://ma-papeterie-v1.netlify.app/api/webhooks/shopify-order`
(remplacer par `https://ma-papeterie.fr/...` au cutover)

- [ ] Settings → Notifications → Webhooks → **Create webhook** : event `Order creation`, format JSON, URL ci-dessus
- [ ] **Copier le secret généré**
- [ ] Idem pour `Order payment` (peut réutiliser le même secret)
- [ ] Coller le secret dans Netlify env var `SHOPIFY_WEBHOOK_SECRET` (cf §B.1)

#### A.3 — Activer abandoned checkout email natif

- [ ] Marketing → Automations → Create automation → preset **Abandoned checkout**
- [ ] Délai recommandé : 1h
- [ ] Activer

#### A.4 — Configurer le return URL post-checkout

- [ ] Settings → Checkout → section **Order status URL** (ou similaire selon version)
- [ ] Valeur staging : `https://ma-papeterie-v1.netlify.app/merci`
- [ ] Au cutover : `https://ma-papeterie.fr/merci`

#### A.5 — Vérifier la publication des produits sur le canal Headless

Le canal "Storefront V1 Headless" est créé par l'app du même nom. Tous les
produits que tu veux vendre via le site V1 doivent y être publiés.

- [ ] Produits → filtrer par tag `supabase-sync` OU sélectionner tous → bouton "Plus d'actions" → "Modifier les canaux" → cocher "Storefront V1 Headless" / "Papeterie Reine & Fils"
- [ ] Le sync nightly (cf §B.3) publie automatiquement les nouveaux produits, mais le bulk catch-up initial nécessite cette manip OU un run manuel du workflow

### B. Setup Netlify (~10 min)

URL : https://app.netlify.com/sites/ma-papeterie-v1

#### B.1 — Ajouter SHOPIFY_WEBHOOK_SECRET

- [ ] Site settings → Environment variables → Add variable
- [ ] Key : `SHOPIFY_WEBHOOK_SECRET`
- [ ] Value : copier depuis §A.2
- [ ] Scopes : All scopes
- [ ] Sensitive : ON
- [ ] Trigger deploy → vérifier `/api/webhooks/shopify-order` ne retourne plus "Server misconfigured" sur un POST test

#### B.2 — Au cutover D+16 : changer PUBLIC_SITE_URL

- [ ] Modifier `PUBLIC_SITE_URL` de `https://ma-papeterie-v1.netlify.app` → `https://ma-papeterie.fr`
- [ ] Trigger deploy
- [ ] Vérifier le sitemap a bien les URLs `https://ma-papeterie.fr/...` (curl `/sitemap-static.xml`)

#### B.3 — Configurer le custom domain

- [ ] Site settings → Domain management → Add custom domain → `ma-papeterie.fr`
- [ ] Suivre les instructions DNS de Netlify (CNAME ou A records)
- [ ] HTTPS activé automatiquement via Let's Encrypt après propagation (~1h)

### C. Setup GitHub Actions (~5 min)

Pour activer le cron nightly Shopify Sync (workflow `.github/workflows/shopify-sync.yml`).

- [ ] Repo Settings → Secrets and variables → Actions → ajouter 6 secrets :

| Secret                            | Source                             | Notes                                      |
| --------------------------------- | ---------------------------------- | ------------------------------------------ |
| `SHOPIFY_SHOP_DOMAIN`             | `.env.local`                       | ex `ma-papeterie52.myshopify.com`          |
| `SHOPIFY_ADMIN_ACCESS_TOKEN`      | `.env.local` (Custom App Admin)    | `shpat_...`                                |
| `SHOPIFY_ADMIN_API_VERSION`       | `.env.local`                       | `2025-01`                                  |
| `SHOPIFY_HEADLESS_PUBLICATION_ID` | `.env.local`                       | `175324004596`                             |
| `SUPABASE_URL`                    | `.env.local` (PUBLIC_SUPABASE_URL) | `https://mgojmkzovqgpipybelrr.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY`       | `.env.local`                       | clé service_role                           |

- [ ] Tester : Actions → Shopify Sync (nightly) → Run workflow → mode=stale, max=5 → vérifier vert
- [ ] Cron auto à 03h00 UTC chaque nuit

### D. Bulk catch-up des 11 575 produits non-syncés (~12h cumulées en background)

Une fois §C OK, lancer le bulk via workflow_dispatch :

- [ ] Actions → Shopify Sync → Run workflow → mode=`full`, max=`500` → run
- [ ] Attendre fin (~30 min/run)
- [ ] Re-lancer jusqu'à "Nothing to sync. Exit clean." (~24 runs)
- [ ] Vérif Supabase : `SELECT COUNT(*) FROM products WHERE shopify_variant_id IS NOT NULL` → doit converger vers 11 587

Alternative rapide : laisser tourner en background sans surveillance (le concurrency group `shopify-sync` empêche les runs parallèles, le workflow est idempotent via `shopify_order_id UNIQUE`).

### E. Setup Supabase Auth (~5 min)

Pour que les redirects email confirmation pointent vers le bon domaine.

- [ ] Supabase Dashboard → Authentication → URL Configuration → Redirect URLs → ajouter :
  - `https://ma-papeterie-v1.netlify.app/compte` (staging)
  - `https://ma-papeterie.fr/compte` (cutover)
  - `https://ma-papeterie.fr/connexion`
- [ ] Site URL → `https://ma-papeterie.fr` au cutover

### F. Compléter les `[à compléter]` légaux (~30 min, JURIDIQUE)

Fichiers à éditer (placeholders explicites `[à compléter]`) :

- [ ] `src/pages/mentions-legales.astro` : SIRET, TVA intracommunautaire, forme juridique, capital social, gérant, téléphone
- [ ] `src/pages/cgv.astro` : date dernière MAJ, nom du médiateur de la consommation
- [ ] `src/pages/contact.astro` : numéro de téléphone

Optionnel mais **fortement recommandé** :

- [ ] Faire valider le contenu CGV + Politique de confidentialité par un avocat (templates juridiquement OK mais une validation pro évite toute mauvaise surprise)

### G. Test E2E avant cutover (~30 min)

Sur preview Netlify ou staging :

- [ ] Browse `/` → CTA fonctionnels, `/catalogue` → facets visibles, `/produit/<slug>` → image + prix + bouton add
- [ ] Add to cart sur 1 produit synced → drawer s'ouvre → +/- qty marche → "Passer au paiement" → checkout Shopify → paiement test → page "Merci" affichée → cart icon retombe à 0
- [ ] Email Brevo reçu côté commerçant
- [ ] Order visible dans Shopify Admin + dans table `shopify_orders` Supabase
- [ ] Créer un compte sur `/inscription` → recevoir email confirm → cliquer → `/compte` → voir l'order test
- [ ] `/liste-scolaire#matcher` → coller exemple → "Trouver les produits" → "Tout ajouter" → drawer
- [ ] `/devis` → soumettre form → vérifier email Brevo + insertion `b2b_quotes`
- [ ] `/liste-scolaire` (waitlist) → soumettre email → vérifier insertion `notification_waitlist`
- [ ] Lighthouse mobile : `/`, `/catalogue`, `/produit/<slug>` → score perf ≥ 90 (cf budget CLAUDE.md)

### H. Cutover D+16 (~30 min total + 1h propagation DNS)

Heure recommandée : **22h–06h Paris** (heure creuse).

- [ ] (T-30 min) Vérifier que toutes les actions A-G sont OK
- [ ] (T-15 min) Backup Supabase (`pg_dump` OU snapshot via dashboard)
- [ ] (T-0) DNS : modifier les enregistrements A / CNAME de `ma-papeterie.fr` chez le registrar pour pointer vers Netlify (cf instructions Netlify Domain management)
- [ ] (T+5 min) Suivre la propagation : `dig ma-papeterie.fr +short` doit retourner les IPs Netlify
- [ ] (T+15 min) Première résolution → site V1 servi sur `ma-papeterie.fr` au lieu de Lovable
- [ ] (T+20 min) Update :
  - Netlify env var `PUBLIC_SITE_URL` → `https://ma-papeterie.fr` (§B.2)
  - Shopify return URL → `https://ma-papeterie.fr/merci` (§A.4)
  - Supabase Auth Site URL + Redirect URLs (§E)
- [ ] (T+25 min) Trigger deploy Netlify pour rebuilder avec le nouveau `PUBLIC_SITE_URL`
- [ ] (T+30 min) Re-test E2E rapide sur le domaine final

### I. Post-cutover (~24h)

- [ ] Surveiller Sentry / Netlify function logs pour les erreurs 500
- [ ] Surveiller Shopify webhook deliveries → 200 attendus, retry si 5xx
- [ ] Surveiller Supabase Auth pour les sign-ups
- [ ] Surveiller orders dans `shopify_orders` vs Shopify Admin (pas de drift)
- [ ] Inspecter la rate de conversion cart → order (table `cart_sessions` vs `shopify_orders`) pour ajuster

## Rollback rapide si nécessaire

Si la prod cutover-ée présente un blocant majeur :

1. Netlify → Deploys → trouver le dernier deploy stable AVANT cutover → **Publish deploy**
2. DNS : revenir aux anciens enregistrements (TTL court conseillé en J-1 pour propagation rapide)
3. Restaurer le backup Supabase si données corrompues
4. Communiquer aux clients via email Brevo (pas de panique, retour boutique fonctionnelle)

## Hors scope V1 (à traiter post-cutover ou V2)

- Image CDN webp/avif (perte LCP score acceptable V1)
- font-display: swap override sur @fontsource (mesurer en prod d'abord)
- Cart abandonné Brevo custom (Shopify natif gère pour V1)
- Linking explicite compte Supabase ↔ customer Shopify (V1 fait par email)
- OCR liste scolaire image/PDF (V1 = texte uniquement)
- Compte client : favoris, adresses séparées, multi-utilisateur (V1 minimal)
- Bannière cookies si on ajoute du tracking tiers

## Memory references

À consulter en parallèle :

- `memory/project_shopify_stores_lovable_redirect.md`
- `memory/project_shopify_checkout_return_url.md`
