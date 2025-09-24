# Décisions Techniques - BCI Pentesting Tool

## 🎯 Décisions Architecturales Majeures

### 1. Migration Mem0-First (23/09/2024)
**Contexte** : Besoin d'un système où l'IA peut facilement modifier/organiser la mémoire
**Décision** : Utiliser Mem0 comme système principal, Supabase uniquement pour l'UI
**Raison** :
- Mem0 offre RAG vectoriel, auto-consolidation, graph memory natifs
- Custom categories/instructions permettent règles par compartiment
- IA peut modifier naturellement via chat

### 2. Compartiments vs Dossiers
**Contexte** : Structure hiérarchique rigide limitante
**Décision** : Utiliser tags/catégories comme compartiments visuels
**Raison** :
- Plus flexible (multi-tags possibles)
- IA comprend mieux les concepts que les chemins
- Recherche multi-dimensionnelle

### 3. LLM Natif via Mem0
**Contexte** : Intégration Claude pour extraction mémoire
**Décision** : Configurer Anthropic directement dans Mem0
**Raison** :
- Extraction automatique des entités
- Custom prompts par projet
- Pas de middleware nécessaire

## 📋 Conventions Techniques

### Naming Conventions
- **Services** : PascalCase avec suffixe Service (ex: MemoryServiceV4)
- **Compartiments** : snake_case (ex: success_exploits, failed_attempts)
- **Categories** : snake_case descriptif
- **UI Components** : PascalCase (ex: CompartmentSidebar)

### Structure Mémoire
```javascript
{
  // Tag principal = compartiment
  primary_category: "success_exploits",

  // Sous-organisation
  tags: ["xss", "admin_panel", "bypass_csp"],

  // Contenu structuré
  content: "payload + conditions + résultat",

  // Métadonnées
  metadata: {
    target: "url",
    success_rate: 100,
    rules: {} // Règles spécifiques
  }
}
```

### Règles par Compartiment
Chaque compartiment DOIT avoir :
1. **custom_instructions** : Prompt système forcé
2. **required_fields** : Champs obligatoires
3. **auto_actions** : Actions automatiques
4. **retention** : Durée de conservation

## 🔧 Stack Technique Final

### Core
- **Memory** : Mem0 Cloud API
- **LLM** : Claude 3.5 via Mem0 natif
- **Embeddings** : OpenAI text-embedding-3-small
- **Graph** : Neo4j (si besoin, via Mem0)

### Frontend
- **Framework** : Next.js 15.5
- **UI** : Tailwind CSS + Framer Motion
- **State** : React Context + Mem0 cache

### Backend Minimal
- **Database** : Supabase (UI metadata seulement)
- **Auth** : Supabase Auth
- **Realtime** : Supabase Realtime (si besoin)

## 🚫 Décisions de NE PAS faire

1. **Pas de stockage local** : Tout dans Mem0
2. **Pas de hiérarchie rigide** : Tags flexibles
3. **Pas de duplication** : Une seule source de vérité (Mem0)
4. **Pas de backend complexe** : Mem0 gère la logique

## ✅ Patterns à Suivre

### Ajout Mémoire
```typescript
// TOUJOURS passer par compartiment
await memoryService.addToCompartment("success", content)
// PAS de add() direct
```

### Recherche
```typescript
// TOUJOURS avec critères pentesting
await memoryService.searchWithCriteria(query, {
  priority: "exploits",
  recency: true
})
```

### Modification Règles
```typescript
// TOUJOURS via project.update()
await client.project.update({
  custom_instructions: newRules
})
```

## 📊 Métriques de Succès

- IA peut créer/modifier compartiments en < 5 secondes
- Recherche RAG trouve résultats pertinents à 90%+
- Auto-consolidation réduit doublons de 80%
- Graph révèle patterns cachés dans 70% des cas

---
*Décisions mises à jour le 23/09/2024*