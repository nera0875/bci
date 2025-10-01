# 📡 BCI Tool v2 - Documentation API

## Vue d'Ensemble

Cette documentation couvre les endpoints API REST de BCI Tool v2, organisés par domaine fonctionnel. Tous les endpoints retournent des réponses JSON standardisées.

### Format de Réponse Standard

```json
{
  "success": true|false,
  "data": {},           // Données de réponse (si succès)
  "error": "message",   // Message d'erreur (si échec)
  "message": "info"     // Message informatif (optionnel)
}
```

### Codes de Statut HTTP

- `200` - Succès
- `201` - Créé avec succès
- `400` - Requête invalide
- `401` - Non autorisé
- `404` - Non trouvé
- `500` - Erreur serveur

---

## 🔄 API Unifiée (`/api/unified`)

Endpoints pour la gestion des données unifiées (sections, dossiers, tableaux, lignes). Supporte la hiérarchie complète : Sections → Dossiers → Tableaux → Lignes.

### 📊 `/api/unified/columns` - Gestion des Colonnes

#### GET `/api/unified/columns?nodeId={id}`
Récupère la configuration des colonnes d'un tableau.

**Paramètres Query:**
- `nodeId` (requis): ID du nœud tableau

**Réponse:**
```json
{
  "success": true,
  "columns": [
    {
      "id": "col_1",
      "name": "Nom",
      "type": "text",
      "width": 200,
      "editable": true
    }
  ]
}
```

#### POST `/api/unified/columns`
Crée ou met à jour une colonne.

**Corps:**
```json
{
  "nodeId": "node_123",
  "column": {
    "id": "col_1",
    "name": "Nouvelle Colonne",
    "type": "text",
    "width": 150
  }
}
```

### 📋 `/api/unified/data` - Gestion des Données

#### GET `/api/unified/data?nodeId={id}&level={level}`
Récupère toutes les lignes de données d'un tableau. Supporte le ciblage multi-niveau.

**Paramètres Query:**
- `nodeId` (requis): ID du nœud tableau
- `level` (optionnel): Niveau hiérarchique (section, folder, table, row)

**Réponse:**
```json
{
  "success": true,
  "rows": [
    {
      "id": "row_1",
      "nom": "Test Value",
      "description": "Description test",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "hierarchy": "rules/Business Logic/table1"
    }
  ]
}
```

#### POST `/api/unified/data`
Ajoute une nouvelle ligne de données avec support drag & drop (via ordre).

**Corps:**
```json
{
  "nodeId": "node_123",
  "data": {
    "nom": "Nouvelle Entrée",
    "description": "Description détaillée",
    "statut": "actif"
  },
  "position": 3  // Pour drag & drop
}
```

**Réponse:**
```json
{
  "success": true,
  "row": {
    "id": "row_new",
    "data": { "nom": "Nouvelle Entrée", ... }
  },
  "message": "Ligne ajoutée"
}
```

#### PUT `/api/unified/data`
Met à jour une cellule spécifique, supporte édition inline.

**Corps:**
```json
{
  "rowId": "row_123",
  "columnId": "col_nom",
  "value": "Nouvelle Valeur",
  "target": "rules/Authentication/table1/row-3"  // Ciblage multi-niveau
}
```

#### DELETE `/api/unified/data`
Supprime une ligne de données.

**Corps:**
```json
{
  "rowId": "row_123",
  "hierarchyPath": "memory/Success/table1"  // Optionnel pour confirmation
}
```

### 🎯 `/api/unified/hierarchy` - Gestion de la Hiérarchie (Nouveau)

#### GET `/api/unified/hierarchy?projectId={id}&path={path}`
Récupère la structure hiérarchique complète ou un sous-arbre.

**Paramètres Query:**
- `projectId` (requis): ID du projet
- `path` (optionnel): Chemin comme "rules/Business Logic"

**Réponse:**
```json
{
  "success": true,
  "hierarchy": {
    "sections": ["rules", "memory", "optimization"],
    "folders": [
      {
        "name": "Business Logic",
        "tables": ["table1", "table2"],
        "rowsCount": 15
      }
    ]
  }
}
```

#### POST `/api/unified/hierarchy/move`
Déplace un nœud dans la hiérarchie (support drag & drop).

