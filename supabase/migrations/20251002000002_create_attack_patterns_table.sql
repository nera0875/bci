-- Migration: Create attack_patterns table for learning system
-- This table tracks success rates of different pentesting techniques

CREATE TABLE IF NOT EXISTS public.attack_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,       -- e.g., "sqli", "xss", "default-creds", "idor"
  context TEXT NOT NULL,            -- e.g., "authentication", "api", "business-logic"
  technique TEXT,                   -- Specific technique used
  success_rate FLOAT DEFAULT 0.0,   -- Calculated success rate (0.0 to 1.0)
  usage_count INTEGER DEFAULT 0,    -- How many times used
  success_count INTEGER DEFAULT 0,  -- How many times successful
  last_success_at TIMESTAMPTZ,      -- Last successful use
  last_failure_at TIMESTAMPTZ,      -- Last failed use
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by project and context
CREATE INDEX idx_attack_patterns_project_id ON public.attack_patterns(project_id);
CREATE INDEX idx_attack_patterns_context ON public.attack_patterns(project_id, context);
CREATE INDEX idx_attack_patterns_success_rate ON public.attack_patterns(project_id, success_rate DESC);

-- Index for learning queries (finding best patterns)
CREATE INDEX idx_attack_patterns_learning ON public.attack_patterns(
  project_id,
  context,
  success_rate DESC,
  usage_count DESC
) WHERE usage_count > 0;

-- RLS Policies
ALTER TABLE public.attack_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project patterns"
  ON public.attack_patterns FOR SELECT
  USING (project_id IN (
    SELECT id FROM public.projects WHERE id = project_id
  ));

CREATE POLICY "Users can insert own project patterns"
  ON public.attack_patterns FOR INSERT
  WITH CHECK (project_id IN (
    SELECT id FROM public.projects WHERE id = project_id
  ));

CREATE POLICY "Users can update own project patterns"
  ON public.attack_patterns FOR UPDATE
  USING (project_id IN (
    SELECT id FROM public.projects WHERE id = project_id
  ));

CREATE POLICY "Users can delete own project patterns"
  ON public.attack_patterns FOR DELETE
  USING (project_id IN (
    SELECT id FROM public.projects WHERE id = project_id
  ));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_attack_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attack_patterns_updated_at_trigger
  BEFORE UPDATE ON public.attack_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_attack_patterns_updated_at();

-- Trigger to auto-calculate success_rate when success/usage counts change
CREATE OR REPLACE FUNCTION calculate_success_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.usage_count > 0 THEN
    NEW.success_rate = NEW.success_count::FLOAT / NEW.usage_count::FLOAT;
  ELSE
    NEW.success_rate = 0.0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attack_patterns_calculate_success_rate
  BEFORE INSERT OR UPDATE ON public.attack_patterns
  FOR EACH ROW
  WHEN (NEW.usage_count IS DISTINCT FROM OLD.usage_count OR
        NEW.success_count IS DISTINCT FROM OLD.success_count OR
        OLD IS NULL)
  EXECUTE FUNCTION calculate_success_rate();

-- Comment
COMMENT ON TABLE public.attack_patterns IS 'Tracks success rates of pentesting techniques for intelligent suggestions';
