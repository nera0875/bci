# Guide d'Implémentation - BCI Tool v2

## 🚀 Ordre d'Exécution

### Étape 1: Setup Supabase
```bash
# 1. Créer un projet sur supabase.com
# 2. Copier l'URL et les clés
# 3. Exécuter le schéma SQL dans l'éditeur Supabase
```

### Étape 2: Installation des Dépendances
```bash
cd bci-tool-v2
npm install @supabase/supabase-js
npm install react-hot-toast
npm install react-markdown
npm install openai
npm install framer-motion
```

### Étape 3: Configuration Environnement
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

## 📁 Structure des Fichiers à Créer

```
/app
├── /chat
│   └── /[id]
│       └── page.tsx         # Interface principale
├── /api
│   ├── /supabase
│   │   ├── /memory
│   │   │   └── route.ts     # CRUD memory nodes
│   │   ├── /chat
│   │   │   └── route.ts     # Messages streaming
│   │   └── /rules
│   │       └── route.ts     # Rules management
│   └── /claude
│       └── stream
│           └── route.ts     # Streaming Claude responses
│
/components
├── /chat
│   ├── ChatStream.tsx       # Chat avec streaming
│   └── MessageBubble.tsx
├── /memory
│   ├── MemorySidebar.tsx    # Sidebar dynamique
│   ├── MemoryNode.tsx       # Nœud individuel
│   └── DynamicWidget.tsx    # Widgets JSON Schema
├── /rules
│   └── RulesTable.tsx       # Table des règles
└── /goal
    └── GoalBar.tsx          # Barre d'objectif

/lib
├── /supabase
│   ├── client.ts            # Client Supabase
│   └── queries.ts           # Requêtes réutilisables
├── /ai
│   ├── claude.ts            # Intégration Claude
│   └── embeddings.ts        # OpenAI embeddings
└── /memory
    └── schema-renderer.ts   # JSON Schema UI renderer
```

## 🔧 Composants Clés à Implémenter

### 1. MemorySidebar avec JSON Schema UI
```typescript
interface MemoryNode {
  id: string
  type: 'folder' | 'document' | 'widget' | 'pattern'
  name: string
  content: any // JSON flexible
  color: string
  icon: string
  children?: MemoryNode[]
}

// Claude peut envoyer :
{
  action: "create_node",
  node: {
    type: "widget",
    name: "Success Tracker",
    content: {
      widget_type: "chart",
      data: [...]
    }
  }
}
```

### 2. Chat avec Streaming
```typescript
// Utiliser Server-Sent Events pour streaming
const response = await fetch('/api/claude/stream', {
  method: 'POST',
  body: JSON.stringify({ message, context })
})

const reader = response.body.getReader()
// Process chunks as they arrive
```

### 3. Rules Table Dynamique
```typescript
interface Rule {
  name: string
  trigger: string      // "on_message" | "on_request" | "always"
  action: string       // "analyze" | "store" | "alert"
  config: {
    target_folder?: string
    confidence_threshold?: number
  }
}
```

## 🎯 Interface Principale (`/chat/[id]/page.tsx`)

```
┌─────────────────────────────────────────────┐
│                GOAL BAR                     │
│  Current: "Find SQLi in /api/*"             │
└─────────────────────────────────────────────┘

┌─────────┬────────────────────┬──────────────┐
│ MEMORY  │       CHAT         │    RULES     │
│         │                    │              │
│ 📁 Reqs │ [Streaming msgs]  │ ✓ Parse HTTP │
│ 📁 XSS  │                    │ ✓ Find SQLi │
│ 📊 Stats│ User: test this   │ ✓ Learn     │
│ 🔥 Hot  │ Claude: I found.. │              │
│         │                    │ [+ Add Rule] │
│ [+ New] │ [Input box]        │              │
└─────────┴────────────────────┴──────────────┘
```

## 🔄 Flow de Données

1. **User → Chat** : Message envoyé
2. **Chat → Claude API** : Avec contexte mémoire
3. **Claude → Actions** :
   - Créer/modifier memory nodes
   - Analyser requests
   - Générer payloads
4. **Supabase Realtime** : Sync instantané
5. **UI Update** : Sidebar se met à jour

## 🧠 Intégration Claude

```typescript
// Claude peut exécuter des commandes
const claudeActions = {
  memory: {
    create: (node) => supabase.from('memory_nodes').insert(node),
    update: (id, data) => supabase.from('memory_nodes').update(data),
    delete: (id) => supabase.from('memory_nodes').delete()
  },
  analysis: {
    vectorize: (text) => openai.embeddings.create(text),
    findSimilar: (embedding) => supabase.rpc('search_similar_memories')
  }
}
```

## ⚡ Optimisations Critiques

1. **Streaming obligatoire** pour fluidité
2. **Optimistic updates** sur la sidebar
3. **Debounce** sur les rules changes
4. **Virtual scrolling** si beaucoup de nodes
5. **WebSocket** pour real-time Supabase

## 🎨 Styles Monochrome

```css
/* Utiliser les variables CSS définies */
bg-background    → #FFFFFF
text-foreground   → #202123
bg-muted         → #F7F7F8
text-muted       → #6E6E80
border-border    → #E5E5E5
```

## 📝 Checklist de Validation

- [ ] Supabase connecté et tables créées
- [ ] Chat avec streaming fonctionnel
- [ ] Sidebar affiche les memory nodes
- [ ] Claude peut CRUD les nodes
- [ ] Rules table éditable
- [ ] Goal bar en haut
- [ ] Isolation complète par projet
- [ ] Embeddings fonctionnels
- [ ] Real-time sync

---
*Ce guide est LA référence pour continuer si le chat est coupé*