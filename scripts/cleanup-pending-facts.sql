-- Script pour nettoyer les pending_facts
-- À exécuter dans Supabase SQL Editor

-- 1. Voir combien de pending_facts existent
SELECT project_id, COUNT(*) as count, status
FROM pending_facts
GROUP BY project_id, status
ORDER BY count DESC;

-- 2. Supprimer TOUS les pending_facts (système désactivé)
-- ⚠️ ATTENTION: Cette action est irréversible
-- DELETE FROM pending_facts;

-- 3. Alternative: Supprimer uniquement ceux d'un projet spécifique
-- DELETE FROM pending_facts WHERE project_id = 'YOUR_PROJECT_ID';

-- 4. Alternative: Migrer les pending facts vers memory_facts (si tu veux les garder)
-- INSERT INTO memory_facts (project_id, fact, metadata, embedding)
-- SELECT
--   project_id,
--   fact,
--   metadata,
--   NULL as embedding  -- Les embeddings devront être régénérés
-- FROM pending_facts
-- WHERE status = 'pending';
--
-- DELETE FROM pending_facts;

-- ✅ RECOMMANDÉ: Supprimer tous car le système factExtractor est désactivé
DELETE FROM pending_facts;

SELECT 'pending_facts nettoyés ✅' as status;
