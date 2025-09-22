-- Désactiver RLS pour toutes les tables (développement uniquement)
-- Exécuter dans l'éditeur SQL de Supabase

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE memory_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE attack_patterns DISABLE ROW LEVEL SECURITY;

-- Vérifier le statut RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';