# DAILY LOG - BCI Tool v2

## [2025-10-03 - Session 2 : Corrections et nouvelles features]
- **Fichiers modifiés** : UnifiedBoardUltra.tsx, UnifiedSidebarUltra.tsx, CostsSection.tsx (créé)
- **Changements** :
  - Créé table suggestions_queue via MCP Supabase
  - Fix colonnes manquantes dans rules table (focus_type, metadata)
  - Ajouté onglet Costs pour tracker dépenses API et économies du cache
  - Ajouté metadata dans chat_messages pour tracking des coûts
- **État** : Erreurs 404/400 corrigées, nouveau système de tracking des coûts opérationnel
- **Prochaine étape** : Delete chat dans sidebar, optimiser switching entre sections

## [2025-10-03 - Refactoring majeur des 3 systèmes]
- **Fichiers modifiés** : MemoryPro.tsx, RulesCompact.tsx, SettingsPro.tsx
- **Changements** :
  - Memory : Layout 2 colonnes, édition directe du contenu, plus de modal inutile
  - Rules → Playbooks : Système complet avec éditeur JSON, templates, import/export
  - Settings : Templates illimités, création/édition/suppression, arborescence par catégories
- **État** : 3 systèmes principaux refaits à 100%, interfaces simplifiées et fonctionnelles
- **Prochaine étape** : Tester l'intégration avec le chat et les prédictions IA

## [2025-10-03 - Session initiale]
- **Fichiers créés** : TODO.md, DAILY_LOG.md
- **Changements** : Création de la structure de documentation pour persistance mémoire entre sessions
- **État** : Reprise du projet à 40% de complétion
- **Prochaine étape** : Refactoring des systèmes principaux

## [Sessions précédentes - Reconstitué depuis CURRENT_STATE.md]

### Tables Supabase créées
- patterns, predictions, rules, learning_data
- system_prompt ajouté à projects

### Composants créés/modifiés
- RulesCompact.tsx - Interface rules avec panels (non fonctionnels)
- SettingsPro.tsx - Configuration system prompt + templates
- MemoryPro.tsx - Drag & drop + éditeur Monaco (renommage non implémenté)
- radio-group.tsx ajouté

### Services créés
- httpParser.ts pour parsing requêtes HTTP (non intégré au chat)

### Problèmes identifiés
- Rules : Layout trop étendu, panels non fonctionnels, pas d'édition/suppression
- Memory : onEdit non implémenté, suppression bugguée
- Chat : Parser HTTP non intégré, prédictions pas affichées