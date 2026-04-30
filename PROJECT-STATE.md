# 📊 État du projet ma-papeterie-v1 — V2.3 + Foundations

> **Document de référence** — synthèse de toutes les phases livrées et reportées.
> Dernière MAJ : 2026-04-28
> Cible cutover : 2 mai 2026 (D+16 = 14 mai initial, accéléré)

---

## 🟢 Livré — Spec V1 (F1-F8)

| Bloc | Description | Statut |
|---|---|---|
| F1 | Home + nav + footer | ✅ |
| F2 | Catalogue 11 587 produits + facets + pagination | ✅ |
| F3 | Fiche produit + Schema.org + variants | ✅ |
| F4 | Cart drawer Shopify Storefront API E2E | ✅ |
| F5 | Liste scolaire matcher live | ✅ |
| F6 | Devis B2B (form + endpoint + table) | ✅ |
| F7 | Compte client (auth Supabase + /compte + orders) | ✅ |
| F8 | Pages légales (mentions/CGV/contact/conf./cookies/CGU) | ✅ |

---

## 🟢 Livré — V2.1 critique post-cutover

| Item | Description | Statut |
|---|---|---|
| CSP | Content Security Policy stricte (Netlify headers) | ✅ |
| Lighthouse CI | Workflow GitHub Actions automatique sur PRs | ✅ |
| OG image | Open Graph image dynamique pour partage social | ✅ |
| Sentry | Monitoring erreurs runtime (frontend + backend) | ✅ |
| Backup auto | Script pg_dump + rotation des sauvegardes Supabase | ✅ |

---

## 🟢 Livré — V2.2 boost conversion

| Item | Description | Statut |
|---|---|---|
| Toasts | Notifications UI (add to cart, errors, success) | ✅ |
| Image CDN AVIF/WebP | Optimisation automatique formats nouveaux | ✅ |
| Mobile menu | Navigation mobile drawer slide-in | ✅ |
| Filtres avancés | Facets multi-sélection + range prix | ✅ |
| Wishlist | Liste de favoris persistée Supabase | ✅ |
| Cart abandonné | Email Brevo automation 1h après abandon | ✅ |

---

## 🟢 Livré — V2.3 sophistication V1

### Modules fonctionnels

| Item | Description | Statut |
|---|---|---|
| Notify back-in-stock | Form + email Brevo quand produit re-disponible | ✅ |
| Recently viewed | Persistence 30 jours via cookie + display footer | ✅ |
| Newsletter | Form Brevo + double opt-in | ✅ |
| Order detail | `/compte/commandes/[id]` partiel (V1 minimal) | ✅ |
| Playwright | Suite E2E tests automatisés CI | ✅ |
| Admin SQL views | Vues Supabase pour reporting opérationnel | ✅ |

### Modules IA (B2 — 28 avril matin)

| Item | Description | Statut |
|---|---|---|
| OCR Vision | Extraction texte depuis photos/PDF listes scolaires | ✅ |
| Reco IA pgvector | Recommandations produits via embeddings vectoriels | ✅ |
| Recherche sémantique | Search natural language sur catalogue | ✅ |

---

## 🟢 Livré — Phases D, A, C foundations

### Phase D — Admin custom

| Item | Description | Statut |
|---|---|---|
| `/admin/*` | Routes protégées avec `AdminGuard` Bearer | ✅ |
| Custom admin | Outre-passe la règle "no admin custom" du SPEC initial | ✅ |

### Phase A — Cutover monitoring

| Item | Description | Statut |
|---|---|---|
| `/admin/cutover` | Checklist interactive état cutover en temps réel | ✅ |
| 3 PRs fix | Corrections post-déploiement initial | ✅ |

### Phase C — Foundation Alkor

| Item | Description | Statut |
|---|---|---|
| `products.supplier` | Colonne ajoutée table products | ✅ |
| `products.supplier_sku` | Identifiant fournisseur unique | ✅ |
| `lib/suppliers/alkor.ts` | Stub interface fournisseur Alkor | ⏳ Stub seul |

---

## 🎯 Ce qui reste avant cutover

