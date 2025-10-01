-- Migration pour créer la table table_data manquante
-- Cette table stocke les données des lignes dans les documents

CREATE TABLE IF NOT EXISTS table_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES memory_nodes(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL DEFAULT 0,
  row_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_table_data_node_id ON table_data(node_id);
