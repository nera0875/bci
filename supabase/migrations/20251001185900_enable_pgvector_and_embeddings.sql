-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add embedding column to memory_nodes table
ALTER TABLE memory_nodes 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index on embedding for faster similarity search
CREATE INDEX IF NOT EXISTS memory_nodes_embedding_idx 
ON memory_nodes USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create RPC function for similarity search
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(1536),
  similarity_threshold float,
  max_results int,
  match_count int DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  project_id text,
  name text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    memory_nodes.id,
    memory_nodes.project_id,
    memory_nodes.name,
    memory_nodes.content,
    memory_nodes.metadata,
    1 - (memory_nodes.embedding <=> query_embedding) as similarity
  FROM memory_nodes
  WHERE 1 - (memory_nodes.embedding <=> query_embedding) > similarity_threshold
    AND memory_nodes.embedding IS NOT NULL
  ORDER BY memory_nodes.embedding <=> query_embedding
  LIMIT max_results;
$$;

-- Update existing entries with embeddings (run this separately if needed)
-- UPDATE memory_nodes SET embedding = NULL WHERE embedding IS NULL;