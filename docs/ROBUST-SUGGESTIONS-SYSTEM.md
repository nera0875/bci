# Robust Suggestions System - Complete Implementation

## 🎯 Overview

Le système de suggestions intelligentes a été complètement refactorisé pour être **robuste, contextuel et non-chaotique**. Fini le spam de 81+ suggestions non pertinentes !

## 🏗️ Architecture

### 1. **Limitation stricte: 5 pending max**

- Hard limit de 5 suggestions en attente
- System pause automatique quand 5/5 atteint
- UI affiche un warning orange avec explication
- Force l'utilisateur à valider/rejeter avant nouvelles suggestions

**Fichier:** `lib/services/optimizationEngine.ts`
```typescript
if (pendingCount >= 5) {
  console.warn(`⚠️ Suggestions paused: ${pendingCount}/5 pending`)
  return // Stop generating
}
```

### 2. **Qualité: Confidence ≥ 0.75 minimum**

- Seuil relevé de 0.70 → 0.75
- Auto-rejet des suggestions < 0.75
- Basé sur scoring multi-facteurs

**Fichier:** `lib/services/optimizationEngine.ts`
```typescript
if (suggestion.confidence < 0.75) {
  console.log(`❌ Auto-rejected: confidence ${suggestion.confidence} < 0.75`)
  return
}
```

### 3. **Déduplication par hash**

- Hash unique: `endpoint + type + test_type`
- Cooldown de 48h par endpoint
- Empêche les suggestions identiques

**Fichier:** `lib/services/optimizationEngine.ts`
```typescript
const hash = Buffer.from(`${type}:${endpoint}:${test_type}`).toString('base64')
// Check if exists within 48h
if (existing && hoursSince < 48) {
  console.log('⏭️ Skipped duplicate')
  return
}
```

### 4. **Contexte business aware**

- Nouvelle table `project_context`
- UI complète pour configuration: `ProjectContextSettings.tsx`
- Champs: business_type, business_model, value_points, user_roles, workflows, economic_risks
- Prompts adaptatifs selon le contexte

**Fichiers:**
- `components/settings/ProjectContextSettings.tsx` - UI component
- `lib/prompts/blvSystemPrompt.ts` - Prompt generator
- Migration: `supabase/migrations/[timestamp]_create_project_context.sql`

### 5. **Régénération intelligente**

- Bouton "Régénérer" sur chaque suggestion pending
- Supprime l'originale et crée une variation
- Tracking des générations: `generation_count` in metadata
- Futur: intégration avec BLV prompt pour vraies variations

**Fichier:** `components/board/unified/sections/intelligence/SuggestionsPanelV2.tsx`
```typescript
const handleRegenerate = async (suggestion) => {
  await supabase.from('suggestions_queue').delete().eq('id', suggestion.id)
  // Create variation...
}
```

### 6. **Pagination 10 items/page**

- Navigation Précédent/Suivant
- Affichage "Page X sur Y"
- Badge avec count total
- Reset automatique à page 1 quand filtres changent

**Fichier:** `SuggestionsPanelV2.tsx:660-694`

### 7. **Auto-cleanup 7 jours**

- Fonction PostgreSQL `cleanup_old_rejected_suggestions()`
- Index optimisé: `idx_suggestions_status_created`
- Script manuel: `scripts/cleanup-rejected-suggestions.ts`
- Support pg_cron (Supabase Pro)

**Fichiers:**
- Migration: `supabase/migrations/20251007160000_add_suggestions_auto_cleanup.sql`
- Script: `scripts/cleanup-rejected-suggestions.ts`
- Doc: `scripts/README-SUGGESTIONS-CLEANUP.md`

### 8. **Désactivation Storage + Improvement**

- Seuls 2 types activés: **Rule** 🛡️ + **Pattern** 🎯
- Storage (💾) et Improvement (✨) désactivés
- Code commenté dans `optimizationEngine.ts`

## 📊 Flow complet

```
1. User interacts with chat
   ↓
2. OptimizationEngine analyzes
   ↓
3. Checks pending count (max 5?)
   ↓
4. Generates suggestion (Rule or Pattern only)
   ↓
5. Checks confidence (≥ 0.75?)
   ↓
6. Generates hash (endpoint + type)
   ↓
7. Checks duplicates (48h cooldown?)
   ↓
8. Loads project context from DB
   ↓
9. Generates BLV-specific prompt
   ↓
10. Queues suggestion
   ↓
11. UI shows in SuggestionsPanelV2 (paginated)
   ↓
12. User can: Accept / Reject / Regenerate / Edit
   ↓
13. Auto-cleanup after 7 days if rejected
```

## 🔧 Configuration

### Database