**Corps:**
```json
{
  "nodeId": "node_123",
  "newParentId": "folder_456",
  "position": 2
}
```

---

## 💬 API Chat (`/api/chat`)

Endpoints pour l'interaction avec le système de chat IA, intégration avec board.

### 🎯 `/api/chat/stream` - Chat en Streaming

#### POST `/api/chat/stream`
Initie une conversation en streaming avec Claude, supporte ciblage multi-niveau.

**Corps:**
```json
{
  "projectId": "proj_123",
  "message": "Analyse cette requête POST /login",
  "context": "pentesting",
  "target": "memory/Success/table1",  // Intégration chat-board
  "temperature": 0.7
}
```

**Réponse (Streaming):**
```
data: {"type": "start", "conversationId": "conv_123"}
data: {"type": "chunk", "content": "D'après"}
data: {"type": "end", "usage": {"tokens": 150}, "suggestions": ["Test similaire"]}
```

### 📝 `/api/chat/[projectId]` - Gestion des Conversations

#### GET `/api/chat/[projectId]`
Récupère l'historique des conversations d'un projet.

**Paramètres:**
- `projectId` (URL): ID du projet

**Réponse:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv_1",
      "messages": [...],
      "integrations": ["rangement_auto: memory/Success"]
    }
  ]
}
```

#### POST `/api/chat/[projectId]`
Envoie un message dans une conversation existante.

**Corps:**
```json
{
  "conversationId": "conv_123",
  "message": "Peux-tu élaborer ?",
  "context": "follow-up",
  "autoDetect": true  // Détection et rangement auto
}
```

---

## 🧠 API Mémoire (`/api/memory`)

Endpoints pour le système de mémoire adaptative RAG.

### 🎯 `/api/memory/nodes` - Gestion des Nœuds Mémoire

#### GET `/api/memory/nodes?projectId={id}&section={section}&query={query}`
Récupère les nœuds mémoire avec recherche sémantique.

**Paramètres Query:**
- `projectId` (requis): ID du projet
- `section` (optionnel): Section (memory, rules, optimization)
- `query` (optionnel): Recherche sémantique

#### POST `/api/memory/nodes`
Crée un nouveau nœud mémoire.

**Corps:**
```json
{
  "projectId": "proj_123",
  "type": "document",
  "name": "Nouvelle Mémoire",
  "content": {
    "raw_content": "Contenu détaillé",
    "context": "business-logic",
    "type": "success",
    "importance": 0.8  // Adaptative
  },
  "section": "memory",
  "parentId": "folder_123"
}
```

### 🔄 `/api/memory/update` - Mise à Jour Mémoire

#### POST `/api/memory/update`
Met à jour l'importance d'un élément mémoire (adaptative).

**Corps:**
```json
{
  "itemId": "memory_123",
  "action": "usage",  // ou "success", "failure", "cleanup"
  "importanceDelta": 0.1
}
```

### 🎯 `/api/memory/ai-control` - Contrôle IA

#### POST `/api/memory/ai-control`
Déclenche l'optimisation automatique de la mémoire (nettoyage, RAG).

**Corps:**
```json
{
  "projectId": "proj_123",
  "action": "optimize"  // ou "cleanup", "search", "rag"
}
```

**Réponse:**
```json
{
  "success": true,
  "stats": {
    "total": 150,
    "cleaned": 5,
    "avgImportance": 0.73
  }
}
```

### 🔍 `/api/memory/search` - Recherche Sémantique (Nouveau)

#### POST `/api/memory/search`
Effectue une recherche vectorielle RAG.

**Corps:**
```json
{
  "projectId": "proj_123",
  "query": "patterns de prix négatifs",
  "limit": 10,
  "threshold": 0.8
}
```

**Réponse:**
```json
{
  "success": true,
  "results": [
    {
      "id": "memory_123",
      "content": "Exemple de faille prix négatif",
      "similarity": 0.92,
      "hierarchy": "memory/Success/business-logic"
    }
  ]
}
```

---

## 📋 API Règles (`/api/rules`)

Endpoints pour la gestion des règles intelligentes (auto-application, priorisation).

### 📁 `/api/rules/folder-rules` - Règles par Dossier

#### GET `/api/rules/folder-rules?projectId={id}&folderId={id}`
Récupère les règles spécifiques à un dossier.

#### POST `/api/rules/folder-rules`
Applique une règle à un dossier avec priorisation.

**Corps:**
```json
{
  "projectId": "proj_123",
  "folderId": "folder_123",
  "rule": {
    "type": "validation",
    "condition": "price > 0",
    "action": "alert",
    "priority": 1,  // Dynamique
    "autoApply": true
  }
}
```

### 🔧 `/api/rules/simple` - Règles Simples

#### GET `/api/rules/simple?projectId={id}&priority={high|medium|low}`
Liste toutes les règles simples du projet, filtrées par priorité.

#### POST `/api/rules/simple`
Crée une nouvelle règle simple.

**Corps:**
```json
{
  "projectId": "proj_123",
  "name": "Règle de Validation Prix",
  "description": "Vérifie que le prix est positif",
  "condition": "prix > 0",
  "action": "bloquer_transaction",
  "priority": 1,
  "learningScore": 0.9  // Basé sur apprentissage
}
```

---

## 💾 API Export/Import (Nouveau)

Endpoints pour l'export et import de données (JSON/MD).

### 📤 `/api/export` - Export

#### GET `/api/export?projectId={id}&format={json|md}&path={hierarchyPath}`
Exporte la hiérarchie ou un sous-arbre.

**Paramètres Query:**
- `projectId` (requis): ID du projet
- `format` (optionnel): json ou md (défaut: json)
- `path` (optionnel): Chemin hiérarchique

**Réponse:**
```json
{
  "success": true,
  "data": { /* Structure JSON ou contenu MD */ },
  "filename": "export-bci-tool.json"
}
```

### 📥 `/api/import` - Import

#### POST `/api/import`
Importe des données depuis JSON ou MD.

**Corps:**
```json
{
  "projectId": "proj_123",
  "format": "json",
  "data": { /* Contenu à importer */ },
  "targetPath": "memory/Success"  // Ciblage multi-niveau
}
```

**Réponse:**
```json
{
  "success": true,
  "imported": 15,
  "message": "Import réussi, hiérarchie mise à jour"
}
```

---

## 🔔 API Notifications/Suggestions (Nouveau)

Endpoints pour les notifications et suggestions proactives.

### 💡 `/api/notifications` - Gestion des Notifications

#### GET `/api/notifications?projectId={id}&type={suggestion|alert}`
Récupère les notifications actives.

**Paramètres Query:**
- `projectId` (requis): ID du projet
- `type` (optionnel): suggestion, alert

**Réponse:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif_123",
      "type": "suggestion",
      "message": "Nettoyage mémoire recommandé",
      "priority": "high",
      "target": "memory/optimization"
    }
  ]
}
```

