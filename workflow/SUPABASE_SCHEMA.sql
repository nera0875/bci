-- BCI Tool v2 - Supabase Schema
-- Complete database structure for isolated projects with dynamic memory

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Projects table (main isolation unit)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  goal TEXT,
  api_keys JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory nodes (virtual folders/documents system)
CREATE TABLE memory_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('folder', 'document', 'widget', 'pattern', 'exploit', 'metric')),
  name TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  embedding vector(1536), -- For semantic search
  color TEXT DEFAULT '#6E6E80',
  icon TEXT DEFAULT '📁',
  parent_id UUID REFERENCES memory_nodes(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for hierarchy queries
  INDEX idx_memory_nodes_project_parent (project_id, parent_id),
  INDEX idx_memory_nodes_type (type)
);

-- Chat messages with streaming support
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  streaming BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_chat_messages_project (project_id),
  INDEX idx_chat_messages_created (created_at DESC)
);

-- Rules table for modular AI behavior
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT NOT NULL,
  action TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_rules_project_enabled (project_id, enabled),
  INDEX idx_rules_priority (priority DESC)
);

-- HTTP Requests storage (parsed and vectorized)
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  method TEXT,
  url TEXT,
  headers JSONB,
  body TEXT,
  parsed_data JSONB,
  embedding vector(1536),
  vulnerability_score FLOAT DEFAULT 0,
  tested BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_requests_project (project_id),
  INDEX idx_requests_tested (tested)
);

-- Vulnerabilities found
CREATE TABLE vulnerabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  payload TEXT,
  evidence JSONB,
  confidence FLOAT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_vulnerabilities_project (project_id),
  INDEX idx_vulnerabilities_severity (severity)
);

-- Attack patterns (learning system)
CREATE TABLE attack_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  pattern JSONB NOT NULL,
  success_rate FLOAT DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  last_success TIMESTAMPTZ,
  mutations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_patterns_project_type (project_id, pattern_type),
  INDEX idx_patterns_success (success_rate DESC)
);

-- Create vector similarity search indexes
CREATE INDEX memory_nodes_embedding_idx ON memory_nodes
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX requests_embedding_idx ON requests
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Row Level Security (RLS) Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE attack_patterns ENABLE ROW LEVEL SECURITY;

-- Functions for real-time updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_memory_nodes_updated_at BEFORE UPDATE ON memory_nodes
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON rules
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_attack_patterns_updated_at BEFORE UPDATE ON attack_patterns
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to search similar memory nodes
CREATE OR REPLACE FUNCTION search_similar_memories(
  project_uuid UUID,
  query_embedding vector(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  content JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mn.id,
    mn.name,
    mn.content,
    1 - (mn.embedding <=> query_embedding) as similarity
  FROM memory_nodes mn
  WHERE mn.project_id = project_uuid
    AND mn.embedding IS NOT NULL
  ORDER BY mn.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get memory node hierarchy
CREATE OR REPLACE FUNCTION get_memory_tree(project_uuid UUID)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  name TEXT,
  type TEXT,
  color TEXT,
  icon TEXT,
  level INT,
  path TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT
      mn.id,
      mn.parent_id,
      mn.name,
      mn.type,
      mn.color,
      mn.icon,
      0 as level,
      ARRAY[mn.name] as path
    FROM memory_nodes mn
    WHERE mn.project_id = project_uuid AND mn.parent_id IS NULL

    UNION ALL

    SELECT
      mn.id,
      mn.parent_id,
      mn.name,
      mn.type,
      mn.color,
      mn.icon,
      t.level + 1,
      t.path || mn.name
    FROM memory_nodes mn
    JOIN tree t ON mn.parent_id = t.id
  )
  SELECT * FROM tree ORDER BY path;
END;
$$;