# Instructions pour Claude Code Agent

## 🎯 Contexte du Projet

Vous êtes l'agent de codage pour le projet **BCI** - une application Next.js + Supabase.

**RÈGLE ABSOLUE :** Vous avez accès à des MCP servers qui sont des outils spécialisés. Vous DEVEZ les utiliser pour toutes les opérations qui correspondent à leur domaine.

---

## 🛠️ MCP Servers Disponibles

### 1. 🗄️ **Supabase** (`mcp__supabase__*`)

**Utilisation :** TOUTES les opérations de base de données PostgreSQL

**Outils disponibles :**
- `mcp__supabase__execute_sql` - Exécuter des requêtes SQL
- `mcp__supabase__list_tables` - Lister toutes les tables
- `mcp__supabase__list_migrations` - Voir les migrations
- `mcp__supabase__apply_migration` - Appliquer une migration
- `mcp__supabase__get_advisors` - Vérifier sécurité/performance
- `mcp__supabase__generate_typescript_types` - Générer types TypeScript
- `mcp__supabase__list_edge_functions` - Lister Edge Functions
- `mcp__supabase__deploy_edge_function` - Déployer Edge Function

**⚠️ RÈGLES CRITIQUES :**
1. **TOUJOURS** utiliser Supabase MCP pour TOUTE requête SQL
2. **NE JAMAIS** deviner la structure des tables - TOUJOURS inspecter d'abord
3. **TOUJOURS** vérifier les données existantes avant modification
4. **TOUJOURS** utiliser `apply_migration` pour les DDL (CREATE, ALTER, DROP)
5. **TOUJOURS** utiliser `execute_sql` pour les DML (SELECT, INSERT, UPDATE, DELETE)
6. **TOUJOURS** exécuter `get_advisors` après modifications DDL pour vérifier sécurité/RLS

**Exemple de workflow correct :**
```
User: "Crée une table posts avec title et content"

ÉTAPE 1 - Vérifier si la table existe déjà
→ mcp__supabase__list_tables

ÉTAPE 2 - Créer la table via migration
→ mcp__supabase__apply_migration
  name: create_posts_table
  query: |
    CREATE TABLE posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      content TEXT,
      user_id UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_posts_user_id ON posts(user_id);

ÉTAPE 3 - Vérifier la sécurité
→ mcp__supabase__get_advisors(type: "security")

ÉTAPE 4 - Confirmer
"✅ Table posts créée avec succès. ⚠️ N'oubliez pas d'ajouter les RLS policies!"
```

---

### 2. 🧠 **Sequential Thinking** (`mcp__smithery-ai-server-sequential-thinking__*`)

**Utilisation :** Pour les tâches complexes nécessitant une réflexion étape par étape

**Quand l'utiliser :**
- Tâches avec plus de 5 étapes
- Décisions architecturales importantes
- Résolution de bugs complexes
- Planification de nouvelles fonctionnalités

**Outil :**
- `mcp__smithery-ai-server-sequential-thinking__sequentialthinking`

**Exemple :**
```
User: "Implémente un système d'authentification complet avec OAuth"

→ Utilise Sequential Thinking pour:
  1. Décomposer les étapes (OAuth providers, base de données, middleware, etc.)
  2. Identifier les dépendances
  3. Planifier l'ordre d'implémentation
  4. Anticiper les problèmes
```

---

### 3. 🎯 **Linear** (`mcp__linear__*`)

**Utilisation :** Gestion des issues et tâches du projet

**Quand l'utiliser :**
- Créer des issues pour les bugs découverts
- Lier du code à des tickets
- Mettre à jour le statut des tâches

---

### 4. 🧪 **ByteRover** (`mcp__byterover-mcp__*`)

**Utilisation :** Stockage et récupération de connaissances du projet

**Outils :**
- `mcp__byterover-mcp__byterover-store-knowledge` - Stocker des patterns/solutions
- `mcp__byterover-mcp__byterover-retrieve-knowledge` - Récupérer du contexte

**Quand l'utiliser :**
- Avant de commencer une tâche → Récupérer le contexte
- Après avoir résolu un problème → Stocker la solution
- Pour documenter des décisions architecturales

---

### 5. 🌐 **Chrome DevTools** (`mcp__chrome-devtools__*`)

**Utilisation :** Tests end-to-end avec Playwright

---

### 6. 🚀 **Vercel** (`mcp__vercel__*`)

**Utilisation :** Déploiement de l'application

---

## 📋 Workflow Standard pour Chaque Type de Tâche

### 🔹 Tâche Base de Données

```
1. 🔍 Récupérer contexte (ByteRover)
2. 📊 Inspecter structure (Supabase list_tables)
3. ✍️ Écrire requête/migration
4. ▶️ Exécuter (Supabase)
5. 🛡️ Vérifier sécurité (Supabase get_advisors)
6. 💾 Stocker solution (ByteRover)
```

### 🔹 Nouvelle Fonctionnalité

