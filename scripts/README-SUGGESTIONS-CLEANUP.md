# Suggestions System - Auto Cleanup

## Overview

The suggestions system includes automatic cleanup mechanisms to prevent database clutter and maintain optimal performance. Rejected suggestions older than **7 days** are automatically cleaned up.

## Components

### 1. Database Function

**Location:** `supabase/migrations/20251007160000_add_suggestions_auto_cleanup.sql`

The migration creates:
- `cleanup_old_rejected_suggestions()` function
- Index on `suggestions_queue(status, created_at)` for performance
- Optional pg_cron job (requires Supabase Pro)

**Function signature:**
```sql
cleanup_old_rejected_suggestions()
RETURNS TABLE (
  deleted_count INTEGER,
  oldest_deleted TIMESTAMP WITH TIME ZONE,
  cleanup_timestamp TIMESTAMP WITH TIME ZONE
)
```

### 2. Manual Cleanup Script

**Location:** `scripts/cleanup-rejected-suggestions.ts`

**Usage:**
```bash
# Run directly
npx tsx scripts/cleanup-rejected-suggestions.ts

# Or add to package.json:
npm run cleanup:suggestions
```

**Environment variables required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Automatic Cleanup (Supabase Pro)

If you have **Supabase Pro** or higher with `pg_cron` extension enabled:

```sql
-- Enable automatic daily cleanup at 3 AM UTC
SELECT cron.schedule(
  'cleanup-rejected-suggestions',
  '0 3 * * *',
  $$SELECT cleanup_old_rejected_suggestions()$$
);
```

## Retention Policy

- **Pending suggestions:** Never deleted (must be manually accepted/rejected)
- **Accepted suggestions:** Never deleted (permanent history)
- **Rejected suggestions:** Deleted after **7 days**

## Manual Execution

### Via Supabase Dashboard

1. Go to SQL Editor in Supabase Dashboard
2. Run:
```sql
SELECT * FROM cleanup_old_rejected_suggestions();
```

### Via Script

```bash
npx tsx scripts/cleanup-rejected-suggestions.ts
```

### Expected Output

```
🧹 Starting cleanup of rejected suggestions older than 7 days...

✅ Cleanup completed successfully!

📊 Results:
   - Deleted: 12 suggestions
   - Oldest deleted: 2025-09-30 15:42:33.123+00
   - Cleanup timestamp: 2025-10-07 16:30:00.456+00

✨ Successfully cleaned up 12 old rejected suggestions!

✅ Script completed
```

## Monitoring

To check rejected suggestions age distribution:

```sql
SELECT
  CASE
    WHEN age < INTERVAL '1 day' THEN '< 1 day'
    WHEN age < INTERVAL '3 days' THEN '1-3 days'
    WHEN age < INTERVAL '7 days' THEN '3-7 days'
    ELSE '> 7 days (cleanup candidate)'
  END AS age_bucket,
  COUNT(*) as count
FROM (
  SELECT NOW() - created_at as age
  FROM suggestions_queue
  WHERE status = 'rejected'
) ages
GROUP BY age_bucket
ORDER BY age_bucket;
```

## Integration with Robust System

The cleanup mechanism is part of the overall robust suggestions system:

1. **Max 5 pending** - Hard limit prevents spam
2. **Confidence ≥ 0.75** - Quality threshold
3. **Deduplication** - Hash-based (48h cooldown)
4. **Auto-cleanup** - 7-day retention for rejected
5. **Business context** - Project-aware suggestions

## Troubleshooting

### Script fails with missing env vars
```bash
❌ Missing required environment variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
```
**Solution:** Create `.env.local` with required variables

### No suggestions deleted but expected cleanup
```sql
-- Check rejected suggestions
SELECT id, created_at, NOW() - created_at as age
FROM suggestions_queue
WHERE status = 'rejected'
ORDER BY created_at ASC
LIMIT 10;
```

### Function doesn't exist error
**Solution:** Re-apply migration:
```bash
npx supabase migration up
```

## Future Enhancements

- Weekly cleanup report via email
- Configurable retention period (env var)
- Cleanup analytics dashboard
- Archive rejected suggestions instead of deleting
