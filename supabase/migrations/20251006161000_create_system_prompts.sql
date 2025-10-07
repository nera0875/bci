-- Migration: Create system_prompts table
-- Date: 2025-10-06
-- Description: Migrer System Prompts de localStorage vers Supabase

CREATE TABLE IF NOT EXISTS system_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Core
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  
  -- Organization
  category TEXT,
  icon TEXT DEFAULT '✨',
  
  -- Status
  is_active BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint
  UNIQUE(project_id, name)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_system_prompts_project ON system_prompts(project_id);
CREATE INDEX IF NOT EXISTS idx_system_prompts_active ON system_prompts(project_id, is_active);
CREATE INDEX IF NOT EXISTS idx_system_prompts_sort ON system_prompts(project_id, sort_order);

-- Trigger updated_at
CREATE TRIGGER system_prompts_updated_at
  BEFORE UPDATE ON system_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_memory_facts_updated_at();

-- RLS (simplified - no user_id in projects table)
ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on system_prompts"
  ON system_prompts FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE system_prompts IS 'System prompts stored in Supabase (migrated from localStorage)';
