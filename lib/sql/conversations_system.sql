-- Table pour les conversations/sessions
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255),
  summary TEXT, -- Résumé auto-généré de la conversation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Table pour stocker TOUS les messages avec déduplication
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role VARCHAR(20) CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  content_hash VARCHAR(64), -- SHA256 pour déduplication
  embedding vector(1536), -- Pour la recherche par similarité
  metadata JSONB, -- Stocke les actions mémoire, contexte, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  token_count INTEGER,

  -- Index unique pour éviter les doublons exacts
  UNIQUE(conversation_id, content_hash)
);

-- Table de cache pour les messages identiques (économie de tokens)
CREATE TABLE IF NOT EXISTS message_cache (
  content_hash VARCHAR(64) PRIMARY KEY,
  response TEXT,
  response_embedding vector(1536),
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_embedding ON messages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_messages_hash ON messages(content_hash);
CREATE INDEX idx_conversations_project ON conversations(project_id, is_active);

-- Fonction pour chercher les messages similaires
CREATE OR REPLACE FUNCTION search_similar_messages(
  query_embedding vector(1536),
  project_uuid UUID,
  similarity_threshold FLOAT DEFAULT 0.7,
  limit_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  role VARCHAR(20),
  similarity FLOAT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.role,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.created_at
  FROM messages m
  WHERE m.project_id = project_uuid
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > similarity_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();