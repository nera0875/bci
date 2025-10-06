-- Create tag_templates table for reusable tags with colors
CREATE TABLE IF NOT EXISTS tag_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL, -- Tailwind color class (e.g., "blue", "green", "purple")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique tag names per project
  UNIQUE(project_id, name)
);

-- Index for faster lookups
CREATE INDEX idx_tag_templates_project ON tag_templates(project_id);

-- RLS policies
ALTER TABLE tag_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tag templates"
  ON tag_templates FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own tag templates"
  ON tag_templates FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own tag templates"
  ON tag_templates FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own tag templates"
  ON tag_templates FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
