-- Create memory_chunks table for RAG system
CREATE TABLE IF NOT EXISTS public.memory_chunks (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  node_id UUID NOT NULL REFERENCES public.memory_nodes(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  start_position INTEGER,
  end_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Unique constraint to prevent duplicate chunks
  UNIQUE(node_id, chunk_index)
);

-- Create indexes for performance
CREATE INDEX idx_memory_chunks_node_id ON public.memory_chunks(node_id);
CREATE INDEX idx_memory_chunks_embedding ON public.memory_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_memory_chunks_metadata ON public.memory_chunks USING gin(metadata);
CREATE INDEX idx_memory_chunks_updated_at ON public.memory_chunks(updated_at DESC);

-- Function to search similar chunks
CREATE OR REPLACE FUNCTION search_memory_chunks(
  query_embedding vector(1536),
  project_id_param UUID,
  limit_param INTEGER DEFAULT 10,
  threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id UUID,
  node_id UUID,
  node_name TEXT,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id as chunk_id,
    mc.node_id,
    mn.name as node_name,
    mc.content,
    1 - (mc.embedding <=> query_embedding) as similarity,
    mc.metadata
  FROM memory_chunks mc
  JOIN memory_nodes mn ON mc.node_id = mn.id
  WHERE mn.project_id = project_id_param
    AND 1 - (mc.embedding <=> query_embedding) > threshold
  ORDER BY mc.embedding <=> query_embedding
  LIMIT limit_param;
END;
$$;

-- Function to update chunk
CREATE OR REPLACE FUNCTION update_memory_chunk(
  chunk_id_param UUID,
  new_content TEXT,
  new_embedding vector(1536) DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE memory_chunks
  SET
    content = new_content,
    embedding = COALESCE(new_embedding, embedding),
    updated_at = now()
  WHERE id = chunk_id_param;
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_memory_chunks_updated_at
  BEFORE UPDATE ON public.memory_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add cache table for frequently accessed chunks
CREATE TABLE IF NOT EXISTS public.memory_chunks_cache (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  chunk_id UUID NOT NULL REFERENCES public.memory_chunks(id) ON DELETE CASCADE,
  access_count INTEGER DEFAULT 1,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT now(),
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_chunks_cache_last_accessed ON public.memory_chunks_cache(last_accessed DESC);
CREATE INDEX idx_chunks_cache_access_count ON public.memory_chunks_cache(access_count DESC);