-- Add description field to memory_categories
-- Permet d'ajouter une description optionnelle aux catégories (ex: "Tests related to business logic vulnerabilities")

ALTER TABLE memory_categories
ADD COLUMN IF NOT EXISTS description TEXT;

-- Comment
COMMENT ON COLUMN memory_categories.description IS 'Optional description explaining the purpose of this category';
