-- Migration 012: Ajouter système rules + apprentissage
-- Améliore le Board avec rules naturelles et IA autonome

-- 1. Ajouter rules_text aux projets
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rules_text TEXT DEFAULT '';

-- 2. Ajouter metadata à memory_nodes (si pas déjà fait)
ALTER TABLE memory_nodes ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3. Table pour apprentissage IA
CREATE TABLE IF NOT EXISTS rule_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  ai_action TEXT NOT NULL,
  ai_reasoning TEXT,
  user_feedback TEXT CHECK (user_feedback IN ('correct', 'wrong', 'better_location')),
  suggested_rule TEXT,
  confidence FLOAT DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table pour patterns appris
CREATE TABLE IF NOT EXISTS learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pattern_text TEXT NOT NULL,
  target_location TEXT NOT NULL, -- "Memory/Auth/SQLi Tests"
  confidence FLOAT DEFAULT 0.5,
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_rule_feedback_project ON rule_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_project ON learned_patterns(project_id);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_confidence ON learned_patterns(confidence DESC);

-- RLS (Row Level Security)
ALTER TABLE rule_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;

-- Policies pour rule_feedback
CREATE POLICY "Users can manage their project feedback" ON rule_feedback
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Policies pour learned_patterns  
CREATE POLICY "Users can manage their project patterns" ON learned_patterns
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Fonction pour nettoyer les anciens patterns (performance)
CREATE OR REPLACE FUNCTION cleanup_old_patterns()
RETURNS void AS $$
BEGIN
  DELETE FROM learned_patterns 
  WHERE confidence < 0.2 
    AND last_used < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Commentaires pour documentation
COMMENT ON TABLE rule_feedback IS 'Stocke les retours utilisateur sur les actions IA pour apprentissage';
COMMENT ON TABLE learned_patterns IS 'Patterns appris pour améliorer le rangement automatique';
COMMENT ON COLUMN projects.rules_text IS 'Règles en langage naturel pour organisation automatique';