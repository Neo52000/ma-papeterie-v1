# Cart abandonné — relance Brevo

V2.2 — relance email automatique des paniers abandonnés.

## Architecture

```
GitHub Actions cron (hourly :15)
  └── POST /api/cron/abandoned-cart-emails (X-Cron-Secret header)
       └── SELECT cart_sessions WHERE
             last_activity_at BETWEEN now() - 25h AND now() - 1h
             AND customer_email IS NOT NULL
             AND recovered_at IS NULL
             AND abandoned_email_sent_at IS NULL
       └── POST Brevo /smtp/email (templateId from env)
       └── UPDATE cart_sessions SET abandoned_email_sent_at = now()
```

Idempotent : la colonne `abandoned_email_sent_at` empêche le ré-envoi. En
cas d'échec Brevo, la row reste `NULL` et sera re-tentée au prochain run.

## Variables d'environnement requises

### Netlify (env vars site)

| Var | Description |
|---|---|
| `CRON_SECRET` | Secret partagé GitHub ↔ Netlify (générer 32+ chars random) |
| `BREVO_API_KEY` | Déjà configurée pour les autres flows |
| `BREVO_ABANDONED_CART_TEMPLATE_ID` | ID du template Brevo à envoyer (entier) |
| `BREVO_SENDER_EMAIL` | Optionnel (défaut `contact@ma-papeterie.fr`) |
| `BREVO_SENDER_NAME` | Optionnel (défaut `Ma Papeterie`) |

### GitHub Actions (repo secrets)

| Var | Description |
|---|---|
| `CRON_SECRET` | Même valeur que Netlify |
| `PUBLIC_SITE_URL` | `https://ma-papeterie.fr` (ou URL Netlify pour test) |

## Configuration Brevo

1. Brevo → Templates → Create new template
2. Choisir Transactional template
3. Variables disponibles dans le template (passées via `params`) :
   - `{{ params.line_items_count }}` — nombre d'articles
   - `{{ params.total_ttc }}` — montant TTC
   - `{{ params.currency }}` — devise (`EUR`)
   - `{{ params.checkout_url }}` — URL Shopify checkout (deep link)
4. Récupérer l'ID du template (visible dans l'URL `/templates/edit/{id}`)
5. Set Netlify env `BREVO_ABANDONED_CART_TEMPLATE_ID=<id>`

## Capture des emails

V2.2 ne capture l'email que pour les **clients connectés** (le store
`cartStore` peut écrire `customer_email` lors de l'ajout au panier si
l'utilisateur est authentifié — cf. backlog V2.3 pour étendre aux invités
via un formulaire « Recevoir mon panier par email »).

## Test manuel

```bash
# Déclenchement manuel (workflow_dispatch)
gh workflow run abandoned-cart.yml

# Ou curl direct (substituer SITE_URL et CRON_SECRET)
curl -X POST -H "X-Cron-Secret: $CRON_SECRET" \
  https://ma-papeterie.fr/api/cron/abandoned-cart-emails
```

Réponse attendue : `{ "scanned": N, "sent": M, "failed": K }`.

## Monitoring

Compteurs à surveiller dans Brevo Dashboard :
- Templates → Abandoned cart → opens / clicks
- Conversions : produits achetés via le lien checkout_url

Métriques DB :
```sql
SELECT
  COUNT(*) FILTER (WHERE abandoned_email_sent_at IS NOT NULL) AS emails_sent,
  COUNT(*) FILTER (WHERE recovered_at IS NOT NULL) AS recovered,
  ROUND(100.0 * COUNT(*) FILTER (WHERE recovered_at IS NOT NULL)
        / NULLIF(COUNT(*) FILTER (WHERE abandoned_email_sent_at IS NOT NULL), 0), 1) AS recovery_pct
FROM cart_sessions
WHERE created_at > now() - interval '30 days';
```
