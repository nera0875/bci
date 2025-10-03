# Auto-Reinforcement Architecture

**Système d'auto-amélioration par apprentissage des décisions utilisateur**

---

## Vue d'ensemble

Le système apprend automatiquement des décisions de l'utilisateur pour optimiser ses règles et patterns sans intervention manuelle. Pipeline: **Décisions User → Pattern Detection → Rule Generation → Auto-optimization**.

### Objectif
Réduire progressivement l'effort utilisateur en automatisant la création et l'optimisation des règles basées sur l'historique des interactions.

---

## Architecture Globale

```
┌─────────────────┐
│   User Action   │ (accept/reject/modify suggestion)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Decision Track  │ → user_decisions table
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Pattern Learner │ → learned_patterns table
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Rule Generator  │ → implicit_rules table
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auto-Optimizer  │ → rules table (updated)
└─────────────────┘
```

---

## Tables Supabase

### 1. user_decisions
**Tracking de toutes les décisions utilisateur**

```sql
CREATE TABLE user_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  decision_type TEXT NOT NULL, -- 'accept', 'reject', 'modify'
  context JSONB NOT NULL, -- { suggestion, rule_applied, message_context }
  suggestion_id UUID REFERENCES suggestions_queue(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Colonnes clés:**
- `decision_type`: accept/reject/modify
- `context`: Tout le contexte nécessaire pour comprendre la décision
- `suggestion_id`: Lien vers la suggestion originale

**Cas d'usage:**
- User clique "Accept" sur suggestion → INSERT avec decision_type='accept'
- User clique "Reject" → INSERT avec decision_type='reject'
- User modifie avant d'accepter → INSERT avec decision_type='modify' + context modifié

---

### 2. learned_patterns
**Patterns détectés automatiquement par analyse des décisions**

```sql
CREATE TABLE learned_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  pattern_type TEXT NOT NULL, -- 'frequency', 'success_rate', 'timing'
  pattern_data JSONB NOT NULL, -- { trigger, frequency, evidence: [...] }
  confidence FLOAT DEFAULT 0.0, -- 0.0 to 1.0
  evidence_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Colonnes clés:**
- `pattern_type`: Type de pattern détecté
- `pattern_data`: Données structurées du pattern
- `confidence`: Score de confiance (augmente avec evidence_count)
- `evidence_count`: Nombre de décisions supportant ce pattern

**Exemple pattern_data:**
```json
{
  "trigger": "User always accepts 'try fuzzing' suggestions",
  "frequency": 15,
  "evidence": [
    "decision_id_1",
    "decision_id_2",
    "..."
  ],
  "conditions": {
    "context_contains": "fuzzing",
    "file_extension": ".txt"
  }
}
```

---

### 3. implicit_rules
**Règles générées automatiquement à partir des patterns**

```sql
CREATE TABLE implicit_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  pattern_id UUID REFERENCES learned_patterns(id),
  rule_name TEXT NOT NULL,
  rule_condition TEXT NOT NULL, -- Natural language condition
  rule_action TEXT NOT NULL, -- Natural language action
  confidence FLOAT DEFAULT 0.0,
  auto_generated BOOLEAN DEFAULT TRUE,
  approved BOOLEAN DEFAULT FALSE, -- User has reviewed and approved
  needs_review BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_applied TIMESTAMPTZ,
  application_count INTEGER DEFAULT 0,
  success_rate FLOAT DEFAULT 0.0
);
```

**Colonnes clés:**
- `pattern_id`: Pattern source qui a généré cette règle
- `rule_condition/action`: Règle en langage naturel
- `approved`: User a validé cette règle
- `needs_review`: Flag pour UI review panel
- `success_rate`: Performance de la règle (mise à jour par optimizer)

**Exemple implicit_rule:**
```json
{
  "rule_name": "Auto-suggest fuzzing for text files",
  "rule_condition": "When user uploads .txt file AND mentions 'testing'",
  "rule_action": "Suggest: Try fuzzing with special characters",
  "confidence": 0.85,
  "approved": false,
  "needs_review": true
}
```

---

## Services

### 1. autoReinforcementEngine.ts
**Service principal orchestrant le pipeline d'apprentissage**

**Fichier:** `lib/services/autoReinforcementEngine.ts`

**Méthodes principales:**
```typescript
class AutoReinforcementEngine {
  // Track une décision user
  async trackDecision(
    userId: string,
    projectId: string,
    decisionType: 'accept' | 'reject' | 'modify',
    context: any,
    suggestionId?: string
  ): Promise<void>

  // Analyse patterns quotidienne
  async analyzePatterns(userId: string, projectId: string): Promise<Pattern[]>

  // Génère règles candidates
  async generateImplicitRules(patterns: Pattern[]): Promise<ImplicitRule[]>

  // Optimise règles existantes
  async optimizeRules(userId: string, projectId: string): Promise<void>
}
```

