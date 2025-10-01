-- Migration pour corriger la contrainte de type dans memory_nodes
-- Permet maintenant les types 'folder', 'document' et 'table'

-- Supprimer l'ancienne contrainte
ALTER TABLE memory_nodes DROP CONSTRAINT IF EXISTS memory_nodes_type_check;

-- Ajouter la nouvelle contrainte avec le type 'table'
ALTER TABLE memory_nodes ADD CONSTRAINT memory_nodes_type_check 
  CHECK (type IN ('folder', 'document', 'table'));