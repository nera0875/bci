-- Migration: Create test_results table for Test Matrix
-- Date: 2025-10-05
-- Description: Track testing coverage (Endpoints × Techniques)

-- 1. Create table
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Test identification
  endpoint TEXT NOT NULL,
  technique TEXT NOT NULL,

  -- Test status
  status TEXT CHECK (status IN ('not_tested', 'testing', 'success', 'failed')) DEFAULT 'not_tested',

  -- Test details
  result JSONB DEFAULT '{
    "payload": null,
    "response": null,
    "severity": null,
    "notes": null,
    "http_method": null,
    "http_status": null,
    "vulnerability_confirmed": false
  }'::jsonb,

  -- Timestamps
  tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_results_project ON test_results(project_id);
CREATE INDEX IF NOT EXISTS idx_test_results_endpoint ON test_results(endpoint);
CREATE INDEX IF NOT EXISTS idx_test_results_technique ON test_results(technique);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
CREATE INDEX IF NOT EXISTS idx_test_results_endpoint_technique ON test_results(project_id, endpoint, technique);

-- 3. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_test_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER test_results_updated_at
  BEFORE UPDATE ON test_results
  FOR EACH ROW
  EXECUTE FUNCTION update_test_results_updated_at();

-- 4. Enable RLS (Row Level Security)
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (no auth for now - same as other tables)
CREATE POLICY "Anyone can view test results"
  ON test_results FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert test results"
  ON test_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update test results"
  ON test_results FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete test results"
  ON test_results FOR DELETE
  USING (true);

-- 6. Create helper function to get matrix stats
CREATE OR REPLACE FUNCTION get_test_matrix_stats(filter_project_id UUID)
RETURNS TABLE (
  total_tests BIGINT,
  tested BIGINT,
  success BIGINT,
  failed BIGINT,
  testing BIGINT,
  not_tested BIGINT,
  coverage_percent NUMERIC
) LANGUAGE SQL STABLE AS $$
  SELECT
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE status != 'not_tested') as tested,
    COUNT(*) FILTER (WHERE status = 'success') as success,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status = 'testing') as testing,
    COUNT(*) FILTER (WHERE status = 'not_tested') as not_tested,
    ROUND(
      (COUNT(*) FILTER (WHERE status != 'not_tested')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as coverage_percent
  FROM test_results
  WHERE project_id = filter_project_id;
$$;

-- 7. Comment table
COMMENT ON TABLE test_results IS 'Tracks testing coverage for Test Matrix (Endpoints × Techniques)';
COMMENT ON COLUMN test_results.endpoint IS 'API endpoint or URL path tested';
COMMENT ON COLUMN test_results.technique IS 'Attack technique used (SQLi, IDOR, XSS, etc.)';
COMMENT ON COLUMN test_results.status IS 'Test status: not_tested, testing, success, failed';
COMMENT ON COLUMN test_results.result IS 'Detailed test result with payload, response, severity';
