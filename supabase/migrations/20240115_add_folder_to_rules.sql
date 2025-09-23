-- Add folder column to rules table for folder-specific rule management
ALTER TABLE rules
ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT '*';

-- Add comment to explain the column
COMMENT ON COLUMN rules.folder IS 'Folder name for folder-specific rules. "*" means all folders';

-- Create index for better performance when filtering by folder
CREATE INDEX IF NOT EXISTS idx_rules_folder ON rules(folder);