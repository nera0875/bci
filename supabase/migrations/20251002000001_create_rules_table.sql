-- Migration: Create rules table for intelligent pentesting rules
-- This table stores user-defined rules that the AI applies contextually

CREATE TABLE IF NOT EXISTS public.rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,           -- Pattern to match (e.g., "auth/*", "business/*")
  action TEXT NOT NULL,             -- Instructions for the AI
  priority INTEGER DEFAULT 1,       -- Higher priority = applied first
  enabled BOOLEAN DEFAULT true,     -- Toggle ON/OFF
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by project
CREATE INDEX idx_rules_project_id ON public.rules(project_id);

-- Index for enabled rules (most common query)
CREATE INDEX idx_rules_enabled ON public.rules(project_id, enabled) WHERE enabled = true;

-- RLS Policies
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project rules"
  ON public.rules FOR SELECT
  USING (project_id IN (
    SELECT id FROM public.projects WHERE id = project_id
  ));

CREATE POLICY "Users can insert own project rules"
  ON public.rules FOR INSERT
  WITH CHECK (project_id IN (
    SELECT id FROM public.projects WHERE id = project_id
  ));

CREATE POLICY "Users can update own project rules"
  ON public.rules FOR UPDATE
  USING (project_id IN (
    SELECT id FROM public.projects WHERE id = project_id
  ));

CREATE POLICY "Users can delete own project rules"
  ON public.rules FOR DELETE
  USING (project_id IN (
    SELECT id FROM public.projects WHERE id = project_id
  ));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rules_updated_at_trigger
  BEFORE UPDATE ON public.rules
  FOR EACH ROW
  EXECUTE FUNCTION update_rules_updated_at();

-- Comment
COMMENT ON TABLE public.rules IS 'Stores contextual pentesting rules applied by the AI';
