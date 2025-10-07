-- Migration: Add content_hash to memory_facts for deduplication
-- Date: 2025-10-06

-- 1. Add content_hash column
ALTER TABLE memory_facts 
ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- 2. Create function to generate hash
CREATE OR REPLACE FUNCTION generate_fact_hash(
  p_fact TEXT,
  p_endpoint TEXT,
  p_technique TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN substring(
    encode(
      digest(
        COALESCE(p_fact, '') || 
        COALESCE(p_endpoint, '') || 
        COALESCE(p_technique, ''),
        'sha256'
      ),
      'hex'
    ),
    1, 16
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Populate existing facts with hash
UPDATE memory_facts
SET content_hash = generate_fact_hash(
  fact,
  metadata->>'endpoint',
  metadata->>'technique'
)
WHERE content_hash IS NULL;

-- 4. Create UNIQUE index (project_id + content_hash)
CREATE UNIQUE INDEX IF NOT EXISTS idx_facts_content_hash
  ON memory_facts(project_id, content_hash);

-- 5. Comment
COMMENT ON COLUMN memory_facts.content_hash IS 'SHA256 hash (16 chars) for deduplication based on fact+endpoint+technique';
