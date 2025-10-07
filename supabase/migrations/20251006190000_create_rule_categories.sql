-- Migration: Create rule_categories table (copie système memory_categories)
-- Date: 2025-10-06
-- Description: Catégories pour organiser les rules (comme memory_categories)

-- 1. Créer table rule_categories
CREATE TABLE IF NOT EXISTS rule_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key TEXT NOT NULL, -- Slug/identifier (ex: "authentication")
  label TEXT NOT NULL, -- Display name (ex: "Authentication")
  icon TEXT NOT NULL DEFAULT '📁', -- Emoji icon
  description TEXT, -- Description optionnelle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Une catégorie par projet doit avoir un key unique
  CONSTRAINT rule_categories_project_key_unique UNIQUE (project_id, key)
);

-- 2. Index pour performance
CREATE INDEX idx_rule_categories_project ON rule_categories(project_id);

-- 3. RLS Policy
ALTER TABLE rule_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rule categories for their projects"
  ON rule_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = rule_categories.project_id
    )
  );

CREATE POLICY "Users can insert rule categories for their projects"
  ON rule_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = rule_categories.project_id
    )
  );

CREATE POLICY "Users can update rule categories for their projects"
  ON rule_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = rule_categories.project_id
    )
  );

CREATE POLICY "Users can delete rule categories for their projects"
  ON rule_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = rule_categories.project_id
    )
  );

-- 4. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_rule_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rule_categories_updated_at
  BEFORE UPDATE ON rule_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_rule_categories_updated_at();

-- 5. Ajouter colonne category_id à rules
ALTER TABLE rules
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES rule_categories(id) ON DELETE SET NULL;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_rules_category ON rules(category_id);

-- 6. Comments
COMMENT ON TABLE rule_categories IS 'Custom categories for organizing rules (copie système memory_categories)';
COMMENT ON COLUMN rules.category_id IS 'Link to rule category (optional)';
