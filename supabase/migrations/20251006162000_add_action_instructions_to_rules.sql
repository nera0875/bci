-- Migration: Add action_instructions to rules table
-- Date: 2025-10-06
-- Description: Remplacer action_type/action_config rigides par instructions libres

-- 1. Add action_instructions column
ALTER TABLE rules
ADD COLUMN IF NOT EXISTS action_instructions TEXT;

-- 2. Migrate existing actions to instructions format
UPDATE rules
SET action_instructions = CASE
  WHEN action_type = 'test' THEN
    'Tester l''endpoint avec type: ' || COALESCE(action_config->>'test_type', 'security') || 
    CASE WHEN action_config->>'instructions' IS NOT NULL 
      THEN '. Instructions: ' || (action_config->>'instructions')
      ELSE ''
    END
  WHEN action_type = 'store' THEN
    'Créer automatiquement un fact dans memory_facts avec les métadonnées appropriées'
  WHEN action_type = 'analyze' THEN
    'Analyser la réponse en détail'
  WHEN action_type = 'extract' THEN
    'Extraire: ' || COALESCE(action_config->>'parameter', 'données')
  ELSE
    'Action personnalisée: ' || COALESCE(action_config::text, 'non définie')
END
WHERE action_instructions IS NULL;

-- 3. Comment
COMMENT ON COLUMN rules.action_instructions IS 'Instructions libres en langage naturel pour l''IA (remplace action_type/action_config)';

-- Note: On garde action_type et action_config pour backward compatibility
-- Les nouveaux playbooks utiliseront uniquement action_instructions
