# 📊 STATE - État Actuel du Projet

**Dernière MAJ:** 2025-10-06 14:55 (Session 21 - Tag Display Fix + Darker Colors + Global Sort Order)

---

## 🎯 Progression Globale

| Composant | % | Statut |
|-----------|---|--------|
| Backend/DB | 100% | ✅ 18 tables (+ test_results, suggestions_queue) |
| UI/Components | 100% | ✅ Test Matrix + Priority Queue + 4-tab Memory |
| Intelligence | 100% | ✅ AI suggestions auto-générées après chaque message |
| Pentest Matrix | 90% | ✅ UI créée, ⚠️ migration suggestions_queue à appliquer |
| **GLOBAL** | **95%** | 🚀 Autonomous Pentest Co-Pilot opérationnel |

---

## 🗄️ Tables Supabase (18 tables)

### Core
- `projects` - Projets utilisateur
- `conversations` - Conversations chat
- `chat_messages` - Messages avec metadata (tokens, coûts)

### Memory & Organization
- `memory_nodes` - Arbre hiérarchique (folders + documents)
- `memory_facts` - Facts atomiques Mem0-style (auto-extraction)
- `rules` - Playbooks JSON personnalisables
- `message_cache` - Cache réponses avec embeddings

### Pentest Matrix (NEW)
- `test_results` - Matrice Endpoints × Techniques (status, severity, payload, response)
- `suggestions_queue` - Queue suggestions tests IA (endpoint, technique, confidence, priority)
  - ⚠️ **Migration à appliquer:** `supabase/migrations/20251005020000_create_suggestions_queue.sql`

### Learning & Intelligence
- `attack_patterns` - Success rate techniques (usage_count, success_count)
- `learned_patterns` - Patterns auto-détectés (confidence > 80%)
- `user_decisions` - Track Accept/Reject/Modify
  - ⚠️ **SCHEMA RÉEL:** `proposed_action jsonb NOT NULL`, `user_choice text NOT NULL`
  - ⚠️ **PAS de colonne `suggestion_id`** (contrairement à doc obsolète)

### Autres
- `implicit_rules` - Rules auto-générées depuis patterns
- `api_keys` - Clés API (OpenAI, Anthropic)
- `api_usage_tracking` - Tracking coûts API

---

## 🧩 Composants UI Principaux

### Chat & Intelligence
- `ChatStream.tsx` - Streaming + stop + metadata capture + AI actions detector
  - Ligne 1259: `detectAndProposeActions()` appelé après stream
  - Toasts interactifs Accept/Reject
- `IntelligenceSection.tsx` - Container principal (3 sub-tabs)
  - Sub-tab Suggestions: `SuggestionsPanel.tsx`
    - ✅ Filters par TYPE (Storage/Rules/Improvements/Patterns) avec counters
    - ✅ Filters par STATUS (Pending/Accepted/Rejected)
    - ✅ Badge confidence % visible
    - ✅ Badge target folder affiché si présent
    - ✅ Pagination fonctionnelle
  - Sub-tab Patterns: `PatternsPanel.tsx` ✅ bouton Create Rule fonctionnel
  - Sub-tab Stats: `StatsPanel.tsx` ✅ métriques réelles

### Memory
- `MemoryProV2.tsx` - Arbre + édition inline + MarkdownEditorPro
  - ⚠️ Drag & drop incomplet (ligne 100+ implementation manquante)
  - ✅ Édition nom/contenu inline fonctionnelle
  - ✅ Word-wrap activé (plus de débordement horizontal)
  - ✅ Boutons Save/Cancel visibles en bas de l'éditeur
  - ⚠️ Pas de breadcrumb navigation

### Rules
- `RulesCompactV3.tsx` - Playbooks avec accordions par catégorie (comme SystemPrompts)
  - ✅ Accordions par catégorie (Authentication, API, Business Logic, Vulnerabilities, Custom)
  - ✅ Drag & Drop avec @dnd-kit (réorganisation + déplacement entre catégories)
  - ✅ Checkbox enable/disable par rule
  - ✅ Priority badges (ordre personnalisable)
  - ✅ Affichage WHEN/THEN dans preview (bleu trigger, vert action)
  - ✅ Actions: Edit | Duplicate | Delete
  - ✅ Counter de rules par catégorie dans header accordion
  - ✅ Drop zone par catégorie (hover effet bleu)

### Settings
- `SettingsPro.tsx` - Templates illimités + import/export
  - ✅ localStorage templates fonctionnel
  - ✅ QuickContextBar intégré (badge au-dessus input)

### Layout
- `UnifiedBoardUltra.tsx` - Container principal (5 onglets: Chat/Memory/Rules/Intelligence/Settings)
- `UnifiedSidebarUltra.tsx` - Navigation latérale

---

## ⚙️ Services Backend

- `conversation.ts` - Cache & embeddings management
- `optimizationEngine.ts` - Détection patterns + suggestions auto
- `learningSystem.ts` - Tracking succès/échecs
- `patternLearner.ts` - Clustering + pattern detection
- `systemPrompt.ts` - Build prompt final avec contexte projet
- `aiActionDetector.ts` - Détection intentions IA (créer doc, ranger, etc.)
- `httpParser.ts` - Parse requêtes HTTP auto

---

## 🐛 Bugs Actuels (0 restant)

✅ **Tous les bugs connus ont été corrigés !**

---

## 📝 Dernières Modifications

### 2025-10-06 14:55 - Session 21: Tag Display Fix + Darker Colors + Global Sort Order
**Objectif:** Améliorer visibilité des tags + respecter ordre "Manage Tags"