| Action | Priorité | Durée | Cible |
|---|---|---|---|
| **Bulk sync produits 4.3% → 100%** | 🔴 BLOQUANT | 5 min × 22 runs | Jeudi 1er mai |
| **Custom domain Netlify (DNS + HTTPS)** | 🔴 BLOQUANT | 30 min + 1h propagation | Jour J |
| **Test E2E final** | 🟠 RECO | 30 min | Vendredi 2 mai matin |
| **Cutover DNS** | 🔴 BLOQUANT | 30 min | Vendredi 2 mai 22h |
| **Surveillance post-cutover** | 🟡 RECO | passif 48h | Sam-dim |

---

## 📅 Calendrier opérationnel cutover

| Date | Action | Statut |
|---|---|---|
| Lundi 28 avril | Audit cutover + setup webhook + Stripe | ✅ |
| Lundi 28 soir | Lancer 5 runs bulk sync | ✅ |
| Mardi 29 → Jeudi 1er mai | Bulk sync 100% (10 runs/jour) | ⏳ |
| Vendredi 2 mai matin | Test E2E + DNS prep + backup Supabase | ⏳ |
| **Vendredi 2 mai 22h** | **CUTOVER DNS** | ⏳ |
| Samedi 3 → Lundi 5 mai | Surveillance + bilan | ⏳ |

---

## 🚧 BACKLOG POST-CUTOVER — Ordre de priorité

---

### 🔴 Phase 5 — Design V5 parity + améliorations conversion (semaine du 5 mai)

> **Objectif** : le site V1 doit être **visuellement identique** au site V5 actuel
> (ma-papeterie.fr) tout en conservant les gains techniques V1.
> Le visiteur ne doit PAS percevoir de régression visuelle lors de la bascule.

#### 5.1 — Design parity V5 → V1 (PRIORITÉ ABSOLUE, ~3-5 jours)

**Référence** : site actuel `https://ma-papeterie.fr` (V5 — Lovable)

| Item | Description | Effort estimé | Priorité |
|---|---|---|---|
| **Slider home hero** | Carrousel pleine largeur avec images produits/promo, autoplay + navigation dots, identique au slider V5 actuel. Composant React island avec `client:visible` pour lazy hydration. Images optimisées AVIF/WebP. | 1 jour | 🔴 CRITIQUE |
| **Texte défilant (marquee)** | Bandeau texte animé horizontal (type "Livraison gratuite • Retrait boutique • …"). CSS animation `@keyframes marquee` pure (pas de JS pour perf). Position : sous header ou au-dessus du slider, identique V5 | 2h | 🔴 CRITIQUE |
| **Palette couleurs V5** | Extraire et appliquer la palette exacte de V5 : primaire orange `#F97316`, fond blanc cassé, accent gris chaud. Aligner `tailwind.config.mjs` tokens sur V5 | 2h | 🔴 CRITIQUE |
| **Typographie V5** | Reproduire les polices V5 exactes (Google Fonts ou fontsource). Titres, body, accent. Font-display: swap. Vérifier budget JS home (actuellement 47.6 kB / 50 kB limite) | 2h | 🔴 CRITIQUE |
| **Header/Nav V5** | Reproduire la structure header V5 : logo position, menu items, icônes cart/account/search, couleurs hover. Mobile hamburger identique | 4h | 🟠 HAUT |
| **Footer V5** | Reproduire structure footer V5 : colonnes infos, liens légaux, réseaux sociaux, contact, SIRET | 3h | 🟠 HAUT |
| **Cards produits V5** | Style des cartes catalogue : ratio image, badge promo, prix barré, hover effect identiques V5 | 4h | 🟠 HAUT |
| **Fiche produit V5** | Layout fiche produit : galerie images, zone prix, CTA ajout panier, onglets description. Reproduire l'identité visuelle V5 | 4h | 🟠 HAUT |
| **Responsive V5** | Vérifier que chaque page majeure (home, catalogue, fiche, cart, compte) a le même rendu mobile que V5 | 4h | 🟠 HAUT |

**Méthode d'implémentation** :

