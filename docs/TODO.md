# 📋 TODO - Pentesting Focus

**✅ SYSTÈME ACTUEL: FactsMemoryViewPro.tsx (propre, organisé, modulaire)**

**Total: 8 tâches optimisation | ~15h**

---

## 🔥 PHASE 1: Optimisations Système Actuel (1-2 jours)

- [ ] **Inline edit (double-click)** 🟡 - 3h
  - Double-click sur fact → edit inline sans ouvrir side panel
  - Edit tags, severity, technique directement dans l'accordion
  - Save avec Enter, cancel avec Esc
  - Garde side panel pour édition complète si besoin

- [ ] **Auto-expand categories avec facts** 🟢 - 1h
  - Categories avec facts s'expand automatiquement au chargement
  - Garde collapsed state en localStorage
  - Améliore UX (moins de clics)

---

## 🎯 PHASE 2: Quick Filters & Bulk Operations (1-2 jours)

- [ ] **Quick filters par technique** 🟡 - 2h
  - Badges cliquables: [SQLi] [IDOR] [XSS] [BLV] [Price Manip]
  - Click → filter facts par technique
  - Counter sur chaque badge (ex: "SQLi (5)")

- [ ] **Quick filters par severity** 🟡 - 1h
  - Badges cliquables: [🔴 Critical] [🟠 High] [🟡 Medium] [🟢 Low]
  - Tri par severity par défaut (critical en haut)

- [ ] **Quick filters par result** 🟡 - 1h
  - Badges: [✅ Success] [❌ Failed] [⏳ Testing]
  - Voir rapidement vulns confirmées vs tests ratés

- [ ] **Bulk operations** 🟡 - 2h
  - Checkbox select multiple facts
  - Actions: Bulk delete, Bulk add tags, Bulk export
  - Barre d'actions flottante quand sélection active

---

## 🚀 PHASE 3: Export & Integration Burp (1 jour)

- [ ] **Export Markdown amélioré** 🟢 - 2h
  - Bouton "Export" → rapport MD format Bug Bounty
  - Groupé par severity PUIS technique
  - Inclut endpoints, payloads, tags
  - Template customizable

- [ ] **Import requêtes Burp** 🟢 - 3h
  - Bouton "Import Burp" (parse .txt ou .xml)
  - Auto-créer facts depuis requêtes HTTP
  - Détecte: endpoint, method, params, headers
  - Preview avant import (confirmation)

---

## ⚠️ SUPPRIMÉ / REJETÉ

**Rejeté (Session 17):**
- ❌ **FactsMemoryViewUltra.tsx** → Anarchie, facts partout, trop désorganisé
- ❌ **Supprimer memory_categories table** → Nécessaire pour FactsMemoryViewPro.tsx
- ❌ **Unifier Category + Tags** → Categories = organisation, Tags = metadata (2 usages différents)
- ❌ **Supprimer memory_nodes complètement** → Gardée vide pour FK rules (pas utilisée)

**Pas prioritaire:**
- ~~Token usage tracking UI~~ → Header affiche déjà "Costs: $0"
- ~~Success rate visualization~~ → Patterns panel affiche déjà success rate
- ~~Dashboard temps réel~~ → Header affiche Memory Items (10), Suggestions (34)
- ~~Breadcrumb navigation~~ → Sidebar suffit
- ~~Search global (⌘K)~~ → Quick search existe
- ~~Test Matrix Phases 5-8~~ → Complexe, pas bloquant
- ~~Real-time collaboration~~ → Pas nécessaire (usage solo)
- ~~WebSocket~~ → Pas nécessaire
- ~~Documentation~~ → Pas prioritaire

---

## ✅ SYSTÈME ACTUEL VALIDÉ

**FactsMemoryViewPro.tsx features:**
- ✅ Accordions par categories (expand/collapse)
- ✅ Category management modal (create/edit/delete emoji + label)
- ✅ Side panel édition complète (description, category, severity, technique, tags)
- ✅ Filters: Search, Category dropdown, Severity dropdown
- ✅ Badges severity colorés
- ✅ Metadata visible (created_at, updated_at)
- ✅ Supabase API /api/memory/categories
- ✅ Migration auto localStorage → Supabase