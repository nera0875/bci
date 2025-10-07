-- Migration: Create pending_facts table
-- Date: 2025-10-06
-- Description: Stocke facts en attente de validation utilisateur

-- 1. Create table
CREATE TABLE IF NOT EXISTS pending_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Core content
  fact TEXT NOT NULL,

  -- Metadata (same structure as memory_facts)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Validation
  confidence FLOAT NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_pending_facts_project ON pending_facts(project_id);
CREATE INDEX IF NOT EXISTS idx_pending_facts_status ON pending_facts(project_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_facts_created ON pending_facts(created_at DESC);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE pending_facts ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view pending facts for their projects"
  ON pending_facts FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert pending facts"
  ON pending_facts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their pending facts"
  ON pending_facts FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their pending facts"
  ON pending_facts FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- 5. Comments
COMMENT ON TABLE pending_facts IS 'Facts extracted by AI awaiting user validation';
COMMENT ON COLUMN pending_facts.status IS 'pending = awaiting validation, approved = moved to memory_facts, rejected = ignored';
COMMENT ON COLUMN pending_facts.confidence IS 'AI confidence score (0.0-1.0)';
