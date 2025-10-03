-- Add target_folder_id to rules table for folder-specific rules
ALTER TABLE rules
ADD COLUMN target_folder_id UUID REFERENCES memory_nodes(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_rules_target_folder ON rules(target_folder_id);

-- Comment for documentation
COMMENT ON COLUMN rules.target_folder_id IS 'Reference to memory_nodes folder for folder-specific rules. NULL means global rule.';

-- Example: Create a global rule
INSERT INTO rules (project_id, name, trigger, action, priority, enabled, target_folder_id)
VALUES (
  'default-project-id',
  'Global Documentation Rule',
  '*',
  'Always document with clear steps and expected results',
  1,
  true,
  NULL  -- Global rule
) ON CONFLICT DO NOTHING;