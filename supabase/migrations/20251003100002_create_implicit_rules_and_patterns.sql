-- Create learned_patterns table for pattern detection
CREATE TABLE IF NOT EXISTS learned_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,

  -- Pattern details
  pattern_type text NOT NULL, -- 'save_memory', 'rule_trigger', 'optimization', etc.
  condition jsonb NOT NULL, -- When to apply this pattern
  action jsonb NOT NULL, -- What to do

  -- Learning metrics
  confidence real NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  sample_size integer NOT NULL DEFAULT 0,
  drift_score real DEFAULT 0, -- Pattern evolution over time

  -- Source decisions cluster
  decision_ids uuid[] DEFAULT '{}',

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  last_validated timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create implicit_rules table for auto-generated rules
CREATE TABLE IF NOT EXISTS implicit_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,

  -- Pattern source
  pattern_id uuid REFERENCES learned_patterns(id) ON DELETE CASCADE,

  -- Rule details
  name text NOT NULL,
  condition jsonb NOT NULL,
  action jsonb NOT NULL,

  -- Learning metadata
  confidence real NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  sample_size integer NOT NULL,
  success_rate real,

  -- Lifecycle
  status text NOT NULL DEFAULT 'suggestion' CHECK (status IN ('suggestion', 'active', 'deprecated')),
  promoted_at timestamptz,
  deprecated_at timestamptz,

  -- Validation tracking
  validation_count integer DEFAULT 0,
  rejection_count integer DEFAULT 0,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS learned_patterns_project_idx ON learned_patterns (project_id);
CREATE INDEX IF NOT EXISTS learned_patterns_type_idx ON learned_patterns (pattern_type);
CREATE INDEX IF NOT EXISTS learned_patterns_confidence_idx ON learned_patterns (confidence DESC);
CREATE INDEX IF NOT EXISTS learned_patterns_created_idx ON learned_patterns (created_at DESC);

CREATE INDEX IF NOT EXISTS implicit_rules_project_idx ON implicit_rules (project_id);
CREATE INDEX IF NOT EXISTS implicit_rules_pattern_idx ON implicit_rules (pattern_id);
CREATE INDEX IF NOT EXISTS implicit_rules_status_idx ON implicit_rules (status);
CREATE INDEX IF NOT EXISTS implicit_rules_confidence_idx ON implicit_rules (confidence DESC);

-- Comments
COMMENT ON TABLE learned_patterns IS 'Detected patterns from user decision clustering';
COMMENT ON COLUMN learned_patterns.condition IS 'Context conditions that trigger this pattern';
COMMENT ON COLUMN learned_patterns.action IS 'What action to take when pattern matches';
COMMENT ON COLUMN learned_patterns.confidence IS 'Statistical confidence (0-1) based on user acceptance rate';
COMMENT ON COLUMN learned_patterns.drift_score IS 'Measures pattern evolution (0=stable, 1=changed significantly)';

COMMENT ON TABLE implicit_rules IS 'Auto-generated rules from learned patterns';
COMMENT ON COLUMN implicit_rules.status IS 'suggestion=testing, active=auto-execute, deprecated=no longer valid';
COMMENT ON COLUMN implicit_rules.validation_count IS 'Number of times user validated this rule in suggestion mode';
COMMENT ON COLUMN implicit_rules.rejection_count IS 'Number of times user rejected this rule';