#### POST `/api/notifications/dismiss`
Marque une notification comme lue.

**Corps:**
```json
{
  "notificationId": "notif_123"
}
```

### 🎯 `/api/suggestions` - Suggestions Proactives

#### GET `/api/suggestions?projectId={id}&context={business-logic}`
Génère des suggestions basées sur l'apprentissage.

**Paramètres Query:**
- `projectId` (requis): ID du projet
- `context` (optionnel): Contexte détecté

**Réponse:**
```json
{
  "success": true,
  "suggestions": [
    {
      "text": "Tester variantes de prix négatifs",
      "confidence": 0.85,
      "action": "add_row_to: memory/Success"
    }
  ]
}
```

---

## ⚙️ API Utilitaires

### 🔍 `/api/verify-api-key` - Vérification API

#### POST `/api/verify-api-key`
Vérifie la validité d'une clé API.

**Corps:**
```json
{
  "apiKey": "sk-...",
  "provider": "openai"  // ou "anthropic"
}
```

### 📊 `/api/costs` - Suivi des Coûts

#### GET `/api/costs/track?projectId={id}&period={month}`
Récupère les statistiques de coût pour un projet.

**Réponse:**
```json
{
  "success": true,
  "costs": {
    "total": 12.45,
    "byProvider": { "openai": 8.90, "anthropic": 3.55 }
  }
}
```

### 🔧 `/api/optimization/analyze` - Analyse d'Optimisation

#### POST `/api/optimization/analyze`
Analyse les patterns d'utilisation pour optimisations (apprentissage).

