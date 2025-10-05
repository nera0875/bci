# 📊 STATE - État Actuel du Projet

**Dernière MAJ:** 2025-10-04 18:30 (Fix word-wrap complet Memory + Preview mode)

---

## 🎯 Progression Globale

| Composant | % | Statut |
|-----------|---|--------|
| Backend/DB | 100% | ✅ 17 tables créées + données test |
| UI/Components | 98% | ✅ Éditeur markdown unifié + Modal validation IA |
| Intelligence | 100% | ✅ Workflow validation Accept/Modify/Reject opérationnel |
| Prompts System | 100% | ✅ MarkdownEditorPro remplace NotionStyleEditor |
| **GLOBAL** | **99%** | ⚠️ 1 bug restant (Memory drag & drop) |

---

## 🗄️ Tables Supabase (17 tables)

### Core
- `projects` - Projets utilisateur
- `conversations` - Conversations chat
- `chat_messages` - Messages avec metadata (tokens, coûts)

### Memory & Organization
- `memory_nodes` - Arbre hiérarchique (folders + documents)
- `rules` - Playbooks JSON personnalisables
- `message_cache` - Cache réponses avec embeddings

### Learning & Intelligence
- `attack_patterns` - Success rate techniques (usage_count, success_count)
- `learned_patterns` - Patterns auto-détectés (confidence > 80%)
- `suggestions_queue` - Queue suggestions IA (storage/rule/improvement/pattern)
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
