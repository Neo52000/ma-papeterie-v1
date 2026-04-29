# 🎯 Plan d'action — Cutover & Phase 4 — ma-papeterie-v1

> **Document opérationnel** pour piloter la suite du projet.
> Dernière MAJ : 2026-04-28
> Source : analyse cumulée des sessions 22-28 avril, audit cutover 2026-04-28 16:08

---

## 📊 État actuel — Référence rapide

### ✅ Livré

- Spec F1-F8 complète (Catalogue, Cart drawer, Liste scolaire, Devis B2B, Compte client, Légaux)
- Lighthouse mobile SEO/perf = 100 sur les pages clés
- Webhook Shopify orders configuré + testé E2E (HTTP 401 confirmed)
- Stripe activé + test paiement E2E OK
- Return URL Shopify, Supabase Auth redirects, mentions légales : OK
- 6 GitHub Actions secrets configurés
- CI verify discipline (PR #37 security hardening tient)

### ⏳ Reste à faire (ordre de priorité)

1. **Bulk sync produits** : 4.3% (497/11587) → 100%
2. **Custom domain Netlify** : DNS + HTTPS auto
3. **Test E2E final** pré-cutover
4. **Cutover DNS** jour J + monitoring 24-48h

### 📦 Backlog post-cutover

- Intégration Alkor (catalogue + commande XML EDI)
- Back-office admin
- Polish UX (image CDN webp/avif, cart abandonné custom, linking comptes)

---

## 🚀 PHASE A — Sync complet produits (mardi 29 → jeudi 1er mai)

**Objectif** : 100% des 11587 produits actifs visibles sur Shopify Headless.

### Action récurrente quotidienne

#### Lancer un batch de runs Shopify Sync

1. Aller sur `https://github.com/Neo52000/ma-papeterie-v1/actions`
2. Workflow **"Shopify Sync (nightly)"** (panneau gauche)
3. Bouton **"Run workflow"** (haut droite) :
   - Branch : `main`
   - mode : `full`
   - max : `500`
4. Lancer le run, **attendre qu'il termine (~25-45 min)**, puis relancer.

> ⚠️ **Ne pas cliquer "Run workflow" plusieurs fois rapidement.**
> Le concurrency group `shopify-sync` couplé à `cancel-in-progress: false`
> cancel les jobs pending intermédiaires (testé 2026-04-29 : 8 runs sur
> 10 cancelés en 5s). Pour enchaîner plusieurs batches, attendre la fin
> du précédent ou augmenter le `max` (jusqu'à `1500` tient dans le
> timeout 6h Github Actions).

#### Alternative : 1 gros run

Plus simple que 5 petits : `max=1500` dans 1 seul run = ~70 min, ajoute
1500 produits d'un coup. À répéter 8× pour les 11.5k.

#### Cadence proposée

| Jour          | Matin (5 runs) | Aprèm (5 runs) | Cible cumulée |
| ------------- | -------------- | -------------- | ------------- |
| Mardi 29      | ✅             | ✅             | ~30%          |
| Mercredi 30   | ✅             | ✅             | ~60%          |
| Jeudi 1er mai | ✅             | ✅             | 100%          |

### Vérification quotidienne (1 query)

```sql

```
