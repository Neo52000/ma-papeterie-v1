# COWORK PLAYBOOK — Ma Papeterie V1

> Guide de délégation des tâches manuelles à Claude Cowork pendant les 16 jours de build v1.
> Version 1.0 — 19 avril 2026.

---

## Répartition des rôles

| Outil                       | Rôle                                                                    | Exemples de tâches                                                     |
| --------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Claude Code (terminal)**  | Développement pur : coder, débugger, commits                            | Build Astro, Edge Functions Supabase, migrations SQL, intégrations API |
| **Claude Cowork (desktop)** | Tâches manuelles répétitives, gestion fichiers, orchestration cross-app | Backups, screenshots, rapports, audits, vérifications                  |
| **Claude chat (moi)**       | Stratégie, prompts, revues, décisions                                   | Architecture, choix techniques, challenge des idées                    |

**Règle d'or** : si la tâche implique du code dans un repo → Claude Code. Si c'est du "clic/lecture/copie/vérification" → Cowork. Si c'est "penser avant d'agir" → moi.

---

## 10 tâches concrètes à déléguer à Cowork pendant le build V1

### 1. Backup Supabase avant archive v5 (J1)

**Quand** : Jour 1, avant tout le reste.
**Prompt Cowork** :

```
Connecte-toi au dashboard Supabase du projet ma-papeterie.
Télécharge un dump complet de la base de données (schéma + données) via l'option "Database → Backups → Download".
Enregistre-le dans ~/Projets/ma-papeterie-v1/backups/pre-v1-migration-YYYY-MM-DD.sql.
Vérifie que le fichier n'est pas vide (taille > 10 MB) et calcule son hash SHA256.
Produis-moi un rapport : taille, hash, nombre de tables, date, chemin.
```

### 2. Archivage visuel de la v5 (J1)

**Quand** : Juste avant de mettre le tag `v5-archive`.
**Prompt Cowork** :

```
Ouvre ma-papeterie.fr dans le navigateur.
Prends des screenshots en mode desktop ET mobile de :
- Page d'accueil
- Catalogue (catégorie au choix, 2 pages)
- Une fiche produit
- Panier (vide + avec 1 article)
- Page contact
- Footer complet
- Admin (si accessible) : dashboard principal + 2 modules les plus utilisés
Range tous les screenshots dans ~/Projets/ma-papeterie-v1/archive-v5/screenshots/
Nomme-les : `v5-[page]-[desktop|mobile]-YYYY-MM-DD.png`.
Crée un fichier INDEX.md listant tous les screenshots avec une description d'une ligne chacun.
```

### 3. Récupération des variables d'environnement (J1)

**Prompt Cowork** :

```
Ouvre le fichier .env du repo ma-papeterie (ancien repo local).
Liste toutes les variables d'environnement présentes (noms uniquement, PAS les valeurs).
Compare-les à cette liste cible :
- PUBLIC_SUPABASE_URL
- PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- PUBLIC_SHOPIFY_DOMAIN
- PUBLIC_SHOPIFY_STOREFRONT_TOKEN
- BREVO_API_KEY
Produis un tableau : variable cible | présente dans l'ancien .env (oui/non) | source de récupération si manquante.
```

### 4. Daily standup automatique (tous les jours)

**Quand** : À exécuter chaque fin de journée.
**Prompt Cowork** :

```
Lis le dernier commit git du repo ma-papeterie-v1 d'aujourd'hui.
Compte combien de commits ont été faits aujourd'hui, liste les messages.
Vérifie si le site preview (ma-papeterie-v1.netlify.app) répond en 200.
Ouvre le fichier docs/SPEC-V1.md et compare avec les features actuellement implémentées dans src/pages/.
Produis un rapport daily au format :
---
# Standup J[N] — YYYY-MM-DD
## Fait aujourd'hui
- [commits + features]
## Blocages
- [erreurs build, tests qui cassent]
## Reste selon SPEC-V1.md
- [features non couvertes sur 8]
## Prochaine session
- [prio 1, prio 2, prio 3]
---
Sauvegarde dans ~/Projets/ma-papeterie-v1/journal/standup-J[N].md
```