```
1. 🧠 Planifier avec Sequential Thinking
2. 🔍 Récupérer patterns existants (ByteRover)
3. 💻 Implémenter
4. 🧪 Tester
5. 📝 Documenter (ByteRover)
6. ✅ Créer issue Linear si besoin
```

### 🔹 Bug Fix

```
1. 🔍 Rechercher solutions similaires (ByteRover)
2. 🐛 Diagnostiquer
3. 🔧 Corriger
4. ✅ Vérifier
5. 📝 Documenter la solution (ByteRover)
```

---

## ⚠️ RÈGLES CRITIQUES À NE JAMAIS OUBLIER

### 🚫 INTERDICTIONS

1. **NE JAMAIS** exécuter de requêtes SQL sans utiliser Supabase MCP
2. **NE JAMAIS** deviner la structure des tables
3. **NE JAMAIS** oublier de vérifier la sécurité après des modifications DDL
4. **NE JAMAIS** créer de tables sans RLS policies (ou au minimum documenter le risque)
5. **NE JAMAIS** terminer une tâche sans confirmer que tout fonctionne

### ✅ OBLIGATIONS

1. **TOUJOURS** récupérer le contexte avant de commencer (ByteRover)
2. **TOUJOURS** inspecter avant de modifier (Supabase)
3. **TOUJOURS** utiliser les migrations pour DDL (Supabase apply_migration)
4. **TOUJOURS** utiliser Sequential Thinking pour tâches complexes
5. **TOUJOURS** stocker les solutions réutilisables (ByteRover)
6. **TOUJOURS** finir le travail complètement - pas de demi-mesures

---

## 📖 Standards de Code

### SQL
```sql
-- ✅ BON
SELECT id, title, content
FROM posts
WHERE user_id = $1
ORDER BY created_at DESC;

-- ❌ MAUVAIS
SELECT * FROM posts; -- Pas de SELECT *
```

### TypeScript
```typescript
// ✅ BON - Types générés depuis Supabase
import { Database } from '@/types/supabase'
type Post = Database['public']['Tables']['posts']['Row']

// ❌ MAUVAIS - Types manuels
type Post = { id: string; title: string } // Peut devenir obsolète
```

### Migrations
```sql
-- Toujours inclure:
-- 1. Description claire
-- 2. Indexes pour FK et colonnes recherchées
-- 3. Timestamps
-- 4. RLS policies

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## 🎯 Exemples Concrets

### Exemple 1 : Requête Simple
```
User: "Affiche les 10 derniers posts"

ÉTAPE 1 - Inspecter la table
→ mcp__supabase__list_tables

ÉTAPE 2 - Exécuter la requête
→ mcp__supabase__execute_sql
  query: |
    SELECT id, title, created_at, user_id
    FROM posts
    ORDER BY created_at DESC
    LIMIT 10;

ÉTAPE 3 - Formater et afficher
```

### Exemple 2 : Création Table Complexe
```
User: "Crée un système de commentaires pour les posts"

ÉTAPE 1 - Utiliser Sequential Thinking
→ mcp__smithery-ai-server-sequential-thinking__sequentialthinking
  - Planifier structure (table comments, relations, RLS)

ÉTAPE 2 - Vérifier tables existantes
→ mcp__supabase__list_tables

ÉTAPE 3 - Créer migration
→ mcp__supabase__apply_migration
  name: create_comments_system
  query: |
    CREATE TABLE comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_comments_post_id ON comments(post_id);
    CREATE INDEX idx_comments_user_id ON comments(user_id);

    ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Anyone can read comments"
      ON comments FOR SELECT
      USING (true);

    CREATE POLICY "Authenticated users can create comments"
      ON comments FOR INSERT
      WITH CHECK (auth.uid() = user_id);

ÉTAPE 4 - Vérifier sécurité
→ mcp__supabase__get_advisors(type: "security")

ÉTAPE 5 - Générer types TypeScript
→ mcp__supabase__generate_typescript_types

ÉTAPE 6 - Stocker la solution
→ mcp__byterover-mcp__byterover-store-knowledge
  "Système de commentaires pour posts avec RLS policies..."
```

---

## 🔐 Sécurité

- ⚠️ **TOUJOURS** activer RLS sur les nouvelles tables
- ⚠️ **TOUJOURS** exécuter `get_advisors` après modifications DDL
- ⚠️ **NE JAMAIS** exposer de données sensibles sans vérification

---

## 📌 Rappel Final

**Vous êtes un agent autonome et compétent.**

✅ Vous avez tous les outils nécessaires via les MCP servers
✅ Vous DEVEZ les utiliser systématiquement
✅ Vous DEVEZ finir complètement chaque tâche
✅ Vous DEVEZ être proactif dans la vérification et la documentation

**Si vous ne savez pas comment faire quelque chose, utilisez Sequential Thinking pour décomposer le problème.**

**Si vous oubliez d'utiliser un MCP server alors qu'il est disponible, c'est une erreur grave.**

---

*Bonne chance! 🚀*
