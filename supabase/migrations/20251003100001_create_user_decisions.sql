-- Create user_decisions table for auto-reinforcement learning
CREATE TABLE IF NOT EXISTS user_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,

  -- Type de décision
  decision_type text NOT NULL, -- 'save_memory', 'accept_rule', 'reject_suggestion', 'modify_folder', 'accept_optimization'

  -- Contexte complet de la décision
  context jsonb NOT NULL DEFAULT '{}',

  -- Proposition IA
  proposed_action jsonb NOT NULL,

  -- Choix utilisateur
  user_choice text NOT NULL CHECK (user_choice IN ('accept', 'reject', 'modify')),
  user_modification jsonb,

  -- Metadata pour learning
  confidence_score real CHECK (confidence_score >= 0 AND confidence_score <= 1),
  execution_time_ms integer,

  -- Pour clustering et pattern detection
  embedding vector(1536),
  tags text[] DEFAULT '{}',

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS user_decisions_project_idx ON user_decisions (project_id);
CREATE INDEX IF NOT EXISTS user_decisions_type_idx ON user_decisions (decision_type);
CREATE INDEX IF NOT EXISTS user_decisions_choice_idx ON user_decisions (user_choice);
CREATE INDEX IF NOT EXISTS user_decisions_created_idx ON user_decisions (created_at DESC);
CREATE INDEX IF NOT EXISTS user_decisions_tags_idx ON user_decisions USING GIN (tags);

-- Index pour similarity search (pgvector)
CREATE INDEX IF NOT EXISTS user_decisions_embedding_idx
ON user_decisions USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Comments
COMMENT ON TABLE user_decisions IS 'Tracks all user decisions for auto-reinforcement learning';
COMMENT ON COLUMN user_decisions.decision_type IS 'Type of decision made (save_memory, accept_rule, etc.)';
COMMENT ON COLUMN user_decisions.context IS 'Full context snapshot at decision time (chat message, detected pattern, etc.)';
COMMENT ON COLUMN user_decisions.proposed_action IS 'What the AI proposed to do';
COMMENT ON COLUMN user_decisions.user_choice IS 'User final choice: accept, reject, or modify';
COMMENT ON COLUMN user_decisions.user_modification IS 'If modified, contains user changes';
COMMENT ON COLUMN user_decisions.confidence_score IS 'AI confidence score (0-1) when making the proposal';
COMMENT ON COLUMN user_decisions.embedding IS 'Vector embedding of context for similarity clustering';
COMMENT ON COLUMN user_decisions.tags IS 'Auto-extracted tags for pattern detection (pentest, idor, api, etc.)';
