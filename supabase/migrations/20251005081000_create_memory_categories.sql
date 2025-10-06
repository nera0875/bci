-- Table memory_categories: Catégories personnalisables pour memory_facts
-- Permet à l'IA de voir et utiliser les catégories côté serveur

CREATE TABLE IF NOT EXISTS memory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key TEXT NOT NULL, -- Slug/identifier (ex: "business_logic")
  label TEXT NOT NULL, -- Display name (ex: "Business Logic")
  icon TEXT NOT NULL DEFAULT '📁', -- Emoji icon
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Une catégorie par projet doit avoir un key unique
  CONSTRAINT memory_categories_project_key_unique UNIQUE (project_id, key)
);

-- Index pour performance
CREATE INDEX idx_memory_categories_project ON memory_categories(project_id);

-- RLS Policy
ALTER TABLE memory_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories for their projects"
  ON memory_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = memory_categories.project_id
    )
  );

CREATE POLICY "Users can insert categories for their projects"
  ON memory_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = memory_categories.project_id
    )
  );

CREATE POLICY "Users can update categories for their projects"
  ON memory_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = memory_categories.project_id
    )
  );

CREATE POLICY "Users can delete categories for their projects"
  ON memory_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = memory_categories.project_id
    )
  );

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_memory_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memory_categories_updated_at
  BEFORE UPDATE ON memory_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_memory_categories_updated_at();

-- Comment
COMMENT ON TABLE memory_categories IS 'Custom categories for organizing memory facts, accessible server-side for AI';
