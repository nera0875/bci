-- Create simple_rules table for the simplified rules system
CREATE TABLE IF NOT EXISTS simple_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    folder_name TEXT NOT NULL, -- Nom du dossier ou "*" pour tous
    rule_text TEXT NOT NULL,   -- Instruction simple en français
    active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_simple_rules_project_id ON simple_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_simple_rules_folder_name ON simple_rules(folder_name);
CREATE INDEX IF NOT EXISTS idx_simple_rules_active ON simple_rules(active);
CREATE INDEX IF NOT EXISTS idx_simple_rules_priority ON simple_rules(priority);

-- Create composite index for efficient queries
CREATE INDEX IF NOT EXISTS idx_simple_rules_project_folder ON simple_rules(project_id, folder_name);

-- Add RLS (Row Level Security) policies
ALTER TABLE simple_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access simple_rules for their own projects
CREATE POLICY "Users can access simple_rules for their projects" ON simple_rules
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_simple_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_simple_rules_updated_at
    BEFORE UPDATE ON simple_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_simple_rules_updated_at();

-- Add some example rules for demonstration
INSERT INTO simple_rules (project_id, folder_name, rule_text, priority)
SELECT 
    p.id as project_id,
    'Documentation' as folder_name,
    'Toujours créer des fichiers .md avec des titres # bien structurés' as rule_text,
    1 as priority
FROM projects p
ON CONFLICT DO NOTHING;

INSERT INTO simple_rules (project_id, folder_name, rule_text, priority)
SELECT 
    p.id as project_id,
    'Sécurité' as folder_name,
    'Mettre # devant chaque faille trouvée pour bien les ranger' as rule_text,
    1 as priority
FROM projects p
ON CONFLICT DO NOTHING;

INSERT INTO simple_rules (project_id, folder_name, rule_text, priority)
SELECT 
    p.id as project_id,
    '*' as folder_name,
    'Demander confirmation avant de supprimer quoi que ce soit' as rule_text,
    2 as priority
FROM projects p
ON CONFLICT DO NOTHING;
