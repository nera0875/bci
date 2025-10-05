# 📋 TODO - Tâches Projet DASH1

**Dernière MAJ:** 2025-10-04 12:00

---

## 🔴 CRITIQUE (Bloque fonctionnalités)

Aucune tâche critique en attente ✅

---

## 🟡 IMPORTANT (UI/UX dégradée)

- [ ] **Refonte Rules UI avec catégories** - 4h - DEPUIS: 2025-10-03
  - Problème: Trigger/Action confus, pas de catégories, templates mélangés
  - Solution: Tabs (Authentication/API/Business Logic) + switches Focus ON/OFF
  - Fichier: `RulesCompact.tsx`

- [ ] **Fix Memory drag & drop** - 2h - DEPUIS: 2025-10-03
  - Problème: Implementation incomplète (ligne 100+ tronquée)
  - Solution: Implémenter react-beautiful-dnd ou @dnd-kit
  - Fichier: `MemoryPro.tsx`

- [ ] **Refonte Intelligence UI** - 2h - DEPUIS: 2025-10-03
  - Problème: Scroll infini, pas de catégorisation claire
  - Solution: Boutons filters par type (Storage/Rules/Improvements/Patterns)
  - Fichier: `SuggestionsPanel.tsx`, `IntelligenceSection.tsx`

---

## 🟢 AMÉLIORATION (Post-100%)

- [ ] **Background job pattern analysis** - 2h
  - Cron quotidien pour analyser user_decisions
  - Auto-génération learned_patterns sans intervention
  - Auto-promotion implicit_rules si confidence > 90%

- [ ] **Memory breadcrumb navigation** - 1h
  - Afficher chemin complet (Home > Success > SQL Injection)
  - Clic sur breadcrumb pour naviguer

- [ ] **Virtualization arbre Memory** - 3h
  - react-window pour performance si 1000+ items
  - Lazy loading enfants folders

- [ ] **Export/Import projet complet** - 4h
  - Export: memory + rules + patterns + settings → JSON
  - Import: merge ou replace
  - Templates partagés communauté

---

## ✅ TERMINÉES (Auto-supprimées après 24h)

- [x] **Fix user_decisions insert** - 2025-10-03 ← SUPPRIMÉ 2025-10-04
- [x] **Refonte mémoire Claude (3 fichiers .md)** - 2025-10-03 ← SUPPRIMÉ 2025-10-04
- [x] **Session 9 complète** - 2025-10-03 ← SUPPRIMÉ 2025-10-04

---

## 📊 Progression

| Priorité | Tâches pending | Temps estimé |
|----------|----------------|--------------|
| 🔴 CRITIQUE | 0 | 0h ✅ |
| 🟡 IMPORTANT | 3 | 8h |
| 🟢 AMÉLIORATION | 4 | 10h |
| **TOTAL** | **7** | **18h** |

---

**⚠️ RÈGLES:**
- Tâche terminée → Je coche ✅ immédiatement
- 24h après → Je SUPPRIME la ligne (pas d'historique infini)
- Seules les tâches PENDING restent visibles
- Nouvelle tâche → J'ajoute avec priorité + estimation + date DEPUIS
