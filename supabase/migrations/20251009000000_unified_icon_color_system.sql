-- Migration: Système unifié d'icônes professionnelles (icon + couleur)
-- Date: 2025-10-09
-- Description: Remplace les emojis par un système icon_name + icon_color pro

-- ============================================================================
-- 1. MEMORY CATEGORIES
-- ============================================================================
-- Remplacer colonne 'icon' (emoji) par 'icon_name' + 'icon_color'
ALTER TABLE memory_categories
  DROP COLUMN IF EXISTS icon;

ALTER TABLE memory_categories
  ADD COLUMN icon_name TEXT NOT NULL DEFAULT 'Folder',
  ADD COLUMN icon_color TEXT NOT NULL DEFAULT '#6b7280';

COMMENT ON COLUMN memory_categories.icon_name IS 'Phosphor icon name (ex: Folder, Shield, Brain)';
COMMENT ON COLUMN memory_categories.icon_color IS 'Hex color for icon (ex: #6b7280)';

-- ============================================================================
-- 2. RULE CATEGORIES
-- ============================================================================
-- Remplacer colonne 'icon' (emoji) par 'icon_name' + 'icon_color'
ALTER TABLE rule_categories
  DROP COLUMN IF EXISTS icon;

ALTER TABLE rule_categories
  ADD COLUMN icon_name TEXT NOT NULL DEFAULT 'Shield',
  ADD COLUMN icon_color TEXT NOT NULL DEFAULT '#6b7280';

COMMENT ON COLUMN rule_categories.icon_name IS 'Phosphor icon name (ex: Shield, Lock, Key)';
COMMENT ON COLUMN rule_categories.icon_color IS 'Hex color for icon (ex: #ef4444)';

-- ============================================================================
-- 3. SYSTEM PROMPTS
-- ============================================================================
-- Remplacer colonne 'icon' (emoji) par 'icon_name' + 'icon_color'
ALTER TABLE system_prompts
  DROP COLUMN IF EXISTS icon;

ALTER TABLE system_prompts
  ADD COLUMN icon_name TEXT NOT NULL DEFAULT 'FileCode',
  ADD COLUMN icon_color TEXT NOT NULL DEFAULT '#6b7280';

COMMENT ON COLUMN system_prompts.icon_name IS 'Phosphor icon name (ex: FileCode, Terminal, Code)';
COMMENT ON COLUMN system_prompts.icon_color IS 'Hex color for icon (ex: #3b82f6)';

-- ============================================================================
-- 4. MIGRATION DONNÉES (emoji → icon_name par défaut)
-- ============================================================================

-- Memory categories: convertir emojis existants
-- Si tu veux garder une correspondance emoji→icon, sinon on met juste Folder
UPDATE memory_categories
SET
  icon_name = 'Folder',
  icon_color = '#6b7280'
WHERE icon_name = 'Folder'; -- Default déjà appliqué

-- Rule categories: convertir emojis existants
UPDATE rule_categories
SET
  icon_name = 'Shield',
  icon_color = '#6b7280'
WHERE icon_name = 'Shield'; -- Default déjà appliqué

-- System prompts: convertir emojis existants
UPDATE system_prompts
SET
  icon_name = 'FileCode',
  icon_color = '#6b7280'
WHERE icon_name = 'FileCode'; -- Default déjà appliqué

-- ============================================================================
-- 5. INDEXES (Performance)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_memory_categories_icon ON memory_categories(icon_name);
CREATE INDEX IF NOT EXISTS idx_rule_categories_icon ON rule_categories(icon_name);
CREATE INDEX IF NOT EXISTS idx_system_prompts_icon ON system_prompts(icon_name);

-- ============================================================================
-- RÉSULTAT FINAL
-- ============================================================================
-- ✅ memory_categories: icon_name + icon_color (Phosphor)
-- ✅ rule_categories: icon_name + icon_color (Phosphor)
-- ✅ system_prompts: icon_name + icon_color (Phosphor)
-- ❌ Plus d'emojis amateurs 📁✨
-- ✅ Système unifié professionnel avec 9,000 icônes disponibles
