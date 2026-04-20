# SPEC V1 — ma-papeterie.fr

> **Document de référence — version 1.0 — Scope figé.**
> Toute feature hors de ce doc = refusée jusqu'au go-live.
> Les idées parallèles sont notées dans `BACKLOG-V2.md` (à créer en parallèle).

---

## 1. Contexte & objectifs

**Entreprise** : Ma Papeterie — Reine & Fils
**Lieu** : 10 rue Toupot de Béveaux, 52000 Chaumont
**Modèle** : papeterie + fournitures bureau/scolaires, B2C + B2B local
**Statut actuel** : 0€ en ligne, site v5 non opérationnel en production
**Objectif v1** : mise en production fonctionnelle + 1er euro encaissé en ligne en ≤ 16 jours

## 2. Principes directeurs (non négociables)

1. **Rien qui ne génère du CA direct ou indirect (SEO, confiance)**
2. **Mobile-first** : 60%+ du trafic e-commerce FR vient du mobile
3. **Stock temps réel** : aucune vente possible sur un produit rupture
4. **Prix HT/TTC systématique** : obligation légale B2B + signal de sérieux
5. **Zéro admin UI custom** : l'admin passe par Supabase Studio + Shopify pendant v1
6. **Astro SSR natif** : le SEO est une feature, pas une option

## 3. Stack technique figée

| Couche | Techno | Rôle |
|---|---|---|
| Frontend | Astro 4+ + React islands + TypeScript strict | SSR, SEO, îles interactives |
| Styling | Tailwind 3.4 + shadcn/ui | DS cohérent |
| State | Zustand (panier, session) | Minimal, pas de Redux |
| Backend data | Supabase Pro (existant) | DB, Auth, Storage |
| E-commerce | Shopify Storefront API | Panier, checkout, paiement |
| POS | Shopify POS | Ventes boutique |
| Email | Brevo | Transac + newsletter |
| Hébergement | Netlify (SSR adapter Astro) | Deploy CI/CD |
| CI/CD | GitHub Actions | Tests + cron SFTP existant |

## 4. Les 8 features V1 (liste exhaustive — point final)

### F1 — Home
- Hero avec value prop claire (boutique physique Chaumont + e-commerce)
- Bloc "Liste scolaire upload → panier" mis en avant (différenciateur)
- 3 blocs catégories top : Bureau / Scolaire / Rentrée
- Preuve sociale (avis Google embed ou stats basiques)
- CTA vers catalogue + CTA devis B2B
- Footer avec mentions, CGV, contact, horaires boutique

### F2 — Catalogue produits
- Listing paginé (24 produits/page)
- Filtres : catégorie, marque, prix, disponibilité
- Tri : pertinence, prix asc/desc, nouveautés
- Recherche full-text (Supabase `pg_trgm` ou Shopify Search)
- Affichage vignette + nom + prix TTC (HT au survol si B2B connecté)
- Badge stock faible (< 5) + rupture grisée

### F3 — Fiche produit
- Images (carousel, 3–5 images Comlandi)
- Nom, référence, description Comlandi (Descriptions.json)
- Prix HT + TTC côte à côte
- Stock temps réel (badge couleur)
- Quantité + ajout panier
- Schema.org Product (prix, stock, reviews, brand)
- Produits liés (RelationedProducts.json)
- Breadcrumb SEO + Schema.org BreadcrumbList
- Onglet "Livraison & retour" (contenu statique)

### F4 — Panier + checkout
- Panier Zustand + sync Shopify Cart (Storefront API)
- Affichage HT/TTC détaillé
- Codes promo (Shopify natif)
- Checkout 100% Shopify hosted (pas de redev)
- Redirection post-achat → page merci avec commande + CTA compte

### F5 — Upload liste scolaire → panier (différenciateur)
- Upload PDF ou photo (mobile: caméra accessible)
- Extraction IA (Claude API ou Mistral API, réutiliser ta clé) des articles
- Matching avec catalogue (fuzzy match sur nom + catégorie)
- Tableau de vérification : article détecté → produit proposé → quantité
- Bouton "Ajouter tout au panier" + édition manuelle possible
- Fallback : "article non trouvé" → suggestion + bouton contact

### F6 — Compte client
- Login / signup (Supabase Auth, email + mot de passe)
- Option : comptes B2B (flag `is_pro` + SIRET obligatoire, validation manuelle admin)
- Historique commandes (liste Shopify via API + lien vers commande Shopify)
- Adresses (livraison + facturation, stockées Shopify)
- Listes scolaires sauvegardées (réutilisation année suivante)

