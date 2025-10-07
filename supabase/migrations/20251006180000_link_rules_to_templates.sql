-- Migration: Link rules to system_prompts templates
-- Date: 2025-10-06
-- Description: Ajoute lien rules → system_prompts pour auto-activation

-- 1. Ajouter colonne linked_template_id
ALTER TABLE rules
ADD COLUMN IF NOT EXISTS linked_template_id UUID REFERENCES system_prompts(id) ON DELETE SET NULL;

-- 2. Index pour performance
CREATE INDEX IF NOT EXISTS idx_rules_linked_template ON rules(linked_template_id);

-- 3. Comment
COMMENT ON COLUMN rules.linked_template_id IS 'Optional link to system_prompt template. When template is active, this rule auto-activates.';
