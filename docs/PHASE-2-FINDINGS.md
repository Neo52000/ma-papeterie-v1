# PHASE 2 — Findings

> Observations et dettes techniques relevées pendant la correction des 3 bugs Phase 2 (2026-04-22). À traiter ultérieurement — rien ici n'est bloquant pour V1.

## 📞 Téléphone boutique absent du code

Aucun numéro de téléphone boutique n'est codé en dur dans le repo. Le Footer porte un commentaire explicite :

> `src/components/layout/Footer.astro:5` — "SIRET + phone placeholders — final values injected in Phase 1 closing commit (CGV pass)"

Le commit de clôture Phase 1 correspondant n'a jamais été fait. Impact :

- Aucun `href="tel:…"` cliquable dans le footer.
- Le bloc "Contactez-nous" du CTA < 50 € sur la fiche produit pointe vers `/contact` faute de numéro à proposer directement.
- Les mentions légales et CGV auront besoin du numéro quand F8 sera traité.

**Action V1** : récupérer le vrai numéro auprès d'Élie, l'ajouter dans :
- `src/components/layout/Footer.astro` (bloc "Boutique" avec `<a href="tel:+33…">`)
- `src/components/layout/Header.astro` (optionnel, pour le mobile)
- `src/lib/schema.ts` → `localBusinessSchema()` (champ `telephone`)
- CTA fiche produit `/pages/produit/[slug].astro` (remplacer le lien `/contact` par un `tel:`)

## ✅ Hypothèse audit "badge stock invisible" rétractée

Dans l'audit précédent je soupçonnais que le `StockBadge` rendait un `<span>` aux couleurs transparentes parce que les tokens `text-success` / `text-danger` ne seraient pas déclarés dans `tailwind.config.mjs`. Vérification faite :

```
tailwind.config.mjs:24-25
success: '#16a34a',
danger:  '#dc2626',
```

Les tokens existent bel et bien. Le `StockBadge` affiche donc correctement "En stock" (vert), "Stock faible" (orange accent) et "Rupture" (rouge danger). Si Élie ne le voyait pas sur un produit en particulier, c'est peut-être lié à un rendu spécifique (ex. bloc masqué par un overlay) — à reproduire avec capture d'écran au cas par cas.

## 🔎 Données `price_ht` corrompues à grande échelle

Le produit test EAN `8423473806382` a `price_ht = 0.39 €` alors que `price_ttc = 9.12 €`. Une analyse sur les 141k produits montrerait probablement des milliers de cas similaires (marge négative dans `margin_percent`). Le fix Phase 2 **ignore** cette colonne et recompute via `cost_price × coef`. Mais le nettoyage du pipeline d'import Liderpapel reste à faire — hors scope V1.

**Suggestion** : un cron nightly qui met `price_ht = NULL` pour tout produit où `price_ht × 1.20 < price_ttc / 2` (donc incohérent) limiterait le bruit.

## ⚖️ Coefficient fallback `__default__` à 1.70

Sur ~500 catégories réelles dans la base, **50 sont seedées** (99%+ du volume publiable). Les catégories rares tombent dans `__default__ = 1.70`, soit du positionnement B. Si un produit apparaît plus tard dans une catégorie sensible (ex. "Consommables hardware") non seedée, il héritera du 1.70 — probablement trop haut pour du consommable compétitif. Refaire passer la requête `top 50 categories` périodiquement (ou la transformer en `top 100`) quand le trafic réel évolue.

## 🏷️ Prix affiché source = `'price_ttc'` = signal à surveiller

`computeDisplayPrice` retourne un champ `source` qui indique quelle branche a été prise :

| source | Signification |
|---|---|
| `manual` | Override humain (`manual_price_ht` renseigné) |
| `coefficient` | Cas normal (`cost_price × coef`) |
| `public_price_ttc` | Pas de `cost_price` — fallback legacy |
| `price_ttc` | Pas de `cost_price` **et** pas de `public_price_ttc` — cas extrême |

Un dashboard Supabase Studio filtrant les produits où on tomberait sur `price_ttc` donnerait la liste des fiches à curer manuellement (typiquement `cost_price` à 0 ou `NULL`). Pas de logs ajoutés en V1 (règle "zéro console.log") — à l'analyste d'interroger via SQL direct.

## ⚠️ Budget JS home au plafond

Après les fix, la home charge ~47.6 kB gzip de JS client (vs 50 kB budget CLAUDE.md). La marge de manœuvre est faible. Tout nouvel island React sur la home (ex. carousel, modal newsletter) devra être soit lazy-loadé, soit remplacé par une alternative non-React (Astro component + `<script>` inline).

## 🧾 RLS `pricing_category_coefficients`

Policy de lecture ouverte à `anon` + `authenticated`. C'est cohérent avec le fait que ces coefficients sont _publics de facto_ (visibles via inversion depuis le prix affiché et `cost_price`). Néanmoins, si tu veux cacher les coefficients exacts (pour ne pas révéler la marge à un concurrent qui se crée un compte), il faudra :
- router l'appel `fetchPricingCoefficients` via le client **server-only** (`supabaseServer`, déjà le cas) ;
- retirer la policy `pricing_coefficients_public_read` et laisser uniquement `service_role` la lire.

Actuellement le client browser n'a aucune raison de lire cette table directement, donc la policy ouverte ne sert à rien — **à durcir avant go-live** si Élie juge la donnée sensible.
