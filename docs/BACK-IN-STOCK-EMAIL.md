# Retour en stock — notification Brevo

V2.3 — alerte email automatique quand un produit en rupture revient en stock.

## Architecture

```
GitHub Actions cron (every 4h, :30)
  └── POST /api/cron/back-in-stock-emails (X-Cron-Secret header)
       └── SELECT notification_waitlist
             JOIN products ON product_id
             WHERE feature = 'back_in_stock'
               AND (products.stock_quantity > 0
                    OR products.available_qty_total > 0)
             LIMIT 100
       └── POST Brevo /smtp/email (templateId from env)
       └── DELETE notification_waitlist row (one-shot)
```

L'inscription se fait via `POST /api/notify-stock` (formulaire sur la fiche
produit quand le stock est à 0). Une row par couple `(email, product_id)`
grâce à l'index unique `uniq_notification_waitlist_email_feature_product`.

Pas de diff stock historique : Comlandi écrase `stock_quantity` /
`available_qty_total` à chaque sync sans émettre de transition. Heuristique
acceptable car la row est supprimée après envoi — un produit qui repasse en
rupture après envoi ne re-déclenche pas (l'utilisateur doit se réinscrire).

## Variables d'environnement requises

### Netlify (env vars site)

| Var                               | Description                                                |
| --------------------------------- | ---------------------------------------------------------- |
| `CRON_SECRET`                     | Secret partagé GitHub ↔ Netlify (générer 32+ chars random) |
| `BREVO_API_KEY`                   | Déjà configurée pour les autres flows                      |
| `BREVO_BACK_IN_STOCK_TEMPLATE_ID` | ID du template Brevo à envoyer (entier)                    |
| `BREVO_SENDER_EMAIL`              | Optionnel (défaut `contact@ma-papeterie.fr`)               |
| `BREVO_SENDER_NAME`               | Optionnel (défaut `Ma Papeterie`)                          |
| `PUBLIC_SITE_URL`                 | Ex. `https://ma-papeterie.fr` — utilisé pour `product_url` |

### GitHub Actions (repo secrets)

| Var               | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `CRON_SECRET`     | Même valeur que Netlify                              |
| `PUBLIC_SITE_URL` | `https://ma-papeterie.fr` (ou URL Netlify pour test) |

## Configuration Brevo

1. Brevo → Templates → Create new template
2. Choisir Transactional template
3. Variables disponibles dans le template (passées via `params`) :
   - `{{ params.product_name }}` — nom du produit
   - `{{ params.product_url }}` — URL absolue de la fiche produit
   - `{{ params.product_image_url }}` — URL absolue de l'image principale
   - `{{ params.product_price_ttc }}` — prix TTC formaté `fr-FR` (ex. `12,99 €`)
4. Récupérer l'ID du template (visible dans l'URL `/templates/edit/{id}`)
5. Set Netlify env `BREVO_BACK_IN_STOCK_TEMPLATE_ID=<id>`

## Sémantique one-shot

Une fois l'email envoyé, la row `notification_waitlist` est supprimée. Si le
produit retombe en rupture puis revient à nouveau, l'utilisateur ne reçoit
pas un second email — il doit se réinscrire depuis la fiche produit. Choix
volontaire pour V2.3 (évite le spam si le stock oscille à cause de la sync
Comlandi).

## Test manuel

```bash
# Déclenchement manuel (workflow_dispatch)
gh workflow run back-in-stock.yml

# Ou curl direct (substituer SITE_URL et CRON_SECRET)
curl -X POST -H "X-Cron-Secret: $CRON_SECRET" \
  https://ma-papeterie.fr/api/cron/back-in-stock-emails
```

Réponse attendue : `{ "scanned": N, "sent": M, "failed": K }`.

## Monitoring

Compteurs à surveiller dans Brevo Dashboard :

- Templates → Back in stock → opens / clicks
- Conversions : achats déclenchés par `product_url`

Métriques DB :

```sql
SELECT
  feature,
  COUNT(*) AS pending
FROM public.notification_waitlist
WHERE feature = 'back_in_stock'
GROUP BY feature;
```