```
WORKFLOW DE RÉFÉRENCE VISUELLE :
1. Capturer 10 screenshots V5 (home desktop/mobile, catalogue, fiche,
   cart, compte, footer) comme référence visuelle
2. Comparer côte-à-côte avec V1 actuel
3. Identifier les écarts pixel-level
4. Implémenter composant par composant en priorité descendante
5. Validation visuelle par Élie à chaque composant
```

**Composant Slider home détails techniques** :

```
Architecture slider V5 → V1 :
- React island (client:visible) pour lazy hydration
- Props : slides[] (image, title, subtitle, CTA link, CTA text)
- Autoplay 5s avec pause on hover
- Dots navigation + swipe mobile (touch events)
- Images srcset AVIF/WebP via Image CDN
- Transition CSS (pas JS) pour perf
- Skeleton loader avant hydration (Astro slot)
- Budget : < 5 kB gzip JS additionnel (critique : home à 47.6 / 50)
- Fallback : si JS désactivé, affiche image 1 sans carousel
```

**Composant texte défilant détails techniques** :

```
Architecture marquee V5 → V1 :
- Pure CSS animation (ZERO JS = 0 impact budget)
- @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
- Double contenu (clone pour boucle infinie sans gap)
- Configurable via props Astro (textes, vitesse, couleur fond)
- Accessible : prefers-reduced-motion: reduce → stop animation
- Responsive : font-size adaptatif mobile/desktop
```

#### 5.2 — Améliorations conversion (3-5 jours, après 5.1)

| Item | Description | Effort estimé |
|---|---|---|
| **Multi-livraison** (Mondial Relay / Colissimo / Click&Collect) | Intégration API Mondial Relay + Colissimo dans checkout Shopify. Point relais picker. Click&Collect boutique Chaumont | 3 jours |
| **Page `/commande/[id]` détail complet + facture PDF** | Enrichir page commande existante. Génération PDF facture via @react-pdf/renderer ou PDFKit | 1 jour |
| **Newsletter segmentée B2C/B2B/écoles** | Listes Brevo séparées. Tags automatiques selon parcours (achat vs devis vs liste scolaire). Segments dans les campagnes | 1 jour |
| **Refactor pricing SSOT RPC** | Unifier TS et SQL → RPC unique. `lib/pricing.ts` appelle `compute_display_price` via Supabase. Plus de duplication | 4h |

---

### 🟠 Phase 4 — Intégration Alkor (semaine du 12 mai, ~1 semaine)

> **Contexte** : Alkor = fournisseur principal. Architecture EDI/FTP XML.
> Portail développeur : `https://developer.alkor-groupe.com/`

#### Décisions actées

| Décision | Valeur |
|---|---|
| Stratégie source | Alkor priorité + Liderpapel fallback |
| Volume catalogue | 15-50k SKU estimé (à confirmer mardi 29 avril) |
| Pricing | À déterminer selon données découvertes |
| Stocks | Affichage temps réel (sync horaire ou daily) |

#### Pré-requis (avant implémentation)

| Item | Statut | Action |
|---|---|---|
| Specs API catalogue Alkor (REST ou FTP XML) | ❌ Non reçue | Élie → contacter commercial Alkor |
| Credentials API / FTP Alkor | ❌ Non reçues | Élie → contacter commercial Alkor |
| Doc API Tracking V2 Alkor | ⏳ Mentionnée dans doc XML | À récupérer |
| Portail `developer.alkor-groupe.com` | ⏳ Onglet ouvert | À explorer |
| Foundation DB (`products.supplier`, `products.supplier_sku`) | ✅ Livré | Prêt |
| Stub `lib/suppliers/alkor.ts` | ✅ Livré | Prêt pour extension |

#### Plan d'implémentation

