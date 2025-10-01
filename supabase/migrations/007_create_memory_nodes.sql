-- Migration pour créer la table memory_nodes
-- Compatible avec l'API /api/memory/nodes

CREATE TABLE IF NOT EXISTS memory_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  parent_id UUID REFERENCES memory_nodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('folder', 'document')),
  section TEXT NOT NULL CHECK (section IN ('memory', 'rules', 'optimization')),
  content TEXT,
  view_mode TEXT DEFAULT 'tree',
  icon TEXT,
  color TEXT,
  position INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_memory_nodes_project_id ON memory_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_section ON memory_nodes(section);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_parent_id ON memory_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_position ON memory_nodes(position);

-- RLS (Row Level Security)
ALTER TABLE memory_nodes ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations (à ajuster selon vos besoins de sécurité)
CREATE POLICY "Allow all operations on memory_nodes" ON memory_nodes
  FOR ALL USING (true);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column_memory_nodes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_memory_nodes_updated_at
  BEFORE UPDATE ON memory_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column_memory_nodes();