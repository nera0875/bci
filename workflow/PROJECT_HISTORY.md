# BCI Tool v2 - Plan Vivant

## 🎯 Vision Actuelle
Système de pentesting où Claude Opus 4.1 agit comme un cerveau auto-évolutif qui apprend de chaque test. Interface chat-centrique avec mémoire dynamique modulable via Mem0.

## 🏗️ Architecture Technique Choisie

### Stack Final
- **Frontend**: Next.js 15.5 + TypeScript + Tailwind CSS
- **UI Components**: JSON Schema UI (rendu dynamique)
- **Memory System**: Mem0 Cloud (mémoire principale avec RAG, auto-consolidation, graph)
- **Database**: Supabase (UI uniquement - affichage des compartiments)
- **AI**: Claude Opus 4.1 via Mem0 native LLM + OpenAI Embeddings
- **Design System**: Monochrome (#FFFFFF, #202123, #F7F7F8, #6E6E80)

### Architecture Hybride Mem0 + UI
```
Mem0 Cloud (Mémoire Intelligente)
├── custom_categories (compartiments: success, failed, recon, plans)
├── custom_instructions (règles par compartiment)
├── graph_memory (relations entre exploits)
├── RAG vectoriel (recherche sémantique)
└── auto_consolidation (fusion intelligente)

Supabase (UI Seulement)
├── projects (métadonnées)
├── compartments_ui (config visuelle)
├── chat_messages (historique)
└── rules_display (affichage règles)
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

### ✅ [Done] Phase 4: Migration Mem0 Architecture
- ✅ Analyse complète des capacités Mem0
- ✅ Design système de compartiments avec tags
- ✅ Créer MemoryServiceV4 avec toutes capacités
- ✅ Implémenter custom_categories par compartiment
- ✅ Configurer custom_instructions avec règles
- ✅ Setup graph_memory pour relations pentesting
- ✅ Créer UI modulaire (CompartmentView)
- ✅ Intégration avec ChatStream via MemoryIntegration

### 📅 [Next] Phase 5: Intelligence Avancée
- Algorithmes génétiques pour payloads
- Pattern mining via Mem0 graph
- Kill Switch Score avec criteria retrieval
- Memory replay buffer natif Mem0

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
4. ✅ [DONE] Migration vers Mem0-first architecture
5. ✅ [DONE] Créer MemoryServiceV4.ts
6. ✅ [DONE] Implémenter compartiments pentesting
7. 🔄 [TODO] Tester avec vraies clés Mem0
8. 📝 [TODO] Déployer et initialiser projet Mem0

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