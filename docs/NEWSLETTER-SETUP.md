# Newsletter — Brevo signup

Formulaire d'inscription dans le footer du site (band primary) qui ajoute
l'email à une liste Brevo. Le double-opt-in (DOI) est géré côté Brevo via
template d'email de confirmation.

## Variables d'environnement

### Netlify (Site settings → Environment variables)

| Var                               | Valeur                              | Notes                                                                                                                   |
| --------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `BREVO_API_KEY`                   | _(déjà configurée)_                 | Partagée avec autres flows Brevo (devis, abandoned cart)                                                                |
| `BREVO_NEWSLETTER_LIST_ID`        | ID numérique de la liste fallback   | Liste générique « Newsletter » utilisée si aucune liste segment-spécifique n'est configurée. Comportement V1 (compat).  |
| `BREVO_NEWSLETTER_LIST_ID_B2C`    | ID liste B2C (clients particuliers) | Optionnel — fallback sur `BREVO_NEWSLETTER_LIST_ID` si absent.                                                          |
| `BREVO_NEWSLETTER_LIST_ID_B2B`    | ID liste B2B (entreprises)          | Optionnel — fallback sur `BREVO_NEWSLETTER_LIST_ID` si absent. Cible : signups depuis le form devis Pro.                |
| `BREVO_NEWSLETTER_LIST_ID_ECOLES` | ID liste écoles / parents           | Optionnel — fallback sur `BREVO_NEWSLETTER_LIST_ID` si absent. Cible : signups depuis le form liste scolaire (rentrée). |

### Sans aucune liste configurée

L'API `/api/newsletter` retourne 200 silencieusement (signup accepté côté UI)
mais n'écrit pas dans Brevo. Permet le dev local sans config.

### Migration progressive vers les 3 segments

1. Au démarrage, garde `BREVO_NEWSLETTER_LIST_ID` seul → toutes les
   inscriptions vont sur la liste générique (comportement V1 préservé).
2. Crée les 3 listes Brevo dédiées + provisionne les 3 env vars.
3. Le code maps automatiquement chaque `segment` (b2c / b2b / ecoles) à
   sa liste via `BREVO_NEWSLETTER_LIST_ID_<SEGMENT>` ou fallback.
4. L'attribut `SEGMENT` est aussi posé sur le contact Brevo, ce qui
   permet de filtrer même quand 2 segments partagent (transitoirement)
   la même liste de fallback.

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
# Inscription B2C (défaut, equivalent à omettre segment)
curl -X POST https://ma-papeterie.fr/api/newsletter \
  -H "content-type: application/json" \
  -d '{"email":"test@example.fr","source":"manual-test"}'

# Inscription B2B (form devis Pro)
curl -X POST https://ma-papeterie.fr/api/newsletter \
  -H "content-type: application/json" \
  -d '{"email":"test@example.fr","source":"devis","segment":"b2b"}'

# Inscription écoles (form liste scolaire)
curl -X POST https://ma-papeterie.fr/api/newsletter \
  -H "content-type: application/json" \
  -d '{"email":"test@example.fr","source":"liste-scolaire","segment":"ecoles"}'
```

Réponse attendue : `{"ok":true}`. Vérifier ensuite Brevo → Contacts (filtrer
par attribut `SEGMENT`).
