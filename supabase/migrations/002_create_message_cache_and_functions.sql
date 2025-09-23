-- Create message_cache table for caching AI responses
CREATE TABLE IF NOT EXISTS message_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_hash text UNIQUE NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for content_hash lookups
CREATE INDEX IF NOT EXISTS idx_message_cache_content_hash ON message_cache(content_hash);

-- Create or replace the search_similar_nodes function
CREATE OR REPLACE FUNCTION search_similar_nodes(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id,
    mc.content,
    mc.metadata,
    1 - (mc.embedding <=> query_embedding) as similarity
  FROM memory_chunks mc
  WHERE 1 - (mc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY mc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON message_cache TO authenticated;
GRANT ALL ON message_cache TO anon;
GRANT EXECUTE ON FUNCTION search_similar_nodes TO authenticated;
GRANT EXECUTE ON FUNCTION search_similar_nodes TO anon;