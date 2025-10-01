-- Migration pour créer la table table_data manquante
-- Cette table stocke les données des lignes dans les documents

CREATE TABLE IF NOT EXISTS table_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES memory_nodes(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_table_data_node_id ON table_data(node_id);

-- RLS (Row Level Security)
ALTER TABLE table_data ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations
CREATE POLICY "Allow all operations on table_data" ON table_data
  FOR ALL USING (true);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column_table_data()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_table_data_updated_at
  BEFORE UPDATE ON table_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column_table_data();

-- Commentaire pour documentation
COMMENT ON TABLE table_data IS 'Stocke les données des lignes dans les documents du système modulaire';
