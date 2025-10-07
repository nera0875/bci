-- Migration: Add icon and fact targeting to rules table
-- Adds icon (emoji), target_categories (array), target_tags (array)
-- Permet de cibler rules sur memory_facts au lieu de memory_nodes

-- Add icon column (emoji string)
ALTER TABLE rules
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🎯';

-- Add target_categories column (array of strings matching memory_facts categories)
ALTER TABLE rules
ADD COLUMN IF NOT EXISTS target_categories TEXT[] DEFAULT NULL;

-- Add target_tags column (array of strings matching memory_facts tags)
ALTER TABLE rules
ADD COLUMN IF NOT EXISTS target_tags TEXT[] DEFAULT NULL;

-- Create index for faster category/tag filtering
CREATE INDEX IF NOT EXISTS idx_rules_target_categories ON rules USING GIN (target_categories);
CREATE INDEX IF NOT EXISTS idx_rules_target_tags ON rules USING GIN (target_tags);

-- Comment
COMMENT ON COLUMN rules.icon IS 'Emoji icon for the rule (e.g., 🎯, ⚡, 🔥)';
COMMENT ON COLUMN rules.target_categories IS 'Categories from memory_facts to target (auth, api, business_logic, info_disclosure, general)';
COMMENT ON COLUMN rules.target_tags IS 'Tags from memory_facts to target (idor, sqli, xss, etc.)';