**Flow typique:**
1. User action → `trackDecision()`
2. Cron job quotidien → `analyzePatterns()` → `generateImplicitRules()`
3. Background job → `optimizeRules()` (archive règles inefficaces)

---

### 2. patternLearner.ts
**Détection de patterns dans les décisions user**

**Fichier:** `lib/services/patternLearner.ts`

**Algorithmes:**
- **Frequency patterns**: Détecte actions répétitives (ex: toujours accept "try fuzzing")
- **Success patterns**: Détecte règles avec high success rate
- **Timing patterns**: Détecte patterns temporels (ex: toujours reject suggestions après 18h)

**Exemple détection:**
```typescript
// Input: 20 décisions sur 7 jours
// Output: Pattern détecté
{
  type: 'frequency',
  trigger: 'User accepts fuzzing suggestions 15/15 times',
  confidence: 1.0,
  evidence_count: 15,
  conditions: { context_contains: 'fuzzing' }
}
```

---

### 3. optimizationEngine.ts
**Optimisation automatique des règles**

**Fichier:** `lib/services/optimizationEngine.ts` (déjà existant, amélioré)

**Corrections appliquées aujourd'hui:**
- **Ligne 374**: Fix `this.supabase` undefined → Utiliser `supabase` importé
- **Lignes 45-60**: Fix pattern queries `.eq('category')` → `.ilike('name', '%success%')`

**Fonctionnalités:**
- Score performance de chaque règle (success_rate, application_count)
- Archive règles avec success_rate < 30%
- Re-rank règles par pertinence
- Merge règles similaires

**Exemple optimization:**
```typescript
// Règle A: success_rate = 0.95, application_count = 100
// → Keep, boost priority

// Règle B: success_rate = 0.20, application_count = 50
// → Archive (inefficace)

// Règle C + D: Très similaires, confidence > 0.8
// → Merge en une seule règle
```

---

## UI Components

### 1. DecisionToast.tsx
**Toast avec boutons Accept/Modify/Reject après chaque suggestion IA**

**Emplacement:** `components/chat/DecisionToast.tsx` (à créer)

**Props:**
```typescript
interface DecisionToastProps {
  suggestion: string
  suggestionId: string
  onAccept: () => void
  onReject: () => void
  onModify: (modified: string) => void
}
```

**UI Mock:**
```
┌────────────────────────────────────┐
│ AI Suggestion:                     │
│ "Try fuzzing parameter X"          │
│                                    │
│ [✅ Accept] [✏️ Modify] [❌ Reject] │
└────────────────────────────────────┘
```

**Integration ChatStream.tsx:**
```typescript
// Après chaque suggestion IA
if (message.contains_suggestion) {
  showDecisionToast({
    suggestion: extracted_suggestion,
    onAccept: () => trackDecision('accept'),
    onReject: () => trackDecision('reject'),
    onModify: (mod) => trackDecision('modify', mod)
  })
}
```

---

### 2. SuggestionsReview.tsx
**Panneau pour review règles auto-générées**

**Emplacement:** `components/rules/SuggestionsReview.tsx` (à créer)

**Features:**
- Liste règles `needs_review = true`
- Affiche evidence (patterns + décisions sources)
- Boutons: Approve / Reject / Modify
- Filtres: confidence, date, type

**UI Mock:**
```
┌─────────────────────────────────────────────────┐
│ Auto-Generated Rules (3 pending review)         │
├─────────────────────────────────────────────────┤
│ Rule: "Auto-suggest fuzzing for .txt files"     │
│ Confidence: 0.85 | Evidence: 15 decisions       │
│ Pattern: User always accepts fuzzing            │
│                                                 │
│ [✅ Approve] [✏️ Modify] [❌ Reject]             │
├─────────────────────────────────────────────────┤
│ Rule: "Skip CORS checks on localhost"           │
│ Confidence: 0.72 | Evidence: 8 decisions        │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

---

### 3. LearningAnalyticsDashboard.tsx
**Dashboard analytics du système d'apprentissage**

**Emplacement:** `components/dashboard/LearningAnalytics.tsx` (backlog)

**Metrics affichées:**
- Nombre patterns détectés (7 derniers jours)
- Nombre règles auto-générées
- Success rate règles auto vs manuelles
- Timeline décisions user
- Top patterns par confidence

---

## Background Jobs

### 1. Daily Pattern Analysis (Cron)
**Analyse quotidienne des patterns**

**Déclencheur:** Cron job 02:00 AM (off-peak)

**Pipeline:**
```typescript
async function dailyPatternAnalysis() {
  // 1. Récupérer toutes décisions des 30 derniers jours
  const decisions = await getRecentDecisions(30)

  // 2. Détecter patterns
  const patterns = await patternLearner.analyze(decisions)

  // 3. Générer règles candidates si confidence > 0.7
  const rules = patterns
    .filter(p => p.confidence > 0.7)
    .map(p => generateImplicitRule(p))

  // 4. Insérer dans implicit_rules avec needs_review=true
  await insertImplicitRules(rules)

  // 5. Notifier user (email/toast)
  await notifyUser(`${rules.length} new rule suggestions`)
}
```

---

### 2. Rule Optimization (Hebdomadaire)
**Optimisation et cleanup des règles**

**Déclencheur:** Cron job dimanche 03:00 AM

**Pipeline:**
```typescript
async function weeklyRuleOptimization() {
  // 1. Calculer success_rate de chaque règle
  const rules = await getAllRules()
  for (const rule of rules) {
    const stats = await getRuleApplicationHistory(rule.id)
    rule.success_rate = stats.success / stats.total
  }

  // 2. Archiver règles inefficaces (success < 30%)
  const ineffectiveRules = rules.filter(r => r.success_rate < 0.3)
  await archiveRules(ineffectiveRules)

  // 3. Merge règles similaires
  const similarPairs = findSimilarRules(rules)
  await mergeSimilarRules(similarPairs)

  // 4. Re-rank par pertinence
  await reRankRulesByRelevance()
}
```

---

## Flow End-to-End

### Exemple concret: User apprend à l'IA "toujours fuzzer .txt files"

**Jour 1-3: Tracking décisions**
```
User upload file.txt → IA suggest "try fuzzing"
→ User clicks ✅ Accept
→ INSERT user_decisions (decision_type='accept', context={...})

