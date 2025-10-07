-- Add category and position to tag_templates for organizing tags by groups
ALTER TABLE tag_templates
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS position INTEGER;

-- Index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_tag_templates_category ON tag_templates(project_id, category);

-- Update existing tags to have default category
UPDATE tag_templates
SET category = 'general'
WHERE category IS NULL;

-- Comment for documentation
COMMENT ON COLUMN tag_templates.category IS 'Category to group tags (e.g., "security", "status", "severity"). NULL = uncategorized.';
COMMENT ON COLUMN tag_templates.position IS 'Display order within category (for drag & drop).';
