# Supabase backup

Off-site backup automatisé en complément des backups natifs Supabase (Pro = 7 jours daily).

## Fonctionnement

`.github/workflows/supabase-backup.yml` tourne **chaque nuit 03:00 UTC** + trigger manuel via `workflow_dispatch`.

Pour chaque run, génère 3 dumps `gzip`-compressés :

| Fichier                 | Contenu                                           | Usage typique                                  |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------- |
| `schema-<stamp>.sql.gz` | DDL public (tables, indexes, RLS, RPCs, triggers) | Recréer la structure                           |
| `data-<stamp>.sql.gz`   | Rows public (sans schema)                         | Restaurer le contenu                           |
| `roles-<stamp>.sql.gz`  | Roles + grants                                    | Recréer les permissions auth/anon/service_role |

Stockés comme **artifact GitHub Actions**, rétention **14 jours** (cap pour rester dans le quota artifacts gratuit GH ~500 MB sur un cron nightly). Pour conserver plus longtemps : Supabase Pro garde 7 jours en plus côté natif, ou trigger manuel `workflow_dispatch` avant une migration sensible.

## Setup initial (1 fois)

Ajouter 2 secrets GitHub Actions :

1. **`SUPABASE_ACCESS_TOKEN`**
   - Génère sur https://supabase.com/dashboard/account/tokens → **Generate new token**
   - Nom suggéré : `gh-actions-backup`
   - Copie + colle sur https://github.com/Neo52000/ma-papeterie-v1/settings/secrets/actions

2. **`SUPABASE_DB_PASSWORD`**
   - Va sur https://supabase.com/dashboard/project/mgojmkzovqgpipybelrr/settings/database
   - Section **Database password** → si tu ne l'as pas noté, **Reset database password** (attention : ça invalide les connexions postgres directes en cours, mais Supabase MCP / SDK utilisent service_role et continuent de marcher)
   - Copie + colle dans GH secrets

3. Trigger un run manuel pour valider :

   ```
   gh workflow run supabase-backup.yml --repo Neo52000/ma-papeterie-v1
   ```

   Ou via UI Actions → Supabase Backup → Run workflow.

4. Vérifie l'artifact dans https://github.com/Neo52000/ma-papeterie-v1/actions/workflows/supabase-backup.yml → run le plus récent → **Artifacts**.

## Restoration en cas de catastrophe

Hypothèse : la DB a perdu des données ou le projet a été supprimé.

```bash
# 1. Télécharge le dernier artifact
gh run download <RUN_ID> --repo Neo52000/ma-papeterie-v1 --name supabase-backup-<RUN_ID>

# 2. Décompresse
gunzip *.sql.gz

# 3. Recrée un projet Supabase (ou cible un projet vide)
#    Note la connection string postgres://...

# 4. Restore dans l'ordre : schema → data → roles
psql "$NEW_PG_URL" < schema-<stamp>.sql
psql "$NEW_PG_URL" < data-<stamp>.sql
psql "$NEW_PG_URL" < roles-<stamp>.sql
```

## Pourquoi en plus des backups natifs Supabase

- Pro tier = 7 jours rétention. Si on découvre un bug data 8+ jours après, on est cuit.
- Backup natif est dans le même compte Supabase que la prod. Si le compte se fait pirater / suspendre, tout part.
- GH artifacts = compte indépendant + 90 jours.
