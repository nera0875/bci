# Architecture Mem0 pour BCI Pentesting Tool

## 🎯 Vision
Système de mémoire ultra-modulaire où l'IA peut organiser, modifier et apprendre naturellement via le chat, avec des compartiments intelligents pour le pentesting.

## 🏗️ Architecture Technique Complète

### Système de Compartiments (Tags/Catégories)
Au lieu de dossiers physiques, utilisation des **custom_categories** Mem0 :

```javascript
// Compartiments pentesting
custom_categories: [
  {
    "success_exploits": "Exploits validés avec payload, conditions, contournements"
  },
  {
    "failed_attempts": "Tentatives échouées avec analyse et suggestions"
  },
  {
    "reconnaissance": "Infos collectées: ports, services, technologies, CVEs"
  },
  {
    "active_plans": "Plans d'attaque, prochaines étapes, hypothèses"
  },
  {
    "patterns": "Techniques réutilisables extraites des succès"
  }
]
```

### Règles par Compartiment (Custom Instructions)
Chaque compartiment a ses propres règles que l'IA DOIT respecter :

```javascript
// Exemple pour SUCCESS
custom_instructions: `
  POUR success_exploits:
  - TOUJOURS extraire: payload exact, URL, headers, conditions
  - CRÉER: liens vers failed_attempts similaires
  - GÉNÉRER: 5 variations du payload
  - FORMAT: structured_exploit_template
  - RETENTION: permanent

  POUR failed_attempts:
  - ANALYSER: protection détectée, erreur
  - SUGGÉRER: contournements possibles
  - LIER: succès similaires pour patterns
  - RETENTION: 30 jours
`
```

### Graph Memory (Relations)
Configuration pour créer des liens intelligents :

```javascript
graph_config: {
  custom_prompt: `
    Relations pentesting:
    - exploit BYPASSES protection
    - payload TARGETS service
    - failure SUGGESTS technique
    - recon REVEALS vulnerability
  `,
  relationships: [
    "bypasses", "targets", "suggests",
    "reveals", "leads_to", "countered_by"
  ]
}
```

### Fonctionnalités Mem0 Utilisées

1. **Custom Categories** : Compartiments visuels
2. **Custom Instructions** : Règles par zone
3. **Graph Memory** : Relations entre exploits
4. **Include/Exclude** : Filtrage intelligent
5. **Criteria Retrieval** : Priorisation pentesting
6. **RAG Vectoriel** : Recherche sémantique
7. **Auto-consolidation** : Fusion mémoires similaires
8. **History API** : Versioning des changements
9. **Native LLM** : Claude directement via Mem0
10. **Retention Rules** : Gestion cycle de vie

## 📁 Structure MemoryServiceV4

```typescript
class MemoryServiceV4 {
  // Configuration compartiments
  private compartments: Map<string, CompartmentConfig>

  // Méthodes principales
  async addToCompartment(name: string, content: string)
  async searchWithCriteria(query: string, criteria: PentestCriteria)
  async updateCompartmentRules(name: string, rules: Rules)
  async getGraphRelations(nodeId: string)
  async applyAutoActions(compartment: string, memoryId: string)
}
```

## 🎨 UI Modulaire

### Sidebar Compartiments
```tsx
<Sidebar>
  <Compartment name="✅ Success" category="success_exploits">
    <ViewToggle modes={["cards", "list", "timeline"]} />
    <MemoryDisplay filter="category:success_exploits" />
  </Compartment>

  <Compartment name="❌ Failed" category="failed_attempts">
    <MemoryTimeline filter="category:failed_attempts" />
  </Compartment>
</Sidebar>
```

### Panel Règles (Droite)
```tsx
<RulesPanel>
  <InstructionsEditor /> // Éditer custom_instructions
  <FilterConfig />       // Includes/Excludes
  <AutoActions />        // Actions automatiques
  <RetentionRules />     // Durée de vie
</RulesPanel>
```

## 🔄 Flux d'Interaction IA

### Ajout Naturel
**User**: "Ce XSS a marché sur admin.site.com"
**IA**:
1. Détecte compartiment "success"
2. Applique instructions du compartiment
3. Extrait payload, target, conditions
4. Génère variations
5. Crée liens graph

### Recherche Intelligente
**User**: "Montre les SQLi qui ont contourné des WAF"
**IA**: Utilise criteria retrieval + RAG pour trouver

### Modification Règles
**User**: "Dans Success, génère toujours 10 variations"
**IA**: Met à jour custom_instructions du compartiment

## 🚀 Implémentation

### Phase 1: Core (En cours)
- [ ] MemoryServiceV4.ts avec toutes capacités
- [ ] Configuration compartiments pentesting
- [ ] Custom instructions par zone
- [ ] Graph memory setup

### Phase 2: UI
- [ ] Sidebar compartiments modulaire
- [ ] Panel règles éditable
- [ ] Vue multi-modes (cards/list/timeline)
- [ ] Filtres visuels

### Phase 3: Intelligence
- [ ] Auto-actions par compartiment
- [ ] Pattern extraction automatique
- [ ] Criteria retrieval pentesting
- [ ] Learning from graph

## 🔐 Variables Environnement

```env
MEM0_API_KEY=            # API Mem0 Cloud
ANTHROPIC_API_KEY=       # Pour LLM natif
OPENAI_API_KEY=          # Pour embeddings
NEXT_PUBLIC_MEM0_API_KEY= # Client-side
```

## 💡 Avantages Architecture

1. **Modulaire** : Chaque compartiment = indépendant
2. **Évolutif** : Ajouter compartiments à la volée
3. **Intelligent** : IA comprend et respecte les règles
4. **Naturel** : Modification via chat naturel
5. **Puissant** : Utilise TOUTES les capacités Mem0
6. **Flexible** : UI peut afficher comme on veut

## 📝 Exemples Commandes Chat

- "Ajoute ce payload dans Success"
- "Montre tous les XSS qui ont échoué"
- "Change la règle pour garder les Failed 60 jours"
- "Trouve des patterns similaires à cet exploit"
- "Crée un compartiment pour les 0-days"
- "Lie cet échec aux succès SQLi"

---
*Architecture définie le 23/09/2024 - Migration Mem0-first*