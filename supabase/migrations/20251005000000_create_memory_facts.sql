-- Migration: Create memory_facts table for Mem0-style system
-- Date: 2025-10-05
-- Description: Facts atomiques avec metadata JSON flexible

-- 1. Create table
CREATE TABLE IF NOT EXISTS memory_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Core content
  fact TEXT NOT NULL,

  -- Metadata flexible (JSON)
  metadata JSONB DEFAULT '{
    "type": "general",
    "technique": null,
    "endpoint": null,
    "method": null,
    "params": {},
    "result": null,
    "severity": null,
    "category": null,
    "confidence": 0.0,
    "relations": []
  }'::jsonb,

  -- Vector search
  embedding vector(1536),

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_facts_project ON memory_facts(project_id);
CREATE INDEX IF NOT EXISTS idx_facts_type ON memory_facts((metadata->>'type'));
CREATE INDEX IF NOT EXISTS idx_facts_category ON memory_facts((metadata->>'category'));
CREATE INDEX IF NOT EXISTS idx_facts_technique ON memory_facts((metadata->>'technique'));
CREATE INDEX IF NOT EXISTS idx_facts_created ON memory_facts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facts_embedding ON memory_facts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 3. Create RPC for similarity search
CREATE OR REPLACE FUNCTION search_memory_facts(
  query_embedding vector(1536),
  filter_project_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  fact text,
  metadata jsonb,
  similarity float,
  created_at timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    fact,
    metadata,
    1 - (embedding <=> query_embedding) as similarity,
    created_at
  FROM memory_facts
  WHERE project_id = filter_project_id
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 4. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_memory_facts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memory_facts_updated_at
  BEFORE UPDATE ON memory_facts
  FOR EACH ROW
  EXECUTE FUNCTION update_memory_facts_updated_at();

-- 5. Enable RLS (Row Level Security)
ALTER TABLE memory_facts ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY "Users can view their project facts"
  ON memory_facts FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert facts in their projects"
  ON memory_facts FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their project facts"
  ON memory_facts FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their project facts"
  ON memory_facts FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- 7. Comment table
COMMENT ON TABLE memory_facts IS 'Atomic facts extracted from conversations for Mem0-style memory system';
COMMENT ON COLUMN memory_facts.fact IS 'Short atomic fact (1 sentence)';
COMMENT ON COLUMN memory_facts.metadata IS 'Flexible JSON metadata (type, technique, endpoint, etc.)';
COMMENT ON COLUMN memory_facts.embedding IS 'Vector embedding for similarity search';
