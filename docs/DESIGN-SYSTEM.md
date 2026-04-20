# Design System — ma-papeterie-v1

> **Tokens strictement identiques à la v5.** Toute modification doit être validée explicitement par Élie.
> Source de vérité : `tailwind.config.mjs` + `src/styles/global.css`.

## 1. Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `primary` | `#121c2a` | Texte principal, backgrounds sombres |
| `primary-50` | `rgba(18,28,42,0.04)` | Backgrounds ultra-subtils |
| `primary-100` | `rgba(18,28,42,0.08)` | Borders très légers |
| `primary-300` | `rgba(18,28,42,0.3)` | Labels, meta |
| `primary-400` | `rgba(18,28,42,0.4)` | Texte secondaire, suffixes prix |
| `accent` | `#fd761a` | CTA, badges "NOUVEAU", liens actifs |
| `accent-hover` | `#e8651a` | Hover CTA |
| `bg-soft` | `#fafaf9` | Cards alternées, sections secondaires |
| `border` | `#e5e5e3` | Séparateurs |
| `success` | `#16a34a` | Stock OK, confirmations |
| `danger` | `#dc2626` | Rupture, erreurs |

## 2. Typographie

### Familles

- **Display (h1–h6)** : Poppins — `400, 500, 600, 700`
- **Body / UI** : Inter — `400, 500, 600`

Les deux polices sont **self-hostées** via `@fontsource/poppins` et `@fontsource/inter` (imports dans `src/styles/global.css`). **Pas de CDN Google Fonts** — RGPD.

### Échelle

| Usage | Classes Tailwind |
|---|---|
| h1 hero | `font-display text-4xl sm:text-5xl font-semibold` |
| h2 section | `font-display text-2xl font-semibold` |
| h3 card | `font-display text-lg font-semibold` |
| Body | `text-sm` ou `text-base` |
| Label / meta | `text-[0.65rem] uppercase tracking-label` |

## 3. Radius

| Token | Valeur | Usage |
|---|---|---|
| `rounded-card` | `1rem` | Cards produit, sections |
| `rounded-badge` | `0.4rem` | Badges "NOUVEAU", tags |
| `rounded-btn` | `0.5rem` | Boutons, inputs |

## 4. Shadows

| Token | Valeur | Usage |
|---|---|---|
| `shadow-card` | `0 20px 40px rgba(18,28,42,0.04)` | État par défaut card |
| `shadow-card-hover` | `0 24px 48px rgba(18,28,42,0.08)` | Hover card |

## 5. Letter-spacing

| Token | Valeur | Usage |
|---|---|---|
| `tracking-label` | `0.08em` | Labels catégorie, tags uppercase |

## 6. Patterns UI récurrents (v5)

Définis comme composants helpers dans `@layer components` de `src/styles/global.css`.

### Card produit

```html
<article class="card-product p-6">
  <!-- contenu -->
</article>
```

Équivaut à : `bg-white rounded-card overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200`.

### Label catégorie

```html
<span class="label-category">Fournitures bureau</span>
```

Équivaut à : `text-[0.65rem] uppercase tracking-label font-semibold text-primary-300`.

### Badge "NOUVEAU"

```html
<span class="badge-new">NOUVEAU</span>
```

Équivaut à : `bg-accent text-white px-2 py-0.5 rounded-badge text-xs font-medium`.

### Prix HT/TTC

```html
<p class="text-lg font-semibold">
  9,90 €
  <span class="price-ht-suffix">TTC</span>
</p>
```

Le suffixe équivaut à : `text-[0.65rem] text-primary-400 ml-1 font-sans`.

## 7. Composants shadcn disponibles (V1)

| Fichier | Variantes |
|---|---|
| `@/components/ui/Button` | `primary` (défaut), `accent`, `outline`, `ghost` — tailles `sm/md/lg` |
| `@/components/ui/Input` | Default avec focus ring accent |
| `@/components/ui/Card` | `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` |
| `@/components/ui/Badge` | `default`, `accent`, `success`, `danger` |

Composants supplémentaires ajoutés au fil des phases (`Select`, `Dialog`, `Tabs`, `Form`...) via la CLI shadcn standard — **ne jamais écraser** les primitives existantes, toujours étendre.

## 8. Accessibilité

- `:focus-visible` → ring accent 2px + offset — configuré dans `global.css @layer base`.
- Skip-link `.skip-link` dans `BaseLayout.astro` pointant vers `#main-content`.
- Contraste AA minimum vérifié sur tous les pairs de couleurs.
- `aria-label` obligatoire sur tout bouton-icône.

## 9. Règles strictes

1. **Ne jamais** importer une fonte depuis Google Fonts CDN.
2. **Ne jamais** modifier les valeurs de `primary`, `accent`, `bg-soft`, radius, shadows sans validation.
3. **Ne jamais** écrire de CSS inline — toujours passer par Tailwind ou un helper de `global.css`.
4. **Toujours** utiliser les helpers `card-product`, `label-category`, `badge-new`, `price-ht-suffix` pour les patterns récurrents v5.
5. **Toujours** ajouter un composant shadcn via `npx shadcn add <name>` plutôt qu'à la main — garantit la cohérence.
