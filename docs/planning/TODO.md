# TODO - BCI Tool v2

## 🔥 Tâches Prioritaires

### Chat Integration (URGENT)
- [ ] Intégrer httpParser dans le chat stream
- [ ] Afficher prédictions avec pourcentages
- [ ] Créer queue de validation des découvertes
- [ ] Connecter les playbooks au système de chat

### Learning & Optimization
- [ ] Créer file de validation pour feedback
- [ ] Système de feedback pour learning continu
- [ ] Améliorer prédictions basées sur patterns
- [ ] Auto-création de memory nodes depuis le chat

### Learning & Optimization
- [ ] Créer file de validation pour feedback
- [ ] Système de feedback pour learning continu
- [ ] Améliorer prédictions basées sur patterns

## ✅ Tâches Complétées (2025-10-03)

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

## 📊 Progression Globale : 65%
- Backend/DB : 80% ✅
- UI/Components : 90% ✅
- Intelligence/Learning : 30% 📝
- Integration : 40% 🔧