-- Améliorer similarity_search avec filter project_id
-- Cette fonction permet de chercher des documents similaires par embeddings

CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 10,
  filter_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  name text,
  content text,
  type text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    project_id,
    name,
    content,
    type,
    1 - (embedding <=> query_embedding) as similarity
  FROM memory_nodes
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > similarity_threshold
    AND (filter_project_id IS NULL OR project_id = filter_project_id)
  ORDER BY embedding <=> query_embedding
  LIMIT max_results;
$$;

-- Créer index si pas déjà existant (pour performance)
CREATE INDEX IF NOT EXISTS memory_nodes_project_type_idx
ON memory_nodes(project_id, type)
WHERE embedding IS NOT NULL;
