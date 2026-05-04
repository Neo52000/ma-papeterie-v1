Génère un résumé structuré de la session en cours, destiné à être copié-collé dans un nouvel onglet Claude Code pour reprendre sans perte de contexte.

## Format attendu

**Résumé de session — ma-papeterie-v1**
Date : {{date du jour}}

### 1. Décisions techniques prises

- (liste des choix d'architecture, bibliothèques retenues, stratégies validées)

### 2. Code produit

- (fichiers créés ou modifiés, avec chemin absolu et rôle en une ligne)

### 3. État de la tâche en cours

- Tâche : (description précise de ce qui était en train d'être fait)
- Avancement : (% ou étape — ex. "3/5 fichiers modifiés", "tests en attente")
- Dernière action : (commande ou modification précédant ce /compact)

### 4. Bloqueurs et points ouverts

- (erreurs non résolues, questions en suspens, dépendances manquantes)

### 5. Prochaines étapes immédiates

- (les 2-3 actions concrètes à réaliser pour continuer)

### 6. Contexte à réinjecter

Coller en début de nouvelle session :

> "Je travaille sur ma-papeterie-v1 (Astro 4 SSR / Supabase / Shopify). Reprendre à partir de : [résumé ci-dessus]."

---

_Généré par /compact — copier l'intégralité du bloc ci-dessus dans le nouveau chat._
