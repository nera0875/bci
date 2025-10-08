-- Créer automatiquement project_progress lors de la création d'un projet
-- Fonction trigger pour créer project_progress automatiquement
CREATE OR REPLACE FUNCTION create_project_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO project_progress (project_id, facts_validated, content_organized, suggestions_applied, total_points, target_points)
  VALUES (NEW.id, 0, 0, 0, 0, 100)
  ON CONFLICT (project_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Créer le trigger sur la table projects
DROP TRIGGER IF EXISTS trigger_create_project_progress ON projects;
CREATE TRIGGER trigger_create_project_progress
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_project_progress();

-- Créer les entrées manquantes pour les projets existants
INSERT INTO project_progress (project_id, facts_validated, content_organized, suggestions_applied, total_points, target_points)
SELECT id, 0, 0, 0, 0, 100
FROM projects
WHERE id NOT IN (SELECT project_id FROM project_progress)
ON CONFLICT (project_id) DO NOTHING;
