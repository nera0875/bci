-- Créer la table memory_nodes pour le système de mémoire simplifié
CREATE TABLE IF NOT EXISTS memory_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_id UUID REFERENCES memory_nodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'folder' ou 'document'
  content TEXT,
  icon TEXT DEFAULT '📄',
  color TEXT DEFAULT '#6E6E80',
  position INTEGER DEFAULT 0,
  section TEXT DEFAULT 'memory',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer la table table_columns pour les vues tableaux
CREATE TABLE IF NOT EXISTS table_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id UUID NOT NULL REFERENCES memory_nodes(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  column_type TEXT NOT NULL, -- 'text', 'select', 'boolean'
  column_options JSONB DEFAULT '{}',
  visible BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_memory_nodes_project_id ON memory_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_parent_id ON memory_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_section ON memory_nodes(section);
CREATE INDEX IF NOT EXISTS idx_table_columns_node_id ON table_columns(node_id);

-- Trigger pour updated_at automatique sur memory_nodes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_memory_nodes_updated_at
  BEFORE UPDATE ON memory_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();