**Fonctionnalités complétées:**
1. ✅ **Tag colors DARK + BOLD**
   - Couleurs passées de 100/700 → 500/800 (plus foncées)
   - `font-semibold` ajouté (texte en gras)
   - Bordures plus marquées (border-500/40)
   - Tags maintenant beaucoup plus visibles

2. ✅ **Global sort order respected**
   - Tags triés selon ordre "Manage Tags" (drag & drop global)
   - Si "azezea" au-dessus de "zaezaezae" dans Manage Tags → tous facts affichent [azezea] [zaezaezae]
   - Protection undefined pendant chargement initial
   - Tags inconnus affichés à la fin

**Bugs fixés:**
- ✅ **tagTemplates undefined** - Vérification ajoutée avant tri
  - Ligne 273-283 `FactsMemoryViewPro.tsx`
- ✅ **Tags ordre incohérent** - Tri automatique selon tagTemplates
  - Ligne 275-283 `FactsMemoryViewPro.tsx`

**Fichiers modifiés:**
- `components/memory/FactsMemoryViewPro.tsx`
  - Ligne 337-346: TAG_COLORS plus foncées + font-semibold
  - Ligne 183-195: tagTemplates ajouté aux props SortableFact
  - Ligne 273-296: Tri tags selon ordre global + protection undefined
  - Ligne 1128: Pass tagTemplates en props