**Corps:**
```json
{
  "projectId": "proj_123",
  "analysisType": "learning_patterns"  // ou "hierarchy_usage"
}
```

---

## 🤖 API IA Directe

### 💬 `/api/claude` - Claude AI Direct

#### POST `/api/claude`
Requête directe à Claude.

**Corps:**
```json
{
  "messages": [{ "role": "user", "content": "Analyse cette vulnérabilité" }],
  "system": "Tu es un expert en cybersécurité",
  "temperature": 0.7
}
```

### 📝 `/api/claude/stream` - Claude Streaming

#### POST `/api/claude/stream`
Requête en streaming à Claude.

### 🔍 `/api/openai/embeddings` - Embeddings OpenAI

#### POST `/api/openai/embeddings`
Génère des embeddings vectoriels pour RAG.

**Corps:**
```json
{
  "input": ["texte à vectoriser"],
  "model": "text-embedding-3-small"
}
```

---

## 📋 Exemples d'Utilisation

### Créer un Nouveau Test de Sécurité avec Hiérarchie

```javascript
// 1. Récupérer la hiérarchie
const hierarchy = await fetch(`/api/unified/hierarchy?projectId=proj_123&path=rules/Business Logic`);

// 2. Créer une colonne dans un tableau
const columnResponse = await fetch('/api/unified/columns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nodeId: 'table_123',
    column: { id: 'test_name', name: 'Nom du Test', type: 'text' }
  })
});

// 3. Ajouter des données avec ciblage multi-niveau
const dataResponse = await fetch('/api/unified/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nodeId: 'table_123',
    data: { test_name: 'SQL Injection Test', description: 'Test d\'injection' },
    target: 'rules/Business Logic/table1'
  })
});
```

### Recherche Sémantique et Suggestions

```javascript
// Recherche dans la mémoire adaptative
const searchResponse = await fetch('/api/memory/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'proj_123',
    query: 'failles business logic prix négatif',
    limit: 5
  })
});

const results = await searchResponse.json();

// Obtenir suggestions proactives
const suggestions = await fetch(`/api/suggestions?projectId=proj_123&context=business-logic`);
const suggData = await suggestions.json();

// Intégration chat-board : Rangement auto
const chatResponse = await fetch('/api/chat/stream', {
  method: 'POST',
  body: JSON.stringify({
    projectId: 'proj_123',
    message: 'Range ces résultats',
    target: 'memory/Success',
    autoDetect: true
  })
});
```

### Export/Import et Notifications

```javascript
// Export hiérarchie en MD
const exportResp = await fetch(`/api/export?projectId=proj_123&format=md&path=memory/Success`);
const exportData = await exportResp.blob();  // Pour téléchargement

// Import et mise à jour hiérarchie
await fetch('/api/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'proj_123',
    format: 'md',
    data: { /* Contenu MD */ },
    targetPath: 'rules/Authentication'
  })
});

// Vérifier notifications
const notifs = await fetch(`/api/notifications?projectId=proj_123&type=suggestion`);
const notifData = await notifs.json();
```

### Ciblage Multi-Niveau et Règles Intelligentes

```javascript
// Mise à jour ciblée
await fetch('/api/unified/data', {
  method: 'PUT',
  body: JSON.stringify({
    rowId: 'row_456',
    columnId: 'status',
    value: 'success',
    target: 'optimization/patterns/table2/row-5'
  })
});

// Appliquer règle avec priorisation
await fetch('/api/rules/simple', {
  method: 'POST',
  body: JSON.stringify({
    projectId: 'proj_123',
    name: 'Nouvelle Règle',
    condition: 'efficacité > 0.8',
    action: 'prioriser',
    priority: 'high',
    autoApply: true
  })
});
```

---

## 🔒 Authentification & Sécurité

Tous les endpoints nécessitent une authentification valide via Supabase. Les clés API sensibles sont gérées côté serveur et ne sont jamais exposées au frontend.

### Variables d'Environnement Requises

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key
```

### Gestion des Erreurs

```javascript
try {
  const response = await fetch('/api/unified/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error);
  }

  console.log(result.data);
} catch (error) {
  console.error('Erreur API:', error.message);
}
```

---

*Documentation générée automatiquement - Dernière mise à jour: 2025-09-29*