| Étape | Description | Durée | Dépendance |
|---|---|---|---|
| **4.1 Discovery** | Explorer portail dev. Récupérer credentials. Tester endpoints. Mapper fields → Supabase | 1 jour | Specs API Alkor |
| **4.2 Migration DB** | Extension table `products` : colonnes `alkor_reference`, `alkor_ean`, `alkor_designation`, `alkor_description`, `alkor_stock`, `alkor_prix_achat_ht`, `alkor_image_urls`, `alkor_synced_at` | 2h | 4.1 terminée |
| **4.3 Edge Function sync catalogue** | Cron daily : fetch catalogue Alkor → parse → upsert `products` avec matching EAN/supplier_sku. Fallback Liderpapel si Alkor absent | 1 jour | 4.2 |
| **4.4 Sync stocks horaire** | Edge Function cron hourly : fetch stocks Alkor → update `products.virtual_stock` | 4h | 4.3 |
| **4.5 Affichage côté V1** | Queries enrichies : priorité champs `alkor_*`, fallback `liderpapel_*`. Fiche produit affiche stock en quasi-temps réel | 4h | 4.4 |
| **4.6 Module commande XML EDI** | Depuis back-office admin : bouton "Commander chez Alkor" → génère XML conforme `xmlOrderForALKOR` → dépose FTP `\envoi` | 1 jour | 4.1 + doc XML reçue |
| **4.7 Tracking API V2** | Intégration tracking livraisons Alkor dans `/compte/commandes` | 4h | 4.6 + doc API Tracking |

#### Doc XML reçue — résumé structure

```xml
xmlOrderForALKOR
├── customer (optionnel si client connu Alkor)
│   ├── identity (name, customerAccount, contact)
│   ├── deliveryAddress (street, zip, city, country)
│   ├── invoiceAddress (optionnel)
│   └── orderSpecs (orderType, deliveryInstructions, carrier...)
├── orderHeader
│   ├── sender (orderAccount, deliveryAccount)
│   ├── contact (name, mail, phone)
│   ├── publicMarketArea (marchés publics, optionnel)
│   ├── orderSetup (type, orderId, customerOrderId, date, status)
│   └── delivery (deliveryDate, exceptAddress, comment)
└── orderLine[] (1..*)
    ├── alkorReference | ean13 | supplierRef (1 des 3 obligatoire)
    ├── status (0=create, 1=update, 2=cancel, 3=cotraitance)
    ├── quantity
    └── options (replacement, stamp, delivery cotraitance)
```

**Fichier commande nommage** : `ADHPDV_AAAAJJMM-HHMNSS_numcdeadh.xml`
**Workflow** : dépose FTP `\envoi` → intégration Alkor → suivi via API Tracking V2

---

### 🟡 V3 — Hors scope V1, à planifier (juin et au-delà)

| Item | Description | Quand reprendre |
|---|---|---|
| **Konva tampon, fine art, plaques, papier peint, patrons** | Configurateur visuel produits personnalisés (tampon, gravure, etc.). Nécessite Konva.js canvas + back-end rendu | Après validation V1 stable 1 mois |
| **Finder consommables + scraping prix concurrence** | Outil "trouvez votre cartouche" par modèle imprimante + comparateur prix Bureau Vallée, JPG, Bruneau | Après validation UX catalogue actuel |
| **Amazon export** | Sync produits Ma Papeterie → Amazon Marketplace (via Amazon SP-API). Nécessite compte Seller Central + mapping catégories | Quand volume ventes V1 justifie |
| **SMS marketing** | Campagnes SMS Brevo (ou Twilio). Opt-in spécifique RGPD. Utile pour promos flash + relance paniers | Si ROI email insuffisant |
| **Blog CMS** | Pages articles / guides (ex: "Comment choisir son cahier"). Astro Content Collections ou MDX. SEO long-tail | Quand stratégie contenu définie |
| **Social auto-publish** | Publication automatique nouveaux produits sur Facebook + Instagram via Meta Graph API + LinkedIn. Module défini dans skills `facebook-boutique` | Après stabilisation contenu catalogue |
| **Leasing B2B** | Service location mobilier bureau via Leasecom (partenariat). Landing `/leasing`, simulateur ROI, CRM admin. Skill `leasing-b2b` définie | Si demande B2B suffit |
| **Génération PDF devis auto** | Depuis table `b2b_quotes` → PDF formaté (logo, TVA, conditions). @react-pdf/renderer ou PDFKit | Après Phase 5.2 facture PDF |
| **CRM/ERP natif** | Dashboard KPI custom + gestion contacts + pipeline ventes intégré. Aujourd'hui : Supabase Studio + Shopify Admin suffisent | Si volume > 50 commandes/semaine |
| **Linking Supabase ↔ Shopify customer** | Association par email → customer ID bidirectionnel. Utile pour historique commandes cross-platform | Si clients se plaignent de non-reconnaissance |
| **OCR liste scolaire image/PDF avancé** | V1 = texte copié-collé. V3 = upload photo/scan → extraction IA → matching auto | Si adoption feature justifie l'investissement |
| **Bannière cookies RGPD** | Nécessaire si ajout tracking tiers (Google Analytics, Meta Pixel, Hotjar). Pas nécessaire V1 (aucun tracking tiers) | Si ajout tracking tiers |
| **Compte client avancé** | Favoris persistants, adresses multiples, multi-utilisateur (entreprise), historique factures PDF | Phase par phase selon feedback |

