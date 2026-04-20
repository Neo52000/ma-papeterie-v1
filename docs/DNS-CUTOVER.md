# DNS Cutover — Procédure J+16 (5 mai 2026)

> Bascule du domaine `ma-papeterie.fr` depuis l'ancien site Netlify (React SPA v5) vers le nouveau site Netlify (Astro v1).
> **Rollback** prévu sur 30 jours — l'ancien site Netlify reste intact tout ce temps.

---

## 0. Prérequis — à valider avant J+16

- [ ] Go/no-go SPEC §6 atteint : tous les critères `v1` verts (Lighthouse ≥ 90, catalogue ≥ 20 000 produits, 1 commande test réussie).
- [ ] Nouveau site Netlify `ma-papeterie-v1` buildé, déployé, accessible sur `ma-papeterie-v1.netlify.app`.
- [ ] Toutes les env vars Netlify saisies (7 variables).
- [ ] `/api/health` retourne `200 ok` sur `ma-papeterie-v1.netlify.app`.
- [ ] Monitoring externe en place (UptimeRobot ou équivalent) sur les deux URLs.

## 1. Création du nouveau site Netlify (à faire **avant** le cutover, dès la fin de Phase 1)

Procédure manuelle réalisée par **Élie** avec son compte Netlify existant :

1. Se connecter à `app.netlify.com`.
2. **Add new site** → **Import an existing project** → **GitHub** → `Neo52000/ma-papeterie-v1`.
3. Paramètres build :
   - **Build command** : `npm run build`
   - **Publish dir** : `dist`
   - **Node version** : `20` (déjà fixé dans `netlify.toml`)
4. **Site name** : `ma-papeterie-v1` → URL de staging : `https://ma-papeterie-v1.netlify.app`.
5. **Environment variables** — saisir dans **Site settings → Environment variables** :
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (marquer comme secret)
   - `PUBLIC_SHOPIFY_DOMAIN`
   - `PUBLIC_SHOPIFY_STOREFRONT_TOKEN`
   - `BREVO_API_KEY` (marquer comme secret)
   - `PUBLIC_SITE_URL` = `https://ma-papeterie-v1.netlify.app` (à changer en `https://ma-papeterie.fr` au cutover)
6. **Trigger deploy** → vérifier le log, attendre le `Site is live`.

**Ancien site Netlify** : ne rien changer. Il continue à servir `ma-papeterie.fr` (même en état dégradé).

## 2. Jour J — Cutover DNS (heure creuse conseillée : 22h–6h)

### 2.1 Préparation (T-60 min)

- [ ] `git pull && npm install && npm run build` local — confirmer build propre.
- [ ] Dernier smoke test sur `ma-papeterie-v1.netlify.app` :
  - Home charge, Lighthouse ≥ 90.
  - `/api/health` = `200 ok`.
  - Ajout panier test + checkout jusqu'à la page paiement.
- [ ] Backup Supabase (snapshot manuel dashboard).
- [ ] Noter les enregistrements DNS actuels du domaine (screenshot registrar).

### 2.2 Bascule Netlify

1. Sur le **nouveau** site Netlify :
   - **Domain management** → **Add a domain** → `ma-papeterie.fr`.
   - **Verify** (suivre la procédure Netlify — en général vérif TXT ou redirection CNAME).
2. Mettre à jour `PUBLIC_SITE_URL` = `https://ma-papeterie.fr` et **Trigger deploy**.
3. Sur l'**ancien** site Netlify :
   - **Domain management** → retirer `ma-papeterie.fr` (mais **garder le site en ligne** sur son URL Netlify pour rollback).

### 2.3 Bascule DNS (registrar)

- Si on utilise **Netlify DNS** : la bascule est automatique une fois le domaine transféré au nouveau site.
- Si **DNS externe** (OVH, Gandi, Cloudflare, etc.) :
  - `A record` `@` → IP Netlify Load Balancer (fournie par Netlify).
  - `CNAME` `www` → `ma-papeterie-v1.netlify.app` (ou apex Netlify selon reco).
  - **TTL** : abaisser à 300s **24h avant** le cutover, remonter après.

### 2.4 Vérifications post-cutover (T+15 min)

- [ ] `nslookup ma-papeterie.fr` → nouvelle IP propagée (vérifier depuis plusieurs régions : [dnschecker.org](https://dnschecker.org)).
- [ ] `curl -I https://ma-papeterie.fr` → `200 OK` + headers Netlify (`x-nf-request-id`).
- [ ] Certificat HTTPS (Let's Encrypt via Netlify) = valide.
- [ ] `/api/health` sur le domaine final = `200 ok`.
- [ ] Lighthouse mobile ≥ 90 depuis `https://ma-papeterie.fr`.
- [ ] Test commande réelle (1 €) — vraie carte, vrai paiement.

### 2.5 Google Search Console

- [ ] Ajouter la propriété `https://ma-papeterie.fr` (si absente).
- [ ] Soumettre le sitemap `https://ma-papeterie.fr/sitemap-index.xml`.
- [ ] Request indexing sur les 10 pages prioritaires.

## 3. Plan de rollback (valable 30 jours)

### Signal déclencheur

- `/api/health` retourne non-200 plus de 5 minutes d'affilée.
- Erreurs checkout > 5% sur 10 commandes consécutives.
- Lighthouse chute sous 70.
- Bug bloquant en production sans correctif sous 2h.

### Procédure

1. Sur le **nouveau** site Netlify : **Domain management** → retirer `ma-papeterie.fr`.
2. Sur l'**ancien** site Netlify : **Domain management** → rajouter `ma-papeterie.fr`.
3. Vérifier propagation DNS (5–15 min selon TTL).
4. Post-mortem dans les 48h, correctif sur v1, nouveau cutover programmé.

## 4. Archivage définitif (J+46 = 4 juin 2026)

Une fois le cutover stabilisé 30 jours sans rollback :

- [ ] Archiver le repo `Neo52000/ma-papeterie` (bouton GitHub → Archive).
- [ ] Mettre le site Netlify ancien en **pause** (ne pas supprimer pendant 90j supplémentaires, au cas où).
- [ ] Supprimer les env vars sensibles du dashboard Netlify ancien.
- [ ] Noter la date d'archivage dans `BACKLOG-V2.md`.

## 5. Contacts d'urgence

- **Élie Reine** — décisionnaire unique (cf. SPEC §6).
- **Netlify Support** — plan Netlify actuel (via dashboard).
- **Registrar DNS** — identifier avant J+16 (OVH / Gandi / autre).
- **Supabase Support** — dashboard Pro.
- **Shopify Support** — plan actuel.

---

**Dernière mise à jour** : 20 avril 2026 — scaffold Phase 1.
