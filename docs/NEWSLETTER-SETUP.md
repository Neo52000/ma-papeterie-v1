# Newsletter — Brevo signup

Formulaire d'inscription dans le footer du site (band primary) qui ajoute
l'email à une liste Brevo. Le double-opt-in (DOI) est géré côté Brevo via
template d'email de confirmation.

## Variables d'environnement

### Netlify (Site settings → Environment variables)

| Var                        | Valeur                                    | Notes                                                                  |
| -------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| `BREVO_API_KEY`            | _(déjà configurée)_                       | Partagée avec autres flows Brevo (devis, abandoned cart)               |
| `BREVO_NEWSLETTER_LIST_ID` | ID numérique de la liste Brevo Newsletter | Brevo → Contacts → Lists → Newsletter → l'ID dans l'URL ou les détails |

### Sans `BREVO_NEWSLETTER_LIST_ID` configuré

L'API `/api/newsletter` retourne 200 silencieusement (signup accepté côté UI)
mais n'écrit pas dans Brevo. Permet le dev local sans config.

## Configuration Brevo

1. Brevo → Contacts → Lists → Create list (nom : `Newsletter`)
2. Brevo → Settings → Senders & IP → vérifier que `contact@ma-papeterie.fr`
   est validé (DKIM + SPF)
3. **Activer le double-opt-in (recommandé RGPD)** :
   - Brevo → Contacts → Forms → Create DOI form
   - Configurer le template d'email de confirmation
   - Récupérer la "List ID" associée
4. Set Netlify env `BREVO_NEWSLETTER_LIST_ID=<id>`

## Flow utilisateur

1. User saisit email dans le footer → POST `/api/newsletter`
2. API valide email + honeypot
3. API POST `https://api.brevo.com/v3/contacts` avec `listIds: [<id>]`,
   `updateEnabled: true` (idempotent — si email déjà présent, met à jour)
4. UI affiche toast succès + remplace formulaire par message de confirmation

## Test manuel

```bash
curl -X POST https://ma-papeterie.fr/api/newsletter \
  -H "content-type: application/json" \
  -d '{"email":"test@example.fr","source":"manual-test"}'
```

Réponse attendue : `{"ok":true}`. Vérifier ensuite Brevo → Contacts.