### 5. Audit Lighthouse post-phase (fin de chaque phase)

**Prompt Cowork** :

```
Ouvre Chrome, onglet incognito, DevTools → Lighthouse.
Lance un audit complet (Performance, Accessibility, Best Practices, SEO) sur :
- https://ma-papeterie-v1.netlify.app/
- https://ma-papeterie-v1.netlify.app/catalogue (si page existe)
- https://ma-papeterie-v1.netlify.app/produits/[slug-existant] (si page existe)
Mode mobile + desktop.
Exporte les rapports JSON et PDF dans ~/Projets/ma-papeterie-v1/lighthouse/phase-[N]/
Produis un tableau comparatif des 4 scores par page et par mode.
Signale toute régression vs la phase précédente.
```

### 6. Vérification pipeline Comlandi (J11–J12)

**Prompt Cowork** :

```
Connecte-toi au dashboard Supabase.
Ouvre la table `products` et compte les lignes totales.
Ouvre la table `product_images` et compte les lignes totales.
Ouvre la table `product_descriptions` et compte les lignes totales.
Ouvre GitHub Actions du repo ma-papeterie → workflow "sync-liderpapel-sftp".
Liste les 5 derniers runs avec leur statut (success/failed) et la date.
Pour chaque échec : copie les 50 dernières lignes de logs.
Produis un rapport :
- Produits importés : [N] / 24 750 attendus (%)
- Images : [N]
- Descriptions : [N]
- Runs récents : tableau
- Erreurs : liste
Sauvegarde dans ~/Projets/ma-papeterie-v1/audits/comlandi-YYYY-MM-DD.md
```

### 7. Test manuel Shopify POS sync (J13–J14)

**Prompt Cowork** :

```
Ouvre l'admin Shopify → Produits → sélectionne un produit test (ex: "Stylo Pilot G2").
Note le stock actuel (ex: 25).
Depuis Shopify POS (app mobile), simule une vente de 1 unité du même produit.
Attends 60 secondes.
Vérifie :
1. Dans Shopify admin : le stock est-il passé à 24 ?
2. Dans Supabase table products : le champ `stock_quantity` est-il à 24 ?
3. Sur ma-papeterie-v1.netlify.app/produits/[slug] : le stock affiché est-il à 24 ?
Produis un rapport test :
- Étape 1 : OK / KO (temps)
- Étape 2 : OK / KO (temps)
- Étape 3 : OK / KO (temps)
Si KO quelque part, capture les logs Supabase Edge Functions (`sync-shopify-inventory`).
Sauvegarde dans ~/Projets/ma-papeterie-v1/audits/shopify-pos-test-YYYY-MM-DD.md
```

### 8. Génération du changelog de la semaine (fin de semaine)

**Prompt Cowork** :

```
Liste tous les commits du repo ma-papeterie-v1 de cette semaine (lundi→dimanche).
Regroupe-les par type (feat, fix, chore, docs, build).
Filtre les commits mineurs (typos, formatting).
Produis un CHANGELOG lisible pour un non-dev :
- Ce qui a été ajouté cette semaine
- Ce qui a été corrigé
- Ce qui reste pour la semaine prochaine (regarde SPEC-V1.md)
Sauvegarde dans docs/CHANGELOG-week-[N].md
```

### 9. Validation finale pré-go-live (J15)

**Prompt Cowork** :

```
Ouvre le document SPEC-V1.md section 6 "Critères de succès V1 (go/no-go)".
Pour chaque critère, effectue le test correspondant :
- Lighthouse home ≥ 90 → lance audit
- Catalogue ≥ 20 000 produits → SQL Supabase `SELECT COUNT(*) FROM products`
- 50+ pages indexables → vérifie via site:ma-papeterie-v1.netlify.app dans Google
- Commande test live → ouvre le site, ajoute un produit au panier, paye avec carte test
- Upload liste scolaire → teste avec liste de la classe de CE1 (fichier attaché)
Remplis le tableau go/no-go et verdict final : GO ou NO-GO.
Sauvegarde dans docs/GO-NO-GO-J15.md
```

