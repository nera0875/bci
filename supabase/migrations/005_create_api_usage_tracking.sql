-- Create api_usage table for cost tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    input_cost DECIMAL(10,6) NOT NULL DEFAULT 0,
    output_cost DECIMAL(10,6) NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,6) GENERATED ALWAYS AS (input_cost + output_cost) STORED,
    cache_savings DECIMAL(10,6) NOT NULL DEFAULT 0,
    request_type TEXT DEFAULT 'chat',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_project_id ON api_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_conversation_id ON api_usage(conversation_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_model ON api_usage(model_name);

-- Create composite indexes for analytics
CREATE INDEX IF NOT EXISTS idx_api_usage_project_date ON api_usage(project_id, DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_api_usage_conversation_date ON api_usage(conversation_id, DATE(created_at));

-- Add RLS policies
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access api_usage for their own projects
CREATE POLICY "Users can access api_usage for their projects" ON api_usage
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

-- Create function to calculate costs based on model pricing
CREATE OR REPLACE FUNCTION calculate_api_cost(
    model_name TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER
) RETURNS TABLE(input_cost DECIMAL, output_cost DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE model_name
            WHEN 'claude-3-5-sonnet-20241022' THEN input_tokens * 0.000003::DECIMAL  -- $3/1M tokens
            WHEN 'claude-3-5-haiku-20241022' THEN input_tokens * 0.000001::DECIMAL   -- $1/1M tokens
            WHEN 'gpt-4o' THEN input_tokens * 0.0000025::DECIMAL                     -- $2.5/1M tokens
            WHEN 'gpt-4o-mini' THEN input_tokens * 0.00000015::DECIMAL               -- $0.15/1M tokens
            ELSE input_tokens * 0.000003::DECIMAL  -- Default to Claude pricing
        END as input_cost,
        CASE model_name
            WHEN 'claude-3-5-sonnet-20241022' THEN output_tokens * 0.000015::DECIMAL -- $15/1M tokens
            WHEN 'claude-3-5-haiku-20241022' THEN output_tokens * 0.000005::DECIMAL  -- $5/1M tokens
            WHEN 'gpt-4o' THEN output_tokens * 0.00001::DECIMAL                      -- $10/1M tokens
            WHEN 'gpt-4o-mini' THEN output_tokens * 0.0000006::DECIMAL               -- $0.6/1M tokens
            ELSE output_tokens * 0.000015::DECIMAL  -- Default to Claude pricing
        END as output_cost;
END;
$$ LANGUAGE plpgsql;

-- Create view for daily cost summary
CREATE OR REPLACE VIEW daily_cost_summary AS
SELECT 
    project_id,
    DATE(created_at) as date,
    COUNT(*) as total_requests,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    SUM(cached_tokens) as total_cached_tokens,
    SUM(total_cost) as total_cost,
    SUM(cache_savings) as total_cache_savings,
    ROUND((SUM(cache_savings) / NULLIF(SUM(total_cost) + SUM(cache_savings), 0) * 100)::NUMERIC, 2) as cache_efficiency_percent
FROM api_usage
GROUP BY project_id, DATE(created_at)
ORDER BY date DESC;

-- Create view for conversation cost summary  
CREATE OR REPLACE VIEW conversation_cost_summary AS
SELECT 
    conversation_id,
    project_id,
    COUNT(*) as total_requests,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    SUM(cached_tokens) as total_cached_tokens,
    SUM(total_cost) as total_cost,
    SUM(cache_savings) as total_cache_savings,
    MIN(created_at) as first_request,
    MAX(created_at) as last_request
FROM api_usage
WHERE conversation_id IS NOT NULL
GROUP BY conversation_id, project_id
ORDER BY last_request DESC;
