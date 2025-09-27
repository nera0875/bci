-- Create unified system for memory + rules with table data
-- Extends existing memory_nodes to support table-like data

-- Add table_data for storing row-based data within folders
CREATE TABLE IF NOT EXISTS table_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    node_id UUID NOT NULL REFERENCES memory_nodes(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL DEFAULT 0,
    row_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add table_columns for dynamic column configuration
CREATE TABLE IF NOT EXISTS table_columns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    node_id UUID NOT NULL REFERENCES memory_nodes(id) ON DELETE CASCADE,
    column_name TEXT NOT NULL,
    column_type TEXT NOT NULL CHECK (column_type IN ('text', 'select', 'number', 'boolean', 'date', 'tags')),
    column_options JSONB DEFAULT '{}', -- For select options, validation rules, etc.
    visible BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_table_data_node_id ON table_data(node_id);
CREATE INDEX IF NOT EXISTS idx_table_data_row_index ON table_data(node_id, row_index);
CREATE INDEX IF NOT EXISTS idx_table_columns_node_id ON table_columns(node_id);
CREATE INDEX IF NOT EXISTS idx_table_columns_order ON table_columns(node_id, order_index);

-- Add RLS policies
ALTER TABLE table_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_columns ENABLE ROW LEVEL SECURITY;

-- Policies for table_data
CREATE POLICY "Users can access table_data for their projects" ON table_data
    FOR ALL USING (
        node_id IN (
            SELECT id FROM memory_nodes 
            WHERE project_id IN (
                SELECT id FROM projects WHERE user_id = auth.uid()
            )
        )
    );

-- Policies for table_columns  
CREATE POLICY "Users can access table_columns for their projects" ON table_columns
    FOR ALL USING (
        node_id IN (
            SELECT id FROM memory_nodes 
            WHERE project_id IN (
                SELECT id FROM projects WHERE user_id = auth.uid()
            )
        )
    );

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_table_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_table_data_updated_at
    BEFORE UPDATE ON table_data
    FOR EACH ROW
    EXECUTE FUNCTION update_table_data_updated_at();

-- Add view_mode to memory_nodes to distinguish between tree and table view
ALTER TABLE memory_nodes ADD COLUMN IF NOT EXISTS view_mode TEXT DEFAULT 'tree' CHECK (view_mode IN ('tree', 'table'));

-- Function to initialize default columns for a table node
CREATE OR REPLACE FUNCTION initialize_table_columns(node_id UUID, table_type TEXT DEFAULT 'general')
RETURNS VOID AS $$
BEGIN
    -- Default columns based on table type
    IF table_type = 'rules' THEN
        INSERT INTO table_columns (node_id, column_name, column_type, column_options, order_index) VALUES
        (node_id, 'name', 'text', '{"placeholder": "Nom de la règle"}', 1),
        (node_id, 'content', 'text', '{"placeholder": "Contenu de la règle", "multiline": true}', 2),
        (node_id, 'priority', 'select', '{"options": ["1 - Critique", "2 - Important", "3 - Utile"]}', 3),
        (node_id, 'enabled', 'boolean', '{"default": true}', 4);
    ELSIF table_type = 'requests' THEN
        INSERT INTO table_columns (node_id, column_name, column_type, column_options, order_index) VALUES
        (node_id, 'name', 'text', '{"placeholder": "Nom de la requête"}', 1),
        (node_id, 'method', 'select', '{"options": ["GET", "POST", "PUT", "DELETE", "PATCH"]}', 2),
        (node_id, 'url', 'text', '{"placeholder": "https://example.com/endpoint"}', 3),
        (node_id, 'status', 'select', '{"options": ["À tester", "Testé", "Vulnérable", "Sécurisé"]}', 4),
        (node_id, 'content', 'text', '{"multiline": true, "placeholder": "Headers, body, réponse..."}', 5);
    ELSIF table_type = 'vulnerabilities' THEN
        INSERT INTO table_columns (node_id, column_name, column_type, column_options, order_index) VALUES
        (node_id, 'name', 'text', '{"placeholder": "Nom de la faille"}', 1),
        (node_id, 'type', 'select', '{"options": ["XSS", "SQLi", "Business Logic", "CSRF", "IDOR", "Auth Bypass"]}', 2),
        (node_id, 'severity', 'select', '{"options": ["Critique", "Élevé", "Moyen", "Faible"]}', 3),
        (node_id, 'status', 'select', '{"options": ["Découverte", "Confirmée", "Reportée", "Corrigée"]}', 4),
        (node_id, 'content', 'text', '{"multiline": true, "placeholder": "Description, impact, reproduction..."}', 5);
    ELSE
        -- Default general table
        INSERT INTO table_columns (node_id, column_name, column_type, column_options, order_index) VALUES
        (node_id, 'name', 'text', '{"placeholder": "Nom"}', 1),
        (node_id, 'content', 'text', '{"multiline": true, "placeholder": "Contenu..."}', 2),
        (node_id, 'status', 'select', '{"options": ["Actif", "Inactif", "En cours"]}', 3);
    END IF;
END;
$$ LANGUAGE plpgsql;
