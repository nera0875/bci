-- Migration pour créer la table modular_items
-- Système modulaire pour le Board BCI

CREATE TABLE IF NOT EXISTS modular_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('folder', 'document')),
  section TEXT NOT NULL CHECK (section IN ('memory', 'rules', 'optimization')),
  parent_id UUID REFERENCES modular_items(id) ON DELETE CASCADE,
  icon TEXT,
  color TEXT,
  position INTEGER DEFAULT 1,
  data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_modular_items_project_id ON modular_items(project_id);
CREATE INDEX IF NOT EXISTS idx_modular_items_section ON modular_items(section);
CREATE INDEX IF NOT EXISTS idx_modular_items_parent_id ON modular_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_modular_items_position ON modular_items(position);

-- RLS (Row Level Security)
ALTER TABLE modular_items ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations (à ajuster selon vos besoins de sécurité)
CREATE POLICY "Allow all operations on modular_items" ON modular_items
  FOR ALL USING (true);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_modular_items_updated_at 
  BEFORE UPDATE ON modular_items 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insérer quelques données de test
INSERT INTO modular_items (project_id, name, type, section, icon, color, position, data) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Failed', 'folder', 'memory', '❌', '#ef4444', 1, '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'Success', 'folder', 'memory', '✅', '#22c55e', 2, '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'Custom Tests', 'folder', 'memory', '🔧', '#f59e0b', 3, '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'Règle French', 'document', 'rules', '🇫🇷', '#3b82f6', 1, '[{"id": "rule-1", "name": "Règle French", "type": "règle", "targetFolder": "Tous les dossiers", "trigger": "Commande /french", "action": "Organise les failles avec # devant", "priority": 1, "enabled": true, "created_at": "2024-01-01T00:00:00.000Z", "instructions": "# Règle French 🇫🇷\\n\\n## Déclencheur :\\nQuand l''utilisateur tape \"/french\"\\n\\n## Instructions pour l''IA :\\n• Organise toutes les failles avec # devant\\n• Range proprement dans les dossiers appropriés"}]'::jsonb),
  ('00000000-0000-0000-0000-000000000000', 'Règle Success', 'document', 'rules', '✅', '#22c55e', 2, '[{"id": "rule-2", "name": "Règle Success", "type": "règle", "targetFolder": "Dossier Success", "trigger": "Commande /success", "action": "Marque comme succès", "priority": 2, "enabled": true, "created_at": "2024-01-01T00:00:00.000Z", "instructions": "# Règle Success ✅\\n\\n## Déclencheur :\\nQuand l''utilisateur tape \"/success\"\\n\\n## Instructions pour l''IA :\\n• Marque les éléments comme réussis"}]'::jsonb);
