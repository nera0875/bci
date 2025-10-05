-- Migration: Rules Structured System (Déclencheurs & Actions structurés)
-- Date: 2025-10-04
-- Description: Ajoute colonnes pour rendre Rules compréhensibles par l'IA

-- Ajouter colonnes structurées
ALTER TABLE rules ADD COLUMN IF NOT EXISTS trigger_type text;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS trigger_config jsonb DEFAULT '{}';
ALTER TABLE rules ADD COLUMN IF NOT EXISTS target_folders uuid[];
ALTER TABLE rules ADD COLUMN IF NOT EXISTS action_type text;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS action_config jsonb DEFAULT '{}';

-- Commentaires pour documentation
COMMENT ON COLUMN rules.trigger_type IS 'Type de déclencheur: endpoint, context, pattern, manual';
COMMENT ON COLUMN rules.trigger_config IS 'Configuration structurée du trigger (url_pattern, http_method, keywords, etc.)';
COMMENT ON COLUMN rules.target_folders IS 'IDs des folders Memory ciblés (facultatif, null = tous)';
COMMENT ON COLUMN rules.action_type IS 'Type d''action: extract, test, store, analyze';
COMMENT ON COLUMN rules.action_config IS 'Configuration structurée de l''action (parameter, variations, target_folder, etc.)';

-- Index pour performance
CREATE INDEX IF NOT EXISTS rules_trigger_type_idx ON rules (trigger_type);
CREATE INDEX IF NOT EXISTS rules_action_type_idx ON rules (action_type);
CREATE INDEX IF NOT EXISTS rules_target_folders_idx ON rules USING GIN (target_folders);

-- Exemples de données structurées (commentaires)
/*
Exemple trigger_type = 'endpoint':
trigger_config = {
  "url_pattern": "/api/users/*",
  "http_method": "GET"
}

Exemple trigger_type = 'context':
trigger_config = {
  "keywords": ["auth", "login", "token"]
}

Exemple trigger_type = 'pattern':
trigger_config = {
  "pattern_id": "uuid-pattern",
  "min_success_rate": 0.70
}

Exemple action_type = 'test':
action_config = {
  "test_type": "idor",
  "parameter": "id",
  "variations": ["id+1", "id-1", "random"]
}

Exemple action_type = 'store':
action_config = {
  "store_success": "uuid-success-folder",
  "store_fail": "uuid-failed-folder"
}
*/
