-- Migration pour ajouter la colonne section manquante à memory_nodes
-- Cette colonne est requise par l'API /api/memory/nodes

-- Ajouter la colonne section avec une valeur par défaut
ALTER TABLE memory_nodes ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT 'memory';

-- Ajouter une contrainte pour valider les valeurs de section
ALTER TABLE memory_nodes DROP CONSTRAINT IF EXISTS memory_nodes_section_check;
ALTER TABLE memory_nodes ADD CONSTRAINT memory_nodes_section_check 
  CHECK (section IN ('memory', 'rules', 'optimization'));

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_memory_nodes_section ON memory_nodes(section);

-- Mettre à jour les enregistrements existants selon leur nom/type
UPDATE memory_nodes SET section = CASE 
  WHEN name ILIKE '%règle%' OR name ILIKE '%rule%' THEN 'rules'
  WHEN name ILIKE '%optim%' OR name ILIKE '%perf%' OR name ILIKE '%performance%' THEN 'optimization'
  ELSE 'memory'
END WHERE section = 'memory';

-- Commentaire pour documentation
COMMENT ON COLUMN memory_nodes.section IS 'Section du nœud: memory, rules, ou optimization';