### 10. Procédure DNS cutover (J16)

**Prompt Cowork** :

```
Ouvre le fichier docs/DNS-CUTOVER.md.
Lis la procédure étape par étape.
Pour chaque étape :
1. Affiche-la
2. Demande-moi confirmation AVANT d'exécuter
3. Exécute (connexion registrar DNS, changement des enregistrements A et CNAME)
4. Valide la propagation (dig ma-papeterie.fr)
5. Screenshot du résultat
À la fin, produis un rapport cutover :
- Heure début
- Heure fin
- Temps de propagation
- Tests post-cutover (home, catalogue, panier, commande test)
- Screenshots
Sauvegarde dans docs/CUTOVER-LOG.md
```

---

## Prompts Cowork bonus — hors build V1 mais utiles en parallèle

### Surveillance quotidienne de l'ancien site (5 min/jour)

```
Visite ma-papeterie.fr (ancienne v5).
Vérifie que la page charge en < 5s.
Note si de nouvelles erreurs JS apparaissent en console.
Si le site est down, envoie-moi une alerte par email.
Ne touche à rien, juste surveille.
```

### Préparation communication go-live

```
Rédige 3 versions d'un post Facebook annonçant le nouveau site à J+16 :
- Version 1 : courte, enthousiaste (5 lignes)
- Version 2 : moyenne, avec mise en avant de la liste scolaire (10 lignes)
- Version 3 : longue, storytelling (20 lignes)
Style : voix Élie, commerçant local Chaumont, zéro jargon IA.
Sauvegarde dans docs/COMMS-GO-LIVE.md
```

### Inventaire des prospects à notifier du go-live

```
Ouvre Brevo → liste "B2B prospects Chaumont".
Exporte le CSV des contacts avec au moins un email valide.
Compte combien ont été contactés dans les 30 derniers jours.
Produis un rapport :
- Total prospects
- Déjà contactés récemment (à exclure)
- Cible à notifier du go-live : [N]
Sauvegarde dans docs/PROSPECTS-NOTIF-GO-LIVE.md
```

---

## Règles de délégation à Cowork

1. **Toujours donner un fichier de sortie précis** (chemin + format Markdown si rapport)
2. **Toujours préciser "ne touche à rien" pour les tâches de lecture seule**
3. **Exiger une confirmation avant toute action destructive** (modif DNS, suppression de fichier, push)
4. **Limiter le scope** : une tâche = un livrable, pas de "fais-moi plein de trucs en parallèle"
5. **Vérifier le rapport** avant de considérer la tâche terminée
6. **Archiver les rapports** dans `~/Projets/ma-papeterie-v1/journal/` ou équivalent pour avoir une trace

---

## Anti-patterns Cowork

| À éviter                                             | Pourquoi                          |
| ---------------------------------------------------- | --------------------------------- |
| Lui faire écrire du code d'application               | Claude Code fait mieux le job     |
| Lui faire prendre des décisions stratégiques         | C'est mon rôle (challenge + reco) |
| Lui donner accès à la prod sans garde-fou            | Risque de casser                  |
| Enchainer plusieurs tâches sans valider chaque étape | Tu perds le fil                   |
| "Organise mon desktop" sans périmètre précis         | Résultat imprévisible             |

---

## Fréquence d'usage prévue

- **J1** : 3 prompts Cowork (backup, archivage, env vars)
- **J2 à J15** : 1 prompt/jour (standup quotidien) + 1 prompt par phase (audit Lighthouse)
- **J11–J14** : 2 prompts supplémentaires (Comlandi + POS Shopify)
- **J15** : 1 prompt critique (validation go-live)
- **J16** : 1 prompt critique (DNS cutover)

**Total estimé sur 16 jours** : ~25 prompts Cowork, ~5 min de supervision par prompt = **2h de ton temps total sur 16 jours** pour une automatisation complète du suivi.