### F7 — Demande de devis B2B
- Formulaire simple : nom, entreprise, SIRET, email, téléphone, message, upload fichier
- Sauvegarde Supabase table `b2b_quotes` + notification email Brevo
- Page de confirmation
- Délai de réponse annoncé : 24h ouvrées
- Pas de génération PDF auto en V1 (manuel via Shopify)

### F8 — Pages légales + SEO local (groupées)
- CGV (les 4 champs à compléter avant publication : tél, SIRET, TVA, médiateur)
- Mentions légales
- Politique confidentialité (RGPD)
- Politique cookies
- Contact (formulaire + carte Google Maps + horaires)
- Page "Papeterie à Chaumont" (SEO local fort)
- Page "Fournitures bureau Haute-Marne" (SEO local fort)
- Schema.org LocalBusiness sur toutes les pages
- Sitemap XML généré automatiquement (Astro plugin)
- Robots.txt propre

## 5. Features EXPLICITEMENT exclues de V1

À noter dans `BACKLOG-V2.md`, ne pas toucher pendant v1 :

- Tampon designer Konva.js
- Finder consommables imprimantes
- Prédictions IA / RFM / scoring clients
- Amazon marketplace export
- SMS gateway
- Blog CMS / page builder
- Module leasing B2B (landing existe déjà, on laisse en repo séparé)
- Impression fine art / plaques immatriculation / papier peint / patrons
- Module CRM/ERP natif (Supabase Studio + Shopify suffisent)
- Social media automation
- Scraping concurrents
- Dashboard KPI (on lit Shopify Analytics directement)
- Admin custom (Supabase Studio fait le job)

## 6. Critères de succès V1 (go/no-go)

| Critère | Seuil | Validation |
|---|---|---|
| Site live sur ma-papeterie.fr | HTTPS OK, Lighthouse ≥ 90 | Manuel + Lighthouse CI |
| Catalogue visible | ≥ 20 000 produits Comlandi affichés | Compte SQL Supabase |
| Indexation Google | ≥ 50 pages indexées sous 14 jours | Google Search Console |
| Paiement fonctionnel | 1 commande test live réussie | Test réel carte |
| Sync POS bidir | Vente boutique → stock site à jour < 60s | Test manuel |
| Upload liste scolaire | Taux de matching ≥ 70% sur liste réelle | Test avec 3 listes CE1/CM2/6ème |
| Premier euro en ligne | 1 vente réelle externe | Shopify Orders |

## 7. Ce qu'on garde de l'existant (backend)

À importer tel quel dans la V1 :
- Schéma Supabase produits / stocks / commandes
- Edge Functions : `sync-liderpapel-sftp`, `fetch-liderpapel-sftp`, `process-enrich-file`
- GitHub Actions cron SFTP quotidien
- Config Brevo (contacts, templates)
- Assets visuels (logo, mockup façade)
- CGV (à compléter 4 champs)

À rebuilder à neuf :
- Frontend entier (Lovable React SPA → Astro)
- Tout composant UI (shadcn à partir de zéro)
- Design tokens (nouveau MASTER.md cohérent)

## 8. Planning condensé (5h/jour effectifs)

| Jour | Phase | Livrable |
|---|---|---|
| J1 | Archive v5 + spec validée | Tag Git, backup, spec lue à voix haute |
| J2–J3 | Repo Astro + base | Home + layout + DS opérationnels |
| J4–J6 | Catalogue + fiche produit | Browse complet depuis Supabase |
| J7–J8 | Panier + checkout Shopify | Commande test live |
| J9–J10 | Upload liste scolaire | 1 liste réelle → panier en ≤ 2 min |
| J11–J12 | Comlandi 100% (7 JSON) | 24 750 produits avec images + descriptions |
| J13–J14 | Shopify POS sync bidir | Vente boutique sync live |
| J15 | SEO + compte client + légal | Sitemap, schema, login |
| J16 | Préprod, tests, go-live | Domaine basculé, 1ère vente |

## 9. Règles de conduite pendant les 16 jours

1. **Aucun commit hors périmètre V1**. Toute idée nouvelle → `BACKLOG-V2.md`.
2. **Daily standup 5 min** avec soi-même : hier / aujourd'hui / blocages.
3. **Fin de journée** : commit + push obligatoire, même incomplet.
4. **Fin de phase** : screenshot ou vidéo du livrable validé.
5. **Pas de refactoring "pendant qu'on y est"**. Jamais.
6. **Si bloqué > 30 min** → demander aide (Claude Code, Claude chat, doc).

---

**Version** : 1.0
**Date de figement** : 19 avril 2026
**Date cible go-live** : 5 mai 2026 (J+16)
**Signataire unique** : Élie Reine
