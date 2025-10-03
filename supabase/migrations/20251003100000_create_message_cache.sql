-- Create message_cache table for intelligent caching
CREATE TABLE IF NOT EXISTS message_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash text NOT NULL UNIQUE,
  response text NOT NULL,
  response_embedding vector(1536),
  usage_count integer DEFAULT 1,
  last_used timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS message_cache_hash_idx ON message_cache (content_hash);
CREATE INDEX IF NOT EXISTS message_cache_last_used_idx ON message_cache (last_used DESC);

-- Index for embedding similarity
CREATE INDEX IF NOT EXISTS message_cache_embedding_idx
ON message_cache USING ivfflat (response_embedding vector_cosine_ops)
WITH (lists = 100);

-- Comments
COMMENT ON TABLE message_cache IS 'Cache for AI responses to avoid redundant API calls';
COMMENT ON COLUMN message_cache.content_hash IS 'SHA256 hash of normalized user message';
COMMENT ON COLUMN message_cache.usage_count IS 'Number of times this cache entry was reused';
