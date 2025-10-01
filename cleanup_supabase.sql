-- Script de nettoyage pour Supabase
-- Exécuter ces requêtes dans le SQL Editor de Supabase ou via CLI

-- Purger message_cache contenant "26 ans"
DELETE FROM message_cache 
WHERE content ILIKE '%26 ans%';

-- Purger memory_nodes obsolètes ou contenant "26 ans"
DELETE FROM memory_nodes 
WHERE (content ILIKE '%26 ans%' 
   OR created_at < NOW() - INTERVAL '30 days')
AND project_id = 'VOTRE_PROJECT_ID_ICI';  -- Remplacer par le project_id actuel

-- Vérifier les suppressions
SELECT COUNT(*) FROM message_cache WHERE content ILIKE '%26 ans%';
SELECT COUNT(*) FROM memory_nodes WHERE content ILIKE '%26 ans%';

-- Flush cache général si nécessaire (optionnel)
-- DELETE FROM message_cache WHERE last_used < NOW() - INTERVAL '7 days';