---

## 📐 Architecture finale livrée

### Stack technique

```
┌─────────────────────────────────────────────────────┐
│                 ma-papeterie.fr (V1)                │
│              Astro 4 SSR + React 18                 │
└────────────┬────────────────────────────────────────┘
             │
             ├─► Storefront API (cart, checkout)
             │   Shopify Headless
             │
             ├─► Admin API (sync products, orders)
             │   Shopify Admin (cron nightly + dispatch)
             │
             ├─► Supabase (PostgreSQL 17)
             │   - products (11 587 entries)
             │   - shopify_orders (webhook)
             │   - cart_sessions (tracking)
             │   - notification_waitlist + b2b_quotes
             │   - users (Supabase Auth)
             │   - RPC: compute_display_price, semantic_search
             │   - pgvector: embeddings produits
             │
             ├─► Stripe (paiement)
             ├─► Brevo (emails transactionnels + marketing)
             ├─► Sentry (monitoring erreurs)
             └─► Netlify (hosting + deploy + env vars)
```

### Tables Supabase clés

| Table | Rôle |
|---|---|
| `products` | Catalogue (11 587 + colonnes Shopify + Alkor stubs) |
| `shopify_orders` | Orders synced via webhook |
| `cart_sessions` | Tracking paniers (analytics) |
| `notification_waitlist` | Leads notification produits |
| `b2b_quotes` | Demandes de devis B2B |
| `wishlist` | Favoris utilisateurs |
| `pricing_category_coefficients` | Coefficients pricing par catégorie |
| `recently_viewed` | Tracking parcours utilisateur |

### RPCs Supabase clés

| RPC | Rôle |
|---|---|
| `compute_display_price(p_product_id)` | SSOT pricing (cost × coef = TTC) |
| `count_displayable_products()` | Count avec filters publishable |
| `semantic_search(query)` | Recherche sémantique pgvector |
| `recommend_products(product_id)` | Reco IA pgvector |

### Workflows GitHub Actions

| Workflow | Cadence | Rôle |
|---|---|---|
| `verify` | Sur chaque PR | typecheck + build + Lighthouse CI |
| `Shopify Sync (nightly)` | Cron 03h00 UTC | Sync produits Supabase → Shopify |
| `Playwright E2E` | Sur PRs critiques | Tests parcours achat |
| `Backup Supabase` | Cron daily | pg_dump + rotation |

---

## ⚠️ Risques identifiés

### R1 — Régression visuelle au cutover
- **Probabilité** : HAUTE si Phase 5.1 pas faite avant cutover
- **Impact** : visiteurs V5 voient un site différent → perte de confiance
- **Mitigation** : Phase 5.1 design parity = priorité absolue post-cutover

### R2 — Bulk sync échoue partiellement
- **Probabilité** : MOYENNE
- **Mitigation** : workflow idempotent, retry, SQL diagnostic

### R3 — Specs Alkor jamais reçues
- **Probabilité** : MOYENNE
- **Impact** : Phase 4 bloquée indéfiniment
- **Mitigation** : relancer commercial Alkor chaque semaine

### R4 — Budget JS home dépassé par slider
- **Probabilité** : HAUTE (actuellement 47.6 kB / 50 kB budget)
- **Impact** : Lighthouse perf baisse
- **Mitigation** : slider CSS-only OU lazy island OU augmenter budget justifié

### R5 — Webhook Shopify URL oubliée post-cutover
- **Probabilité** : MOYENNE
- **Mitigation** : checklist cutover C.5 explicite

