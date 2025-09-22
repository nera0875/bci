# BCI Tool v2 - Plan Vivant

## 🎯 Vision Actuelle
Système de pentesting où Claude Opus 4.1 agit comme un cerveau auto-évolutif qui apprend de chaque test. Interface chat-centrique avec mémoire dynamique modulable.

## 🏗️ Architecture Technique Choisie

### Stack Final
- **Frontend**: Next.js 15.5 + TypeScript + Tailwind CSS
- **UI Components**: JSON Schema UI (rendu dynamique)
- **Database**: Supabase (PostgreSQL + pgvector + Realtime)
- **AI**: Claude Opus 4.1 + OpenAI Embeddings
- **Design System**: Monochrome (#FFFFFF, #202123, #F7F7F8, #6E6E80)

### Architecture Sans Fichiers Physiques
```
Supabase Database
├── projects (isolation complète)
├── memory_nodes (système virtuel)
├── chat_messages (avec streaming)
├── rules_table (règles modulables)
└── embeddings (pgvector)
```

## 📋 État Actuel du Projet

### ✅ [Done] Phase 1: Base UI
- Page de login avec connexion API ✓
- Page projects hub ✓
- Design system monochrome ✓
- Routing Next.js configuré ✓

### ✅ [Done] Phase 2: Infrastructure Supabase
- Schéma de base de données créé ✓
- Tables pour isolation par projet ✓
- Configuration pgvector pour embeddings ✓
- Client Supabase configuré ✓

### ✅ [Done] Phase 3: Interface Principale
- Chat avec streaming de messages ✓
- Sidebar dynamique (mémoire virtuelle) ✓
  - Création de sous-dossiers hiérarchiques ✓
  - Éditeur de texte inline pour documents ✓
  - Éditeur de tableaux structurés ✓
  - IA peut modifier sa mémoire via commandes ✓
- Goal bar en haut ✓
- Rules table avec CRUD + refresh temps réel ✓
- Widgets dynamiques JSON Schema ✓
- API routes pour Claude streaming ✓

### 🔄 [Ready] Phase 4: Tests & Configuration
- Configurer les clés API dans .env.local
- Tester le flow complet avec vraies clés
- Vérifier streaming Claude fonctionne

### 📅 [Next] Phase 5: Intelligence Avancée
- Algorithmes génétiques pour payloads
- Pattern mining automatique
- Kill Switch Score
- Memory replay buffer

## 🗂️ Structure de la Base de Données

### Table: projects
```sql
- id: UUID (PK)
- name: TEXT
- goal: TEXT
- api_keys: JSONB (encrypted)
- settings: JSONB
- created_at: TIMESTAMP
```

### Table: memory_nodes
```sql
- id: UUID (PK)
- project_id: UUID (FK)
- type: ENUM('folder','document','widget','pattern')
- name: TEXT
- content: JSONB
- embedding: vector(1536)
- color: TEXT
- icon: TEXT
- parent_id: UUID (nullable)
- metadata: JSONB
- position: INTEGER
- created_at: TIMESTAMP
```

### Table: chat_messages
```sql
- id: UUID (PK)
- project_id: UUID (FK)
- role: ENUM('user','assistant','system')
- content: TEXT
- streaming: BOOLEAN
- metadata: JSONB
- created_at: TIMESTAMP
```

### Table: rules
```sql
- id: UUID (PK)
- project_id: UUID (FK)
- name: TEXT
- trigger: TEXT
- action: TEXT
- config: JSONB
- enabled: BOOLEAN
- priority: INTEGER
```

## 🔄 Flux Utilisateur

1. **Login** → Configure API keys
2. **Projects** → Sélection/création de projet
3. **Chat Interface**:
   - Centre: Chat avec Claude (streaming)
   - Gauche: Memory nodes (modulable par Claude)
   - Haut: Goal bar
   - Droite: Rules table

## 🎨 Système de Rendu Dynamique

### JSON Schema UI
Claude envoie des structures JSON qui sont rendues dynamiquement:

```javascript
{
  type: "folder",
  name: "XSS Patterns",
  color: "#FF0000",
  children: [
    {
      type: "metric",
      label: "Success Rate",
      value: 95
    },
    {
      type: "document",
      content: "..."
    }
  ]
}
```

### Types de Widgets Supportés
- 📁 Folder (hiérarchique)
- 📊 Chart (graphiques)
- 📝 Document (texte/json)
- 📈 Metric (indicateurs)
- 🎯 Pattern (templates d'attaque)
- ⚡ Live (temps réel)

## 🚀 Prochaines Étapes Immédiates

1. ✅ [DONE] Installer toutes les dépendances
2. ✅ [DONE] Créer schéma DB (fichier SQL prêt)
3. ✅ [DONE] Implémenter interface complète
4. 📝 [TODO] Configurer .env.local avec vos clés
5. 📝 [TODO] Lancer et tester l'application

## 📦 Dépendances Installées

```bash
✅ @supabase/supabase-js
✅ react-hot-toast
✅ react-markdown
✅ openai
✅ framer-motion
```

## 🔐 Variables d'Environnement Requises

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

## ✨ Features Killer à Implémenter

- Auto-évolution des patterns
- Heat map de vulnérabilités
- Genetic algorithms pour payloads
- Memory replay buffer
- Kill Switch Score (confiance 95%+)

---
*Document vivant - Dernière mise à jour: maintenant*