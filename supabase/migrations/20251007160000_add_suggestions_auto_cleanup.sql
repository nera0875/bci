-- Auto-cleanup for rejected suggestions older than 7 days
-- Part of robust suggestions system to prevent clutter

-- Function to cleanup old rejected suggestions
CREATE OR REPLACE FUNCTION cleanup_old_rejected_suggestions()
RETURNS TABLE (
  deleted_count INTEGER,
  oldest_deleted TIMESTAMP WITH TIME ZONE,
  cleanup_timestamp TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_deleted_count INTEGER;
  v_oldest_deleted TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the oldest date before deletion
  SELECT MIN(created_at) INTO v_oldest_deleted
  FROM suggestions_queue
  WHERE status = 'rejected'
    AND created_at < NOW() - INTERVAL '7 days';

  -- Delete rejected suggestions older than 7 days
  WITH deleted AS (
    DELETE FROM suggestions_queue
    WHERE status = 'rejected'
      AND created_at < NOW() - INTERVAL '7 days'
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  -- Return results
  RETURN QUERY
  SELECT
    v_deleted_count,
    v_oldest_deleted,
    NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION cleanup_old_rejected_suggestions IS
'Deletes rejected suggestions older than 7 days to prevent database clutter. Returns count of deleted rows.';

-- Optional: Enable pg_cron extension if available (requires Supabase Pro or higher)
-- This will run the cleanup daily at 3 AM UTC
-- Uncomment if you have pg_cron enabled:
/*
SELECT cron.schedule(
  'cleanup-rejected-suggestions',  -- Job name
  '0 3 * * *',                      -- Daily at 3 AM UTC
  $$SELECT cleanup_old_rejected_suggestions()$$
);
*/

-- Create an index to speed up cleanup queries
CREATE INDEX IF NOT EXISTS idx_suggestions_status_created
ON suggestions_queue (status, created_at)
WHERE status = 'rejected';

-- Manual cleanup function (one-time use)
-- Run this to immediately clean up old rejected suggestions:
-- SELECT * FROM cleanup_old_rejected_suggestions();