```sql
-- Enable auto-cleanup (Supabase Pro)
SELECT cron.schedule(
  'cleanup-rejected-suggestions',
  '0 3 * * *',
  $$SELECT cleanup_old_rejected_suggestions()$$
);
```

### Project Context

1. Go to Settings → Project Context
2. Configure:
   - Business type (e-commerce, fintech, saas...)
   - Business model (marketplace, subscription...)
   - Value points (coupons, credits...)
   - User roles (guest, premium, admin...)
   - Workflows (checkout, coupon redemption...)
   - Economic risks (revenue loss, fraud...)
   - Project goal

### Manual Cleanup

```bash
npx tsx scripts/cleanup-rejected-suggestions.ts
```

## 📈 Metrics & Monitoring

### Pending suggestions count
```sql
SELECT COUNT(*) FROM suggestions_queue WHERE status = 'pending';
```

### Confidence distribution
```sql
SELECT
  CASE
    WHEN confidence >= 0.9 THEN 'Excellent (≥0.9)'
    WHEN confidence >= 0.8 THEN 'Good (0.8-0.9)'
    WHEN confidence >= 0.75 THEN 'Acceptable (0.75-0.8)'
    ELSE 'Rejected (<0.75)'
  END as quality,
  COUNT(*) as count
FROM suggestions_queue
GROUP BY quality;
```

### Rejected suggestions age
```sql
SELECT
  NOW() - created_at as age,
  id,
  suggestion->>'title' as title
FROM suggestions_queue
WHERE status = 'rejected'
ORDER BY created_at ASC;
```

## 🎨 UI/UX Features

### SuggestionsPanelV2

- **Header:**
  - Title with sparkles icon
  - Badge showing "X / 5 pending" (red if 5/5)
  - Type filters: Rule / Pattern / All
  - Status filters: Pending / Accepted / Rejected

- **Pause Banner (5/5):**
  - Orange background
  - Warning icon
  - Clear message explaining why paused

- **Suggestion Cards:**
  - Type-specific icons and colors
  - Confidence badge (color-coded)
  - Title + description
  - Category, impact, severity badges
  - Expand/collapse details
  - Actions: Accept / Edit / Regenerate / Reject

- **Pagination:**
  - Previous/Next buttons
  - "Page X sur Y"
  - Total count badge
  - Auto-disabled at boundaries

## 🚀 Quick Start

### 1. Configure Project Context
```
Settings → Project Context → Fill all fields → Save
```

### 2. Use Chat Normally
The system analyzes automatically in background.

### 3. Review Suggestions
```
Intelligence Tab → Suggestions → Review pending
```

### 4. Accept or Regenerate
- **Accept:** Creates rule/pattern immediately
- **Regenerate:** Gets alternative approach
- **Reject:** Marks as rejected (auto-cleanup after 7d)

## 🔒 Security & Performance

- **RLS policies:** All tables protected
- **Service role:** Cleanup script uses service key
- **Indexes:** Optimized for status + created_at queries
- **Deduplication:** Prevents redundant suggestions
- **Hard limits:** Prevents runaway generation

## 📝 Files Created/Modified

### New Files
- `components/settings/ProjectContextSettings.tsx`
- `lib/prompts/blvSystemPrompt.ts`
- `scripts/cleanup-rejected-suggestions.ts`
- `scripts/README-SUGGESTIONS-CLEANUP.md`
- `supabase/migrations/[timestamp]_create_project_context.sql`
- `supabase/migrations/20251007160000_add_suggestions_auto_cleanup.sql`
- `docs/ROBUST-SUGGESTIONS-SYSTEM.md` (this file)

### Modified Files
- `lib/services/optimizationEngine.ts` (major refactor)
- `components/board/unified/sections/intelligence/SuggestionsPanelV2.tsx` (pagination, regeneration, pause UI)

## 🎯 Success Criteria

✅ **Never exceed 5 pending**
✅ **All suggestions ≥ 0.75 confidence**
✅ **No duplicate suggestions within 48h**
✅ **Context-aware BLV suggestions**
✅ **User can regenerate alternatives**
✅ **Pagination for better UX**
✅ **Auto-cleanup prevents clutter**
✅ **Only relevant types (Rule + Pattern)**

## 📞 Support

Run cleanup manually:
```bash
npx tsx scripts/cleanup-rejected-suggestions.ts
```

Check system status:
```sql
SELECT
  status,
  type,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence
FROM suggestions_queue
GROUP BY status, type;
```

Reset system (emergency):
```sql
DELETE FROM suggestions_queue WHERE status = 'rejected';
```

---

**Last updated:** 2025-10-07
**Version:** 1.0 - Robust System Complete
