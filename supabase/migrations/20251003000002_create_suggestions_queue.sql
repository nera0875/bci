-- Create suggestions_queue table for optimization panel
CREATE TABLE IF NOT EXISTS suggestions_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('storage', 'rule', 'improvement', 'pattern')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'modified')),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),

  -- Suggestion details (JSON structure varies by type)
  suggestion JSONB NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by VARCHAR(100),

  -- Indexing
  CONSTRAINT unique_pending_suggestion UNIQUE (project_id, type, status, created_at)
);

-- Indexes for performance
CREATE INDEX idx_suggestions_project_status ON suggestions_queue(project_id, status);
CREATE INDEX idx_suggestions_type_status ON suggestions_queue(type, status);
CREATE INDEX idx_suggestions_created_at ON suggestions_queue(created_at DESC);
CREATE INDEX idx_suggestions_confidence ON suggestions_queue(confidence DESC);

-- Enable RLS
ALTER TABLE suggestions_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their project suggestions"
  ON suggestions_queue FOR SELECT
  USING (true); -- Simplified for now, add auth later

CREATE POLICY "Users can update their project suggestions"
  ON suggestions_queue FOR UPDATE
  USING (true); -- Simplified for now, add auth later

CREATE POLICY "System can insert suggestions"
  ON suggestions_queue FOR INSERT
  WITH CHECK (true); -- Simplified for now, add auth later

-- Function to count pending suggestions
CREATE OR REPLACE FUNCTION count_pending_suggestions(p_project_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM suggestions_queue
  WHERE project_id = p_project_id
    AND status = 'pending';
$$;

-- Function to auto-cleanup old rejected suggestions (30 days)
CREATE OR REPLACE FUNCTION cleanup_old_suggestions()
RETURNS void
LANGUAGE SQL
AS $$
  DELETE FROM suggestions_queue
  WHERE status = 'rejected'
    AND processed_at < NOW() - INTERVAL '30 days';
$$;

-- Comment for documentation
COMMENT ON TABLE suggestions_queue IS 'Queue for AI-generated optimization suggestions (storage, rules, improvements)';
COMMENT ON COLUMN suggestions_queue.type IS 'Type of suggestion: storage (auto-save), rule (new rule), improvement (rule update), pattern (detected pattern)';
COMMENT ON COLUMN suggestions_queue.suggestion IS 'JSON structure varies by type. Storage: {path, name, content}, Rule: {name, trigger, action}, etc.';
COMMENT ON COLUMN suggestions_queue.confidence IS 'AI confidence score (0.0 to 1.0) for the suggestion';