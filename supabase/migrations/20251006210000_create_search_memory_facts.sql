-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create function to search memory facts by similarity
CREATE OR REPLACE FUNCTION search_memory_facts(
  query_embedding vector(1536),
  filter_project_id uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  fact text,
  metadata jsonb,
  embedding vector(1536),
  created_at timestamptz,
  updated_at timestamptz,
  content_hash text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mf.id,
    mf.project_id,
    mf.fact,
    mf.metadata,
    mf.embedding,
    mf.created_at,
    mf.updated_at,
    mf.content_hash,
    1 - (mf.embedding <=> query_embedding) AS similarity
  FROM memory_facts mf
  WHERE mf.project_id = filter_project_id
    AND mf.embedding IS NOT NULL
    AND 1 - (mf.embedding <=> query_embedding) > match_threshold
  ORDER BY mf.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
