# Admin via Supabase Studio — vues SQL

Le projet ne fournit pas d'admin UI custom (cf. `docs/SPEC-V1.md` §5). Le
back-office passe par **Supabase Studio** + **Shopify Admin**. Pour rendre
Studio plus pratique, on a créé des vues SQL pré-faites qui apparaissent
comme des tables dans le Table Editor.

## URL Studio

https://supabase.com/dashboard/project/mgojmkzovqgpipybelrr/editor

Filtrer la liste des tables sur `v_admin_` pour voir uniquement les vues admin.

## Liste des vues

### `v_admin_devis_pending`

Devis B2B reçus, en attente de traitement. À répondre sous 24h ouvrées.

Colonnes : `id`, `created_at`, `company_name`, `contact_name`, `email`,
`phone`, `message`, `status`.

**Workflow** : ouvrir → traiter chaque ligne → mettre à jour le `status`
(`pending` → `in_progress` → `answered`) directement dans la table source
`b2b_quotes`. La vue se rafraîchit automatiquement.

### `v_admin_carts_abandoned_24h`

Carts abandonnés avec email capturé, entre 1h et 24h, non récupérés. C'est
ce que le cron Brevo hourly (`/api/cron/abandoned-cart-emails`) traite.
Colonne `abandoned_email_sent_at` indique si l'email est déjà parti.

### `v_admin_notify_stock_subscribers`

Demandes de notification "prévenez-moi quand de retour en stock", agrégées
par produit. Trié par nombre de subscribers décroissant.

**Lecture** : `subscribers_count` = combien de personnes attendent. La
colonne `subscriber_emails` est un array — tape sur la cellule pour le voir.
Quand `stock_now > 0`, le cron `back-in-stock-emails` (4h) envoie + nettoie.

### `v_admin_liste_scolaire_waitlist`

Inscrits à la notification "service liste scolaire ouvert". Pour l'instant
les rows s'accumulent — quand le service ouvre (juillet 2026), exporter en
CSV depuis Studio puis importer dans Brevo pour la campagne.

### `v_admin_top_wishlist`

Top 20 produits les plus mis en favoris. Utile pour :

- Décider quel produit mettre en avant
- Lancer une promo sur un produit populaire mais avec stock OK
- Anticiper le réassort si stock bas + wishlist élevée

### `v_admin_orders_30d`

Commandes Shopify des 30 derniers jours. Doublon Shopify Admin mais
utile pour cross-checker / SQL libre. Inclut `items_count` (nombre de
lignes dans le panier).

## Ajouter une vue

1. Éditer `supabase/migrations/<timestamp>_<name>.sql`
2. Appliquer via `supabase db push` ou MCP `apply_migration`
3. Mettre à jour ce doc avec la nouvelle vue

Convention de nommage : `v_admin_<topic>` (le préfixe `v_admin_` permet de
filtrer la liste Studio).