---

## 🛡️ Règles d'or

1. **Discipline CI** — aucun merge sans CI vert sur main
2. **Pas de cutover sans bulk sync 100%**
3. **Pas de cutover sans tests E2E vert**
4. **Phase 5.1 (design parity) = PREMIÈRE action post-cutover**
5. **Backup Supabase obligatoire avant DNS**
6. **Post-cutover : surveiller 48h minimum avant nouvelle feature**
7. **Si bug critique post-cutover → rollback immédiat, pas de hot fix sous pression**
8. **Phase 4 (Alkor) ne démarre pas avant specs API reçues + J+5 stable**
9. **Toute évolution V3 = ticket BACKLOG, pas de scope creep**

---

## 📚 Documents de référence

| Document | Rôle |
|---|---|
| `docs/NEXT-STEPS.md` | Plan d'action cutover détaillé |
| `docs/CUTOVER-CHECKLIST.md` | Checklist exhaustive cutover jour J |
| `docs/PROJECT-STATE.md` | Ce document — état complet du projet |
| `docs/PHASE-2-FINDINGS.md` | Historique Phase 2 (clôturée 23 avr) |
| `docs/PHASE-3-FINDINGS.md` | Historique Phase 3 (cart drawer) |
| `docs/RLS-HARDENING-PLAN.md` | Plan sécurité DB (post go-live) |
| `docs/SESSION-JOURNAL.md` | Journal des sessions Claude |
| `CLAUDE.md` | Règles projet (process, conventions, budgets) |

---

## 🏆 Bilan global

### Performance livraison

| Métrique | Valeur |
|---|---|
| Durée totale projet | ~2 semaines (15-28 avril) |
| Spec V1 (F1-F8) | ✅ 100% |
| V2.1 critique post-cutover | ✅ 100% |
| V2.2 boost conversion | ✅ 100% |
| V2.3 sophistication + IA | ✅ Partiel livré |
| Phases D, A, C foundations | ✅ |
| **Reste cutover** | Bulk sync + DNS |
| **Post-cutover immédiat** | Phase 5.1 design parity V5 |

### Qualité technique

| Métrique | Valeur |
|---|---|
| Lighthouse mobile SEO | 100 |
| Lighthouse mobile perf | 90+ |
| Tests | Playwright E2E + CI verify |
| Sécurité | CSP + RLS + Sentry + Backup auto |
| CI/CD | Verify obligatoire + workflows |

---

## ⏳ Volontairement reporté — justifications

| Item | Pourquoi pas livré V1 | Phase cible |
|---|---|---|
| Multi-livraison (Mondial Relay/Colissimo/C&C) | 4j d'effort, Stripe générique suffit V1 | Phase 5.2 |
| Linking Supabase ↔ Shopify customer ID | Email matching V1 fonctionne | V3 |
| Page commande détail + facture PDF | `/compte/commandes/[id]` minimal existe | Phase 5.2 |
| Refactor pricing SSOT RPC | RPC existe, TS/SQL pas unifié | Phase 5.2 |
| Newsletter segmentée B2C/B2B/écoles | Liste unique V1 + tags Brevo | Phase 5.2 |
| Alkor catalogue parser + import | Spec Alkor non reçue | Phase 4 |
| Konva, fine art, plaques, papier peint | Hors scope V1 | V3 |
| Finder consommables, scraping prix | Hors scope V1 | V3 |
| Amazon, SMS, blog CMS, social auto | Hors scope V1 | V3 |
| Leasing B2B, PDF devis auto | Hors scope V1 | V3 |
| CRM/ERP natif, dashboard KPI | Supabase Studio suffit V1 | V3 |

---

**Fin du document.**

**Maintenu par** : Élie REINE (Président SAS Ma Papeterie Reine & Fils)
**Dernière révision** : 2026-04-28
**Stack** : Astro 4 + React 18 + Supabase + Shopify + Netlify + Stripe + Brevo + Sentry
**Cible bascule** : `ma-papeterie.fr` — Vendredi 2 mai 2026, 22h
**Post-cutover immédiat** : Phase 5.1 (design parity V5) → Phase 4 (Alkor) → V3
