-- SCRIPT COMPLET POUR FAIRE FONCTIONNER SUPABASE
-- Exécuter TOUT ce script dans l'éditeur SQL de Supabase

-- 1. Désactiver RLS sur toutes les tables
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE memory_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE attack_patterns DISABLE ROW LEVEL SECURITY;

-- 2. Donner toutes les permissions à anon et authenticated
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 3. Donner les permissions spécifiques pour chaque table
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON memory_nodes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON vulnerabilities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON attack_patterns TO anon;

-- 4. S'assurer que les extensions sont activées
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 5. Créer une fonction pour bypasser toute authentification (DEV ONLY)
CREATE OR REPLACE FUNCTION public.allow_all()
RETURNS boolean AS $$
BEGIN
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Créer des politiques permissives si RLS est réactivé
DO $$
BEGIN
  -- Pour projects
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects') THEN
    DROP POLICY IF EXISTS "Allow all for projects" ON projects;
  END IF;

  -- Pour memory_nodes
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'memory_nodes') THEN
    DROP POLICY IF EXISTS "Allow all for memory_nodes" ON memory_nodes;
  END IF;

  -- Pour chat_messages
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages') THEN
    DROP POLICY IF EXISTS "Allow all for chat_messages" ON chat_messages;
  END IF;

  -- Pour rules
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rules') THEN
    DROP POLICY IF EXISTS "Allow all for rules" ON rules;
  END IF;

  -- Pour requests
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requests') THEN
    DROP POLICY IF EXISTS "Allow all for requests" ON requests;
  END IF;

  -- Pour vulnerabilities
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vulnerabilities') THEN
    DROP POLICY IF EXISTS "Allow all for vulnerabilities" ON vulnerabilities;
  END IF;

  -- Pour attack_patterns
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attack_patterns') THEN
    DROP POLICY IF EXISTS "Allow all for attack_patterns" ON attack_patterns;
  END IF;
END $$;

-- 7. Vérifier que tout est OK
SELECT
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 8. Vérifier les permissions
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, privilege_type;