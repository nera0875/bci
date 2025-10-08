-- Table de progression du projet
CREATE TABLE IF NOT EXISTS project_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Compteurs de progression
  facts_validated int DEFAULT 0,
  content_organized int DEFAULT 0,
  suggestions_applied int DEFAULT 0,
  total_points int DEFAULT 0,
  
  -- Objectif (calculé depuis project.goal par IA)
  target_points int DEFAULT 100,
  
  -- Pourcentage auto-calculé
  percentage int GENERATED ALWAYS AS (
    CASE 
      WHEN target_points > 0 THEN LEAST(100, (total_points * 100) / target_points)
      ELSE 0
    END
  ) STORED,
  
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(project_id)
);

-- RLS
ALTER TABLE project_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project progress"
  ON project_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_progress.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project progress"
  ON project_progress FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_progress.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project progress"
  ON project_progress FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_progress.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Fonction pour incrémenter la progression
CREATE OR REPLACE FUNCTION increment_progress(
  p_project_id uuid,
  p_points int DEFAULT 5,
  p_facts_count int DEFAULT 0,
  p_content_count int DEFAULT 0,
  p_suggestions_count int DEFAULT 0
) RETURNS void AS $$
BEGIN
  INSERT INTO project_progress (
    project_id,
    total_points,
    facts_validated,
    content_organized,
    suggestions_applied
  ) VALUES (
    p_project_id,
    p_points,
    p_facts_count,
    p_content_count,
    p_suggestions_count
  )
  ON CONFLICT (project_id) DO UPDATE SET
    total_points = project_progress.total_points + p_points,
    facts_validated = project_progress.facts_validated + p_facts_count,
    content_organized = project_progress.content_organized + p_content_count,
    suggestions_applied = project_progress.suggestions_applied + p_suggestions_count,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index
CREATE INDEX idx_project_progress_project_id ON project_progress(project_id);

-- Trigger pour créer automatiquement la progression à la création du projet
CREATE OR REPLACE FUNCTION create_project_progress()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_progress (project_id, target_points)
  VALUES (NEW.id, 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_project_progress
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_project_progress();
