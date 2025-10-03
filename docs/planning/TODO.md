# TODO - BCI Tool v2

## 🔥 Tâches Prioritaires

### Auto-Reinforcement System (NOUVEAU - 2025-10-03)
- [ ] Implémenter decision tracking UI dans ChatStream (toasts ✅/✏️/❌)
- [ ] Créer composant SuggestionsReview pour valider implicit rules
- [ ] Setup background job quotidien pour pattern analysis
- [ ] Tester cycle complet: decision → pattern → implicit rule → promotion

### Chat Integration
- [ ] Intégrer httpParser dans le chat stream
- [ ] Afficher prédictions avec pourcentages
- [ ] Créer queue de validation des découvertes
- [ ] Connecter les playbooks au système de chat

### UI Improvements
- [ ] Ajouter bouton "Expand All/Collapse All" dans Memory
- [ ] Améliorer performance rendering arbre Memory (virtualization?)
- [ ] Ajouter search highlighting dans Memory/Rules

## ✅ Tâches Complétées (2025-10-03 Session 3)

### Corrections Critiques Runtime
- [x] Fix optimizationEngine.ts:374 - this.supabase undefined
- [x] Fix memory_nodes queries - Remove category filter (400 Bad Request)
- [x] Fix conversation.ts - Message cache 409 Conflict
- [x] Fix ChatStream.tsx - Fetch error handling + AbortError detection
- [x] Fix Realtime subscription - Backoff exponentiel (5 retries)

### Auto-Reinforcement Foundations
- [x] Créer migration message_cache avec embeddings
- [x] Créer migration user_decisions pour tracking
- [x] Créer migration learned_patterns pour pattern detection
- [x] Créer migration implicit_rules pour auto-generated rules
- [x] Appliquer toutes les migrations via MCP Supabase
- [x] Documenter architecture dans AUTO_REINFORCEMENT_ARCHITECTURE.md

### UI Memory Improvements
- [x] Auto-expand tous les folders au chargement (128 items visibles)
- [x] Ajouter bouton "Change Icon" avec modal picker
- [x] Ajouter bouton "Change Color" avec 8 couleurs (Red→Gray)
- [x] Fonctions updateIcon/updateColor implémentées

### Documentation
- [x] Mettre à jour DAILY_LOG.md avec session 3
- [x] Mettre à jour CURRENT_STATE.md (78% → Backend 95%, UI 95%, Intelligence 70%)

## ✅ Tâches Complétées (2025-10-03 Session 2)

### Refactoring Majeur UI
- [x] Refaire complètement MemoryPro.tsx - Layout 2 colonnes avec édition directe
- [x] Refaire complètement RulesCompact.tsx - Système Playbooks avec éditeur JSON
- [x] Refaire complètement SettingsPro.tsx - Templates illimités avec import/export
- [x] Supprimer tous les panels dépliants problématiques
- [x] Implémenter renommage inline dans Memory
- [x] Ajouter éditeur de contenu direct dans Memory
- [x] Créer système de playbooks personnalisables
- [x] Ajouter gestion complète des templates (CRUD + import/export)

### Tables Supabase
- [x] Créer table `patterns` pour stockage techniques
- [x] Créer table `predictions` pour prédictions IA
- [x] Créer table `rules` pour playbooks
- [x] Créer table `learning_data` pour apprentissage
- [x] Ajouter `system_prompt` à table `projects`

### Services
- [x] Créer httpParser.ts pour parse requêtes HTTP
- [x] Simplifier configuration agents
- [x] Intégrer system_prompt dans chat stream

## 📊 Progression Globale : 78%
- Backend/DB : 95% ✅ (Cache + embeddings + auto-reinforcement tables actifs)
- UI/Components : 95% ✅ (Memory expand-all + icon/color picker, erreurs fixées)
- Intelligence/Learning : 70% 📝 (Decision tracking ready, pattern learning foundations)
- Integration : 75% 🔧 (Contexte projet + cache + learning intégrés)