(Répété 5 fois sur 3 jours)
```

**Jour 4: Pattern détecté (cron job)**
```
dailyPatternAnalysis() détecte:
- Pattern: "User accepts fuzzing for .txt 5/5 times"
- Confidence: 1.0
- INSERT learned_patterns

→ Génère règle candidate:
  rule_condition: "File extension is .txt"
  rule_action: "Suggest fuzzing"
  confidence: 1.0
  needs_review: true

→ INSERT implicit_rules
→ Notify user: "1 new rule suggestion"
```

**Jour 5: User review et approve**
```
User ouvre SuggestionsReview panel
→ Voit règle "Auto-suggest fuzzing for .txt"
→ Clicks ✅ Approve

→ UPDATE implicit_rules SET approved=true, needs_review=false
```

**Jour 6+: Règle appliquée automatiquement**
```
User upload new.txt
→ IA détecte règle approuvée
→ Applique automatiquement suggestion fuzzing
→ User n'a plus besoin de cliquer Accept

→ Success rate trackée
→ Si success_rate > 0.9 après 20 applications
  → Boost confidence à 1.0
  → Passe en règle "trusted" (auto-apply sans confirmation)
```

---

## Métriques de Succès

### KPIs Système
- **Pattern Detection Rate**: Nb patterns détectés / semaine
- **Rule Generation Rate**: Nb règles auto-générées / semaine
- **User Approval Rate**: % règles approuvées par user
- **Auto-rule Success Rate**: Success rate moyen règles auto vs manuelles

### Objectifs
- **Réduction effort user**: -50% clics Accept/Reject après 30 jours
- **Precision règles auto**: Success rate > 80%
- **Adoption rules auto**: User approuve >70% suggestions

---

## Sécurité & Privacy

### Considérations
- Toutes décisions user restent dans leur scope (RLS policies)
- Pas de partage patterns inter-users (sauf opt-in)
- User peut désactiver auto-learning (settings)
- User peut delete toutes données learning (RGPD)

### Settings User
```typescript
interface LearningSettings {
  auto_learning_enabled: boolean
  auto_apply_trusted_rules: boolean // confidence > 0.95
  pattern_detection_frequency: 'daily' | 'weekly' | 'manual'
  min_confidence_threshold: number // 0.7 default
}
```

---

## Prochaines Étapes (Priorité)

### Phase 1: Foundation UI (3-4 jours)
- [ ] Créer DecisionToast.tsx
- [ ] Intégrer dans ChatStream.tsx après suggestions
- [ ] API route `/api/decisions/track`
- [ ] Tester tracking décisions

### Phase 2: Review & Approval (2-3 jours)
- [ ] Créer SuggestionsReview.tsx
- [ ] API routes approve/reject règles
- [ ] Notifications nouvelles suggestions
- [ ] Tester flow review complet

### Phase 3: Background Intelligence (3-4 jours)
- [ ] Implémenter cron daily pattern analysis
- [ ] Implémenter cron weekly optimization
- [ ] Tester génération règles automatique
- [ ] Monitoring métriques learning

### Phase 4: Polish & Optimization (2-3 jours)
- [ ] Dashboard analytics
- [ ] Settings user learning preferences
- [ ] Performance optimization (batch processing)
- [ ] Tests end-to-end complets

---

## Conclusion

Architecture complète pour auto-amélioration basée sur reinforcement learning des décisions user. Pipeline robuste: **Décisions → Patterns → Règles → Optimization**.

**Avantage clé:** User investit temps au début (accept/reject suggestions), système apprend progressivement et automatise 70%+ des décisions après 30 jours.

**Prochaine action:** Implémenter DecisionToast.tsx pour commencer tracking décisions.