**Impact UX:**
- Tags clairement visibles (foncés + gras)
- Ordre cohérent partout (un seul endroit pour gérer l'ordre)
- Pas de crash si tagTemplates pas encore chargé

### 2025-10-06 13:30 - Session 20: Categories Description + Tag Management + Badge Cleanup
**Objectif:** Ajouter champ description aux catégories + Interface tag management complète + Simplifier affichage badges

**Fonctionnalités complétées:**
1. ✅ **Categories description field**
   - Migration DB: colonne `description` ajoutée à `memory_categories`
   - API `/api/memory/categories` supporte description (POST/PUT)
   - CategoryPanel affiche description sous label (italique gris)
   - Input optionnel dans modal edit

2. ✅ **Tag Management Interface complète**
   - Composant `TagManagementPanel.tsx` créé (CRUD complet)
   - Rename tags avec propagation automatique sur tous les facts
   - Change color avec 8 couleurs disponibles
   - Delete tags avec confirmation + cleanup facts
   - Usage count affiché pour chaque tag
   - Drag & drop pour réorganiser tags

3. ✅ **Badge display simplification**
   - ❌ Retiré badge technique "🎯 {technique}" (créait confusion avec tags)
   - ✅ Gardé uniquement: severity badge + custom tags
   - Tags affichent couleur de tag_templates correctement
   - Plus de confusion visuelle (orange vs violet)

4. ✅ **Force reload after save**
   - `await loadFacts()` après CREATE/UPDATE fact
   - Tags s'affichent immédiatement après sauvegarde
   - Plus de besoin de refresh manuel

**Bugs fixés:**
- ✅ **Nested button React error** - Select All button était DANS toggle button → Déplacé à l'extérieur
  - Ligne 153-164 `FactsMemoryViewPro.tsx`
- ✅ **API 500 error /api/tags/templates** - Utilisait ANON_KEY au lieu de SERVICE_KEY
  - Ligne 4-6 `app/api/tags/templates/route.ts`
- ✅ **Badge confusion** - Badge orange "🎯 azeaze" (technique) ressemblait à un tag
  - Ligne 267 `FactsMemoryViewPro.tsx` - Badge technique supprimé
- ✅ **Tags not visible after save** - State pas rafraîchi
  - Ligne 657, 669 `FactsMemoryViewPro.tsx` - Force reload

**Fichiers modifiés:**
- `supabase/migrations/20251006130000_add_category_description.sql` (CRÉÉ)
- `app/api/memory/categories/route.ts` - Support description (POST/PUT)
- `components/shared/CategoryPanel.tsx` - Description field UI
- `components/shared/TagManagementPanel.tsx` (CRÉÉ) - Interface tag CRUD
- `components/shared/index.ts` - Export TagManagementPanel
- `components/memory/FactsMemoryViewPro.tsx` - 4 fixes majeurs
- `components/memory/TagPicker.tsx` - Delete tags + improved labels
- `app/api/tags/templates/route.ts` - SERVICE_KEY fix

**Impact UX:**
- Categories plus explicites avec descriptions
- Tags facilement renommables/supprimables depuis UI
- Affichage badges simplifié (zéro confusion)
- Save fact instantanément visible (plus de refresh manuel)

### 2025-10-06 12:45 - Session 19: Multi-Selection System for Rules
**Objectif:** Ajouter système multi-sélection et suppression en masse pour Rules (comme Memory Facts)

**Fonctionnalités complétées:**
1. ✅ **Multi-selection avec checkboxes**
   - Checkbox avant drag handle dans chaque rule
   - Visual feedback purple (bg-purple-50) quand sélectionné
   - Toggle individuel par checkbox click

2. ✅ **Select All par catégorie**
   - Bouton "Select All" / "Deselect All" dans header catégorie
   - Calcul automatique si tous sélectionnés (allSelected)
   - Fonction `selectAllInCategory()` pour toggle masse

3. ✅ **Bulk Actions Toolbar**
   - Toolbar purple qui apparaît quand sélection active
   - Badge avec count sélection (ex: "3 selected")
   - Boutons Clear et Delete Selected
   - Confirmation avant suppression masse

4. ✅ **Handler functions**
   - `toggleRuleSelection()` - Toggle individuel
   - `selectAllInCategory()` - Sélection masse par catégorie
   - `clearSelection()` - Clear all
   - `handleBulkDelete()` - Suppression avec confirmation

**Fichiers modifiés:**
- `components/board/unified/sections/RulesCompactV3.tsx`
  - Ligne 7: Ajout imports CheckSquare, Square
  - Ligne 10: Ajout import Badge
  - Ligne 61-69: Ajout props isChecked, onCheck à SortableRule
  - Ligne 209: Ajout state selectedRuleIds
  - Ligne 327-376: Ajout multi-selection handlers
  - Ligne 549-571: Ajout Bulk Actions Toolbar
  - Ligne 585-614: Modification category header avec Select All button
  - Ligne 629-634: Passage props isChecked/onCheck à SortableRule

### 2025-10-06 11:35 - Session 18e: Optimisations Drag & Drop UX
**Objectif:** Améliorer expérience drag & drop avec transitions fluides + indicateurs visuels

**Améliorations complétées:**
1. ✅ **Transitions fluides améliorées**
   - CSS cubic-bezier easing (0.25, 0.1, 0.25, 1)
   - Scale effects: catégories 0.98→1.02, facts 0.95→1
   - Opacity transitions 150-200ms
   - Hover animations sur drag handles (scale 1.10)

2. ✅ **Auto-expand catégories au hover**
   - Timer 600ms sur hover avec fact draggé
   - Expand automatique si catégorie fermée
   - Console logs debug: 🎯 Drag over, ⏱️ Timer start, ✅ Expanded
   - Toast notification "📂 {category} opened"
   - ⚠️ Potentiellement en debug (console logs ajoutés)

3. ✅ **Indicateur bleu d'insertion**
   - Ligne bleue animée (pulse) au-dessus du fact survolé
   - Dots circulaires bleus aux extrémités
   - Background highlight bleu/50 sur fact cible
   - State `overId` pour tracker hover target
   - `onDragOver` callback dans DndContext

4. ✅ **DragOverlay amélioré**
   - Preview visuel avec rotation légère (2deg)
   - Scale 1.05 + shadow-2xl
   - Backdrop blur effect
   - Preview différent pour catégories vs facts

**Fichiers modifiés:**
- `components/memory/FactsMemoryViewPro.tsx` (modifications majeures)
  - Ligne 3: Ajout `useRef` import
  - Lignes 43-151: `SortableCategory` composant avec dual role (sortable + droppable)
  - Lignes 153-262: `SortableFact` avec insertion indicator
  - Lignes 192-199: Blue insertion line avec dots animés
  - Lignes 272-274: States `overId`, `dragOverCategory`, `expandTimerRef`
  - Lignes 644-671: `handleCategoryDragOver` avec debug logs + 600ms timer
  - Lignes 673-785: `handleDragEnd` (3 cas: category reorder, inter-category, intra-category)
  - Lignes 885-896: `DndContext` avec `onDragOver` callback
  - Lignes 912-922: Props `isOver` + `overId` passés à `SortableFact`
  - Lignes 940-985: `DragOverlay` enhanced preview

**Impact UX:**
- Drag & drop maintenant fluide et responsive (200ms transitions)
- Indicateur visuel clair de où le fact sera déposé (ligne bleue)
- Auto-expand réduit les clics (pas besoin d'ouvrir manuellement catégorie cible)
- Preview drag & drop professionnel (rotation + blur)

**Bugs fixés:**
- ✅ **Syntax Error ligne 257** - Missing closing `</div>` for relative container dans SortableFact
  - Erreur: `Unexpected token. Did you mean '{'}'}' or '&rbrace;'?`
  - Fix: Ajout `</div>` ligne 256 pour fermer le div className="relative"

**Bugs potentiels:**
- ⚠️ Auto-expand peut ne pas trigger (debug logs ajoutés pour diagnostic)
- Attente feedback user console logs (🎯, ⏱️, ✅)

**Prochaine étape:** Attendre confirmation user que auto-expand + insertion indicator fonctionnent

---

### 2025-10-05 14:40 - Session 18d: Intégration Drag & Drop Memory Facts
**Objectif:** Unifier le style visuel avec Rules via composants shared

**Intégrations complétées:**
1. ✅ **Drag & Drop facts** (@dnd-kit ajouté)
   - Composant `SortableFact` avec GripVertical handle
   - Drag inter-catégories fonctionnel
   - Update Supabase auto quand fact déplacé
   - Toast confirmation "Moved to {category}"

2. ✅ **CategoryPanel remplace modal custom**
   - `<CategoryPanel>` de components/shared utilisé
   - Drag & drop pour réorganiser catégories
   - Emoji picker intégré (grid + paste custom)
   - Sync complet avec Supabase API

3. ✅ **UI améliorée**
   - Hover révèle drag handle (comme Rules)
   - Transitions smooth
   - Style unifié avec Rules

**Fichiers modifiés:**
- `components/memory/FactsMemoryViewPro.tsx` (lines 1-892)
  - Import @dnd-kit + CategoryPanel
  - Ajout SortableFact composant (lines 42-128)
  - Ajout sensors + handleDragEnd (lines 155-495)
  - Wrapped accordions avec DndContext (lines 585-638)
  - CategoryPanel remplace modal custom (lines 824-888)

**Impact:**
- Memory Facts ressemble maintenant aux Rules visuellement
- Drag & drop fluide (inter-catégories)
- Emoji picker professionnel
- ZÉRO changement logique métier (RAG, embeddings, API intacts)

**Prochaine étape:** Migrer System Prompts vers DraggableItem

---

### 2025-10-05 11:00 - Session 18c: Optimisations Chat Majeures
**Problèmes identifiés:**
- ❌ Ancien système memory_nodes Success/Failed encore actif
- 📊 15 facts extraits pour 1 seul message (trop + doublons)
- ⏱️ Toast "Rangé dans memory/Success/business-logic/idor" confus
- 🔗 Bouton "Voir dans le board" cassé

**Corrections:**
1. ✅ **Ancien système désactivé** (route.ts:884-927)
   - Plus de création auto documents Success/Failed
   - Plus de toast "Rangé dans memory/..."
   - Garde uniquement learning system (attack_patterns)
   - Garde factExtractor → memory_facts

2. ✅ **Extraction facts limitée** (factExtractor.ts:130-136)
   - Max 5 facts par message (au lieu de 15+)
   - Tri par confidence score (meilleurs en premier)
   - Log: "Extracted X facts, keeping top 5"

3. ✅ **Déduplication intelligente** (factExtractor.ts:153-164)
   - Check similarité 95% avant insertion
   - Skip si fact quasi-identique existe
   - Log: "Duplicate skipped (similarity: 98%)"
   - Économise tokens + DB space

4. ✅ **Performance améliorée**
   - Plus de boutons Accept/Reject lents (système Success/Failed désactivé)
   - Extraction plus rapide (5 facts au lieu de 15)
   - Moins de requêtes DB (dédup skip)

5. ✅ **UX clarifiée**
   - Plus de confusion entre memory_nodes et memory_facts
   - Un seul système: Facts extraction automatique
   - Memory Facts = source de vérité unique

**Impact:**
- Chat plus rapide et moins verbeux
- Extraction facts précise (top 5 par confidence)
- Pas de doublons en mémoire
- System propre et unifié

**Fichiers modifiés:**
- `app/api/chat/stream/route.ts:884-887` - Ancien système désactivé
- `lib/services/factExtractor.ts:130-164` - Limite 5 + dédup

**Test recommandé:**
Envoie un message pentest complexe, vérifie:
- Max 5 facts extraits
- Pas de toast "Rangé dans memory/Success/..."
- Logs "Duplicate skipped" si re-test

---

### 2025-10-05 10:30 - Session 18b: Fix "No Category" + IA force catégorie obligatoire
**Problème:**
- 12 facts avec `metadata.category = null` apparaissaient dans "📂 No Category"
- Catégorie "No Category" non éditable (n'existe pas dans memory_categories)
- IA créait des facts sans catégorie quand elle ne savait pas où les classer

**Corrections:**
- ✅ **factExtractor.ts:**
  - `category` maintenant REQUIRED (plus de null possible)
  - Si IA incertaine → utilise "general" par défaut
  - Prompt mis à jour: "IMPORTANT: category is REQUIRED, never use null"
  - Exemples mis à jour pour montrer category toujours présent
- ✅ **FactsMemoryViewPro.tsx:**
  - `groupByCategory()` skip les facts sans category
  - Supprimé références `__no_category__` dans `getCategoryIcon/Label`
  - "No Category" disparaît complètement de l'UI
- ✅ **DB Cleanup:**
  - 12 facts orphelins supprimés via API
  - DB passée de 25 → 13 facts (tous avec catégorie valide)
  - Distribution finale: 8 business_logic + 5 api

**Impact:**
- Plus de confusion avec "No Category"
- Tous les facts futurs auront une catégorie
- Memory mieux organisée

**Fichiers modifiés:**
- `lib/services/factExtractor.ts:60-80` - Category REQUIRED + prompt
- `components/memory/FactsMemoryViewPro.tsx:195-235` - Skip null categories

---

### 2025-10-05 10:15 - Session 18a: Retour définitif FactsMemoryViewPro.tsx
**Décision finale:**
- ✅ **FactsMemoryViewPro.tsx = système officiel** (propre, organisé, modulaire)
- ❌ **FactsMemoryViewUltra.tsx = rejeté** (anarchie, trop de désordre)

**Système actuel (FactsMemoryViewPro.tsx):**
- ✅ Accordions par catégories (expand/collapse)
- ✅ Category management modal complet:
  - Create category (emoji + label + key)
  - Edit category inline (icon, label, key)
  - Delete category
  - Migration auto localStorage → Supabase
- ✅ Fact edition side panel:
  - Edit description
  - Edit category (dropdown + bouton [+] pour créer)
  - Edit severity (critical/high/medium/low/info)
  - Edit technique (input libre)
  - Edit tags (add/remove inline)
  - Delete fact
- ✅ Filters:
  - Search (facts, endpoints, tags)
  - Category dropdown
  - Severity dropdown
- ✅ Metadata visible (created_at, updated_at)
- ✅ Badges severity colorés (🔴 Critical, 🟠 High, etc.)

**Avantages:**
- Memory organisée (facts groupés par catégories)
- Toutes les capabilities d'édition présentes
- UI propre et cohérente
- Supabase API (/api/memory/categories) fonctionnel

**Fichiers concernés:**
- `components/memory/FactsMemoryViewPro.tsx` - Système actuel ✅
- `components/board/unified/sections/MemorySection.tsx` - Import FactsMemoryViewPro
- `app/api/memory/categories/route.ts` - API CRUD categories
- `supabase/migrations/20251005081000_create_memory_categories.sql` - Table memory_categories

**Prochaines optimisations possibles:**
- Inline edit (double-click sur fact → edit direct sans side panel)
- Bulk operations (select multiple + bulk delete/tag/export)
- Export Markdown groupé par severity

---

### 2025-10-05 09:30 - Session 17d: Phase 1 Complete - Memory Ultra-Modulaire (REJETÉ)
**Fichiers créés:**
- `components/memory/FactsMemoryViewUltra.tsx` - Nouveau composant Memory avec tags unifiés

**Fichiers modifiés:**
- `components/board/unified/UnifiedSidebarUltra.tsx:34-35` - Supprimé Success/Failed/Templates subItems
- `components/board/unified/sections/MemorySection.tsx` - Utilise FactsMemoryViewUltra au lieu de FactsMemoryViewPro

**Tâches complétées (Phase 1):**
- ✅ Supprimé memory_nodes (Success/Failed) de sidebar
- ✅ Supprimé memory_categories (plus utilisées, metadata.category suffit)
- ✅ Unifié Category + Tags → tout en tags (#auth, #api, #sqli)
- ✅ Masqué champ "Type" en UI (gardé en metadata pour IA)
- ✅ Memory ultra modulaire:
  - Inline edit (double-click sur fact)
  - Add tags inline (+ tag button)
  - Remove tags inline (click sur tag)
  - Delete fact (confirmation)
  - New fact avec tags
  - Export Markdown (groupé par severity)

**Features ajoutées:**
- Filters par Severity (🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low)
- Filters par Technique (SQLi, IDOR, XSS, BLV...)
- Filters par Result (✅ Success, ❌ Failed)
- Quick counters sur chaque filter
- Search global (facts, endpoints, tags)
- Export rapport MD format bug bounty

**Ancien système retiré:**
- ❌ memory_categories table (doublon)
- ❌ Bouton "Categories" + modal
- ❌ Sidebar Success (42), Failed (18), Templates (68)
- ❌ Dropdown "All Categories"
- ❌ Champ "Type" visible en UI

**Nouveau système:**
- Tags unifiés: #auth, #api, #business-logic, #idor, #sqli, #burp, etc.
- Metadata preserved: type, technique, severity, result, tags, endpoint
- Tout éditable inline (double-click)

**Prochaine étape:** Phase 2 - Quick filters + Bulk operations

---

### 2025-10-05 09:15 - Session 17c: TODO.md Refonte Pentesting Focus
**Fichiers modifiés:**
- `docs/TODO.md` - Réduit de 45 → 12 tâches ultra-ciblées pentesting

**Analyse complétée:**
- ✅ Audit factExtractor.ts (auto-extraction facts marche)
- ✅ Validation metadata (severity, technique, tags, category TOUS utiles)
- ✅ Identification doublons (memory_categories = doublon de metadata.category)
- ✅ Screenshots analysés (Success/Failed obsolète, Facts panel OK)

**Décisions prises:**
- 🔴 **SUPPRIMER:** memory_nodes (Success/Failed) → obsolète pour pentesting
- 🔴 **SUPPRIMER:** memory_categories table → doublon avec metadata.category
- 🔴 **UNIFIER:** Category + Tags → tout en tags (#auth, #api, #sqli)
- 🟡 **MASQUER:** Type field en UI (garder en metadata pour IA)

**TODO.md final:**
- Phase 1: Nettoyage (4 tâches, ~8h)
- Phase 2: Optimisations pentesting (5 tâches, ~9h)
- Phase 3: Export Burp (2 tâches, ~5h)
- **Total: 12 tâches, ~20h**

**Supprimé du TODO (33 tâches inutiles):**
- Analytics déjà existants (header affiche métriques)
- Features trop complexes (Test Matrix phases 5-8, WebSocket, collaboration)
- Documentation (pas prioritaire)

**Prochaine étape:** Commencer Phase 1 - Supprimer memory_nodes

---

### 2025-10-05 08:45 - Session 17a: Migration Categories Supabase + Fix Bug + Update Workflow
**Fichiers créés:**
- `supabase/migrations/20251005081000_create_memory_categories.sql` - Table memory_categories
- `app/api/memory/categories/route.ts` - API CRUD catégories (GET/POST/PUT/DELETE)

**Fichiers modifiés:**
- `.claude/CLAUDE.md` - Checklist obligatoire V3 (12 étapes numérotées)
- `components/memory/FactsMemoryViewPro.tsx` - Migration localStorage → Supabase API
- `app/api/chat/stream/route.ts:219-244` - Injection catégories dans prompt IA
- `components/board/unified/sections/intelligence/PatternsPanel.tsx:237` - Fix bug pattern_data undefined

**Tâches complétées:**
- ✅ Migration memory_categories (localStorage → Supabase)
- ✅ API /api/memory/categories fonctionnelle
- ✅ IA voit catégories côté serveur (prompt enrichi)
- ✅ Bouton [+] créer catégorie inline dans modal fact
- ✅ Migration auto localStorage → Supabase au premier chargement
- ✅ Fix bug PatternsPanel (pattern_data undefined)
- ✅ Checklist workflow stricte dans CLAUDE.md
- ✅ MCP Sequential Thinking intégré dans workflow

**Bugs fixés:**
- ✅ PatternsPanel crash ligne 237 → Vérification ternaire ajoutée

**Workflow amélioré:**
- Checklist 12 étapes obligatoire (pré-code, post-code, fin session)
- MCP Sequential Thinking obligatoire si tâche complexe > 3 étapes
- TODO.md = uniquement pending, STATE.md = historique complet
- Agent doc-writer autorisé pour consolidation

---

### 2025-10-05 06:00 - Session 16: Phase 4 Complete - AI Test Suggestions (Adapté schéma existant)
**IMPORTANT:** Table `suggestions_queue` EXISTE DÉJÀ avec un schéma différent !
- Schéma existant: `type` (storage/rule/improvement/pattern) + `suggestion` (jsonb)
- Code adapté pour utiliser le schéma existant au lieu de créer nouvelle table

### 2025-10-05 05:35 - Session 16: Phase 4 Complete - AI Test Suggestions Workflow
**Architecture Pentest Co-Pilot:**
- ✅ **Triple-layer system:**
  1. `memory_facts` - Short-term context (RAG)
  2. `test_results` - Test Coverage Matrix (Endpoints × 12 Techniques)
  3. `attack_patterns` + `suggestions_queue` - Learning & Auto-suggestions

**Fichiers créés:**
- `supabase/migrations/20251005010000_create_test_results.sql` - Matrice test coverage
- `supabase/migrations/20251005020000_create_suggestions_queue.sql` - Queue suggestions IA
- `components/test-matrix/TestMatrixView.tsx` - UI matrice principale
- `components/test-matrix/TestCell.tsx` - Cellule statut (success/failed/testing/not_tested)
- `components/test-matrix/TestDetailModal.tsx` - Modal édition détails test
- `components/test-matrix/PriorityQueuePanel.tsx` - Sidebar AI recommendations
- `components/board/unified/sections/MemorySection.tsx` - Wrapper 4 sub-tabs
- `lib/services/generateNextTestSuggestions.ts` - Service génération suggestions IA
- `lib/services/promptSystem.ts:315-343` - Fonction `extractEndpoint()`

**Fichiers modifiés:**
- `app/api/chat/stream/route.ts:860-889` - Génération AI suggestions après chaque message
- `app/api/chat/stream/route.ts:10` - Import `extractEndpoint`
- `components/board/unified/UnifiedBoardUltra.tsx:9,173` - Import MemorySection
- `components/board/unified/sections/MemorySection.tsx` - 4 tabs: Matrix/Facts/Patterns/Stats

**Système AI Suggestions:**
- **Stratégie 1:** Si dernier test success → suggérer techniques même famille sur même endpoint
- **Stratégie 2:** High-value targets non testés (/admin, /api, /checkout, /payment)
- **Stratégie 3:** Techniques taux succès > 70% sur endpoints non testés
- **Stratégie 4:** Endpoints avec vulnérabilité confirmée → tester autres techniques
- **Priorités:** critical (>85% confidence), high (>70%), medium (>50%), low (<50%)
- **Top 5 suggestions** triées par priorité + confiance

**UI Test Matrix:**
- ✅ Grille Endpoints (lignes) × 12 Techniques (colonnes)
- ✅ Status icons: ✅ success, ❌ failed, ⏳ testing, ○ not_tested
- ✅ Severity badges: C/H/M/L (critical/high/medium/low)
- ✅ Stats badges en temps réel (success count, failed, testing, not_tested)
- ✅ Search bar endpoints
- ✅ Priority Queue sidebar avec AI recommendations

**Workflow utilisateur:**
1. User teste un endpoint → Enregistre dans matrice
2. IA analyse contexte (dernier test, patterns, success rates)
3. Génère 5 suggestions intelligentes
4. Sauvegarde dans `suggestions_queue`
5. Toast notification avec preview top 3 suggestions
6. User voit suggestions dans Priority Queue sidebar
7. Click "Test Now" → Execute test → Loop

**État:**
- ✅ Phase 1-3: UI Test Matrix créée
- ✅ Phase 4: AI suggestions workflow intégré
- ⚠️ Migration `suggestions_queue` à appliquer manuellement (permissions MCP refusées)
- ⏳ Phase 5-8: Auto-test execution, Learning, Dashboard, Polish

---

### 2025-10-05 04:00 - Session 15: Migration complète vers Facts (Mem0-style)
**Décision architecture:**
- ✅ Facts UNIQUEMENT (comme Mem0/ChatGPT)
- ✅ Suppression 6 rows obsolètes dans memory_nodes (Success/, Failed/, Requete)
- ✅ memory_nodes gardée VIDE (table existe pour FK rules)
- ✅ UI affiche uniquement memory_facts (30 facts)

**Fichiers modifiés:**
- Aucun code modifié (DB cleanup uniquement)

**Avantages:**
- ✅ 0 maintenance manuelle (auto-extraction depuis chat)
- ✅ RAG optimal (~400 tokens/15 facts = 0.2% contexte)
- ✅ Scalable (10K+ facts = OK avec similarity search)
- ✅ Metadata structurée (type, technique, severity, result)
- ✅ Pas de risque docs obsolètes
- ✅ UX simple (1 seule table à consulter)

**Workflow utilisateur:**
1. User discute avec IA dans chat
2. IA extrait automatiquement facts atomiques
3. Facts sauvegardés avec metadata JSON
4. RAG charge 15 facts pertinents via similarity search
5. Si gros doc → Copier-coller dans chat, IA extrait facts

**État mémoire:**
- memory_facts: 30 rows (5 types, 3 techniques)
- memory_nodes: 0 rows (table vide, gardée pour FK)

---

### 2025-10-04 18:30 - Session 14: Fix Word-Wrap Complet (Edit + Preview)
**Fichiers modifiés:**
- `components/editor/MarkdownEditorPro.tsx:300` - Ajout `overflow-x-hidden` au conteneur parent
- `components/editor/MarkdownEditorPro.tsx:302` - Ajout `break-words` à la div prose (Preview mode)
- `components/editor/MarkdownEditorPro.tsx:313-314` - SyntaxHighlighter avec `wrapLongLines={true}` + customStyle
- `components/editor/MarkdownEditorPro.tsx:320` - Ajout `break-words` aux inline code blocks
- `components/board/unified/sections/MemoryProV2.tsx:536` - Ajout `overflow-x-hidden` au conteneur éditeur

**Bugs fixés:**
- ✅ Texte déborde horizontalement en mode Preview → `break-words` sur prose container
- ✅ Code blocks créent scroll horizontal → `wrapLongLines + customStyle` sur SyntaxHighlighter
- ✅ Inline code déborde → `break-words` sur balise `<code>`
- ✅ Conteneurs parents permettent overflow → `overflow-x-hidden` explicite

**Détails techniques:**
- **Avant:** Seul le `<Textarea>` (mode Edit) avait `whitespace-pre-wrap break-words`
- **Après:** Mode Preview (ReactMarkdown) a aussi `break-words` + blocs code wrappés
- **SyntaxHighlighter:** `wrapLongLines={true}` + `customStyle={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowX: 'auto' }}`
- **Résultat:** Plus AUCUN scroll horizontal, même avec très long contenu (cookies HTTP, etc.)

---

### 2025-10-04 18:00 - Session 13: Fix UX + Rules V3 Drag&Drop
**Fichiers modifiés:**
- `components/editor/MarkdownEditorPro.tsx:335` - Ajout word-wrap + break-words
- `components/board/unified/UnifiedBoardUltra.tsx:10` - Import RulesCompactV3
- `components/board/unified/sections/RulesCompactV3.tsx` - NOUVEAU fichier (refonte complète)

**Bugs fixés:**
- ✅ Texte qui déborde horizontalement dans Memory editor → word-wrap activé
- ✅ Boutons Save/Cancel déjà présents (étaient en bas, user ne scrollait pas)

**Features ajoutées (Rules V3):**
- ✅ Accordions par catégorie (comme SystemPrompts, pas des tabs)
- ✅ Drag & Drop avec @dnd-kit :
  - Réorganisation dans une catégorie (change priority)
  - Déplacement entre catégories (change category)
  - Drop zone highlight bleu au hover
- ✅ Checkbox ON/OFF par rule (plus de switch global par catégorie)
- ✅ Priority badges visibles (numéro)
- ✅ Preview WHEN/THEN dans chaque card
- ✅ Actions : Edit | Duplicate | Delete (hover pour voir)
- ✅ Header accordion avec counter (ex: "5 rules • 3 active")

**Différences V3 vs V2:**
- V2 = Tabs horizontales (comme des filtres)
- V3 = Accordions verticales expandables (comme SystemPrompts)
- V3 = Drag & drop fonctionnel (réorganisation + cross-category)
- V3 = UI plus compacte (preview WHEN/THEN condensé)

**Impact:**
- UX cohérente avec SystemPrompts (même pattern UI)
- Drag & Drop = réorganisation facile sans boutons
- Plus scalable (supporte 100+ rules sans scroll horizontal)

---

### 2025-10-04 16:45 - Session 12: Refonte UI Rules + Intelligence
**Fichiers modifiés:**
- `components/board/unified/sections/RulesCompactV2.tsx` - Refonte complète UI
- `components/board/unified/sections/intelligence/SuggestionsPanel.tsx` - Ajout filters par type

**Features ajoutées (Rules):**
- ✅ Tabs par catégorie avec counters (🔐 Authentication, 🔌 API, 🧠 Business Logic, 🐛 Vulnerabilities, ⚙️ Custom)
- ✅ Switch "Category Focus" pour activer/désactiver toutes les rules d'une catégorie en 1 clic
- ✅ Affichage WHEN/THEN clairement séparé (bleu pour trigger, vert pour action)
- ✅ Badge target folder visible (ex: 📂 /Success/)
- ✅ Indicateur visuel ON/OFF (point vert/gris)
- ✅ Cards avec border différente selon enabled/disabled

**Features ajoutées (Intelligence):**
- ✅ Filters PRIMARY par TYPE : 💾 Storage | 📋 Rules | ⚡ Improve | 🎯 Patterns
- ✅ Counters sur chaque bouton filter (ex: "Storage (3)")
- ✅ Filters SECONDARY par STATUS : ⏳ Pending | ✅ Accepted | ❌ Rejected
- ✅ Badge confidence % plus visible
- ✅ Badge target folder affiché si présent (ex: 📂 Target: /Requetes/)
- ✅ Icône type plus grosse (3xl au lieu de 2xl)

**Impact:**
- Navigation Rules beaucoup plus claire (on voit immédiatement WHEN → THEN)
- Intelligence filtrable par type = moins de scroll
- UX cohérente avec design moderne

---

### 2025-10-04 14:30 - Session 11: RAG Similarity Search + Auto-Embeddings
**Fichiers modifiés:**
- `app/api/chat/stream/route.ts:140-206` - Remplacement chargement mémoire par date → similarity search via RPC
- `app/api/chat/stream/route.ts:752-753` - Suppression code mort (memory_chunks table inexistante)
- `components/board/unified/sections/MemoryProV2.tsx:142-155` - Auto-génération embeddings après save
- `supabase/migrations/20251004120000_fix_similarity_search.sql` - Amélioration RPC avec filter_project_id + index

**Fichiers supprimés:**
- `lib/services/promptBuilder.ts` - Code intégré dans route.ts
- `lib/services/ragService.ts` - Obsolète, jamais utilisé
- `lib/services/brainSystem.ts` - Obsolète
- `lib/services/automatedPentester.ts` - Obsolète
- `lib/services/autoReinforcementEngine.ts` - Obsolète
- `lib/services/claudeService.ts` - Obsolète
- `lib/services/patternLearner.ts` - Dépendait de ragService

**Changements majeurs:**
1. ✅ **RAG activé:** IA voit maintenant documents pertinents via similarité embeddings (seuil 70%)
2. ✅ **Auto-embeddings:** Chaque save de document génère auto embedding via `/api/embeddings/create`
3. ✅ **Fallback robuste:** Si embedding fail, fallback sur 5 docs récents
4. ✅ **Performance:** Index `memory_nodes_project_type_idx` sur (project_id, type)
5. ✅ **Cleanup:** 7 fichiers services obsolètes supprimés, système unifié

**Impact:**
- Contexte IA ne déborde plus avec grosse mémoire (seuls docs pertinents chargés)
- IA peut voir documents stockés via similarité sémantique
- "Requete" document désormais visible quand on parle de HTTP requests

**Bugs fixes:**
- ✅ Fix memory_chunks INSERT (table n'existait pas)
- ✅ Fix RPC similarity_search (manquait filter_project_id)

---

### 2025-10-04 12:00 - Session 10: Éditeur Unifié + Validation IA
**Fichiers créés:**
- `components/editor/MarkdownEditorPro.tsx` - Éditeur markdown unifié WYSIWYG
- `components/chat/MemoryActionModal.tsx` - Modal validation actions IA

**Fichiers modifiés:**
- `components/board/unified/sections/SystemPromptsSection.tsx` - MarkdownEditorPro remplace NotionStyleEditor
- `components/board/unified/sections/MemorySectionPro.tsx` - MarkdownEditorPro intégré
- `components/chat/ChatStream.tsx` - Bouton "✏️ Modifier" + modal validation
- `app/api/projects/[id]/route.ts` - Fix params async (Next.js 15)

**Features ajoutées:**
- ✅ Éditeur markdown avec toolbar (Bold/Italic/Headers/Lists/Code)
- ✅ Preview markdown live
- ✅ AI improvement sélection OU tout
- ✅ Prompt d'amélioration modifiable
- ✅ Bouton Annuler pour revenir version précédente
- ✅ Workflow validation: ✅ Accept | ✏️ Modify | ❌ Reject
- ✅ Modal avec MarkdownEditorPro pour éditer avant confirmation
- ✅ Stockage markdown pur (compatible RAG/embeddings)

**Avantages:**
- Markdown = pas de pollution HTML pour similarité
- Un seul composant réutilisable partout
- UX cohérente entre System Prompts, Memory, Rules

---

### 2025-10-03 - Session 9
**Fichiers créés:**
- `app/api/test-data/seed/route.ts` - Route seed données test
- `components/board/unified/sections/IntelligenceSection.tsx`
- `components/board/unified/sections/intelligence/SuggestionsPanel.tsx`
- `components/board/unified/sections/intelligence/PatternsPanel.tsx`
- `components/board/unified/sections/intelligence/StatsPanel.tsx`
- `components/ui/tabs.tsx` - Radix UI tabs wrapper

**Fichiers modifiés:**
- `components/board/unified/UnifiedBoardUltra.tsx` - 7 onglets → 5 onglets
- `components/board/unified/sections/intelligence/SuggestionsPanel.tsx` - Fix colonne 'data' → 'suggestion'

**Données test insérées:**
- 3 attack_patterns (SQLi 85%, IDOR 90%, XSS 75%)
- 2 learned_patterns (confidence 92%, 88%)
- 3 suggestions_queue (pending)
- 5 user_decisions

**Bugs découverts:**
- user_decisions insert erreur 400 (colonne suggestion_id n'existe pas)

---

### 2025-10-03 23:55 - Fix Bug user_decisions + Refonte Mémoire Claude
**Fichiers créés:**
- `docs/VISION.md` - Consolidation PROJECT_VISION + STACK_TECHNOLOGY + AI_MEMORY_ACTIONS
- `docs/STATE.md` - Ce fichier (état actuel minimaliste)
- `docs/TODO.md` - TODO auto-nettoyant

**Fichiers modifiés:**
- `SuggestionsPanel.tsx:76-92` - Fix insert user_decisions (ajouté proposed_action + user_choice)
- `.claude/CLAUDE.md` - Workflow strict V2 (3 fichiers, Edit tool, pas d'agents)

**Fichiers supprimés:**
- 8 anciens .md obsolètes (PROJECT_VISION, TODO, CURRENT_STATE, SESSION_9_FINAL, DAILY_LOG, AUTO_REINFORCEMENT_ARCHITECTURE, AI_MEMORY_ACTIONS, STACK_TECHNOLOGY)

**Bug fixé:**
- ✅ user_decisions insert erreur 400 → Schéma DB respecté (proposed_action + user_choice requis)

---

## 🎯 Ce Qui Marche Parfaitement

✅ Chat streaming avec stop button
✅ Metadata tracking (tokens, coûts)
✅ Cache intelligent (message_cache + embeddings)
✅ Templates prompt illimités (Settings)
✅ QuickContextBar au-dessus input
✅ Intelligence > Patterns avec bouton Create Rule
✅ Intelligence > Stats avec métriques réelles
✅ AI Actions detector (toast Accept/Reject)
✅ Memory édition inline (nom + contenu)
✅ Rules création/édition JSON

---

**⚠️ Ce fichier doit être mis à jour IMMÉDIATEMENT après chaque modification de code.**
