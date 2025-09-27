-- Create folder_rules table for linking rules to specific folders
CREATE TABLE IF NOT EXISTS folder_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    folder_id UUID NOT NULL REFERENCES memory_nodes(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    rule_type TEXT DEFAULT 'behavior' CHECK (rule_type IN ('behavior', 'validation', 'formatting', 'security')),
    rule_content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_folder_rules_project_id ON folder_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_folder_rules_folder_id ON folder_rules(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_rules_active ON folder_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_folder_rules_priority ON folder_rules(priority);

-- Create composite index for efficient queries
CREATE INDEX IF NOT EXISTS idx_folder_rules_project_folder ON folder_rules(project_id, folder_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE folder_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access folder_rules for their own projects
CREATE POLICY "Users can access folder_rules for their projects" ON folder_rules
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_folder_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_folder_rules_updated_at
    BEFORE UPDATE ON folder_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_rules_updated_at();

-- Add some example folder rules for demonstration
INSERT INTO folder_rules (project_id, folder_id, rule_name, rule_description, rule_type, rule_content, priority)
SELECT 
    p.id as project_id,
    mn.id as folder_id,
    'Respect Folder Context' as rule_name,
    'L''IA doit respecter le contexte et le thème de ce dossier lors de toute modification' as rule_description,
    'behavior' as rule_type,
    'Toujours maintenir la cohérence thématique du dossier. Adapter le style et le ton selon le contenu existant.' as rule_content,
    1 as priority
FROM projects p
CROSS JOIN memory_nodes mn
WHERE mn.type = 'folder' 
AND mn.project_id = p.id
ON CONFLICT DO NOTHING;
