# BCI Tool v2 - Copilot IA pour Pentesting Simplifié

## 📖 Description

BCI Tool v2 est un assistant IA spécialisé en pentesting qui aide les testeurs à organiser et analyser automatiquement leurs résultats. Le projet a été restructuré pour revenir à son concept original simple :

1. **Chat avec Claude 3.5** : Interface conversationnelle avec Claude 3.5 Sonnet pour analyser et discuter des résultats de tests
2. **Mémoire Vectorielle** : Stockage sémantique des informations de pentesting avec recherche de similarité
3. **Board Simple** : Organisation visuelle des résultats dans une structure hiérarchique (dossiers/documents)
4. **Learning System** : Système d'apprentissage qui tracke l'efficacité des techniques de test

## 🎯 Workflow Principal

1. **User teste un site** et rapporte les résultats dans le chat
2. **IA détecte automatiquement** le type de faille (SQLi, XSS, Auth, etc.)
3. **IA range automatiquement** les informations dans le board selon le contexte
4. **IA apprend** en trackant les succès/échecs des techniques (scores d'efficacité)
5. **IA suggère** le prochain test basé sur l'historique et les patterns appris
6. **Répétition** jusqu'à couverture complète du périmètre

## 🚀 Installation Rapide

### Prérequis
- Node.js 18+ ou 20+
- Compte Supabase (gratuit pour développement)

### Étapes

1. **Clone le projet** :
   ```bash
   git clone <repo-url>
   cd BCI-Tool-v2
   ```

2. **Installez les dépendances** :
   ```bash
   npm install
   ```

3. **Configurez les variables d'environnement** :
   Créez un fichier `.env.local` à la racine du projet :
   ```env
   NEXTAUTH_SECRET=your-nextauth-secret
   NEXTAUTH_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Configurez Supabase** :
   - Créez un projet Supabase
   - Activez l'extension `pgvector` dans les paramètres
   - Exécutez les migrations :
     ```bash
     npx supabase db push
     ```

5. **Lancez le serveur de développement** :
   ```bash
   npm run dev
   ```

6. **Accédez à l'application** :
   Ouvrez http://localhost:3000

## 🔧 Configuration des Clés API

Dans l'application, naviguez vers **Settings > API Settings** pour configurer :

- **Anthropic API Key** : Pour le chat avec Claude 3.5 Sonnet
- **OpenAI API Key** : Pour les embeddings (recherche sémantique)

Ces clés sont stockées de manière sécurisée dans la table `api_keys` de votre projet Supabase.

## 🏗️ Structure du Projet Simplifiée

```
BCI-Tool-v2/
├── app/                    # Pages et API Routes
│   ├── api/                 # Routes API essentielles
│   │   ├── chat/           # Chat Claude + streaming
│   │   ├── claude/         # Interface Claude
│   │   ├── memory/         # Gestion mémoire vectorielle
│   │   └── openai/         # Embeddings pour recherche sémantique
│   ├── chat/               # Interface chat
│   ├── projects/           # Gestion projets
│   └── settings/           # Configuration API
├── components/             # Composants React
│   ├── board/              # SimpleBoard (remplacement unified)
│   ├── chat/               # Interface chat + streaming
│   ├── memory/             # Sidebar mémoire
│   └── ui/                 # Composants UI basiques
├── lib/                    # Services et utils
│   ├── services/           # Logique métier (conversation, embeddings, learning)
│   ├── supabase/           # Client Supabase + types DB
│   └── types/              # Types TypeScript
├── public/                 # Assets statiques
└── supabase/               # Configuration + migrations DB
```

## 📊 Composants Essentiels

### 1. Chat avec Claude 3.5
- Interface conversationnelle temps réel
- Détection automatique du contexte pentesting
- Analyse des résultats de tests
- Suggestions proactives basées sur l'historique

### 2. Mémoire Vectorielle (Recherche Sémantique)
- Stockage automatique des messages et résultats
- Recherche de similarité pour contexte pertinent
- Embeddings générés via OpenAI API
- Persistance PostgreSQL avec pgvector

### 3. Board Simple
- Organisation hiérarchique (dossiers/documents)
- CRUD direct sur les nodes mémoire
- Tableaux pour résultats structurés
- Vue arborescente intuitive

### 4. Learning System
- Table `attack_patterns` tracke l'efficacité
- Champs : pattern_type, success_rate, usage_count
- Prédictions basées sur historique des tests
- Amélioration automatique des suggestions

## 🔍 Utilisation

### Créer un Projet
1. Accédez à `/projects`
2. Cliquez "Nouveau Projet"
3. Configurez les clés API dans Settings
4. Commencez le pentesting !

### Workflow Typique
```
1. Nouveau projet "Test Target.com"
   ↓
2. Chat: "Test SQL Injection sur /login"
   ↓
3. IA: "Détecté: Authentication → SQLi Tests"
   ↓
4. IA: "Stocké dans Memory/Auth/SQLi Tests"
   ↓
5. IA: "Technique SQLi marquée comme efficace (score: 0.8)"
   ↓
6. IA: "Suggestion: Test XSS sur /search (score: 0.7)"
   ↓
7. Répéter jusqu'à couverture complète
```

## 🗄️ Base de Données (Supabase)

### Tables Essentielles
- **projects** : Projets utilisateurs
- **api_keys** : Clés API sécurisées par projet
- **memory_chunks** : Messages + embeddings vectoriels
- **memory_nodes** : Structure hiérarchique (dossiers/documents)
- **messages** : Historique conversations
- **conversations** : Sessions chat
- **attack_patterns** : Patterns appris + scores efficacité

### Extensions Recommandées
- `pgvector` pour recherche sémantique
- `uuid-ossp` pour UUID
- `pgcrypto` pour hashing

## 🛠️ Scripts Utiles

- **Développement** : `npm run dev`
- **Build Production** : `npm run build`
- **Tests** : `npm run test`
- **Lint** : `npm run lint`
- **Format** : `npm run format`

## 📚 Documentation Supplémentaire

- [Plan de Nettoyage](docs/cleanup-plan.md) : Analyse détaillée de la restructuration
- [Migration DB](supabase/migrations/) : Scripts SQL pour setup
- [Types DB](lib/supabase/database.types.ts) : Schéma TypeScript généré

## 🤝 Contribution

Le projet est maintenant simplifié et focalisé. Contributions bienvenues pour :

- Améliorer la détection automatique des failles
- Optimiser la recherche sémantique
- Ajouter de nouveaux types de tests
- Améliorer l'interface utilisateur

## 📞 Support

Pour questions techniques ou aide à l'installation, contactez le développeur ou consultez les issues GitHub.

## 🔧 Configuration MCP (Claude Code)

Le projet utilise 2 MCP essentielles :
- **supabase** : Gestion directe de la base de données
- **sequential-thinking** : Raisonnement complexe pour analyse business logic

Configuration dans `.mcp.json` :
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp"
    },
    "smithery-ai-server-sequential-thinking": {
      "type": "http",
      "url": "https://server.smithery.ai/@smithery-ai/server-sequential-thinking/mcp"
    }
  }
}
```

---

**BCI Tool v2** - Votre copilot IA pour pentesting efficace et organisé !