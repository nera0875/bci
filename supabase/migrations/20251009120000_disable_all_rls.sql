-- Désactivation complète de RLS sur toutes les tables
-- Cette migration peut être réversée plus tard en réactivant RLS table par table

-- Désactiver RLS sur toutes les tables du projet
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE attack_patterns DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE implicit_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE learned_patterns DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE memory_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE memory_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE memory_chunks_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE memory_facts DISABLE ROW LEVEL SECURITY;
ALTER TABLE memory_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE patterns DISABLE ROW LEVEL SECURITY;
ALTER TABLE pending_facts DISABLE ROW LEVEL SECURITY;
ALTER TABLE pentest_findings DISABLE ROW LEVEL SECURITY;
ALTER TABLE pentest_pipelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE pentest_targets DISABLE ROW LEVEL SECURITY;
ALTER TABLE pentest_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_context DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE rule_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_prompts DISABLE ROW LEVEL SECURITY;
ALTER TABLE table_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE tag_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_decisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities DISABLE ROW LEVEL SECURITY;

-- Note: Les policies existantes restent définies mais ne sont plus appliquées
-- Pour les supprimer complètement, il faudrait DROP POLICY sur chaque table
-- Mais cela n'est pas nécessaire car elles sont simplement désactivées

COMMENT ON TABLE api_keys IS 'RLS disabled - full access allowed';
COMMENT ON TABLE memory_categories IS 'RLS disabled - full access allowed';
