/**
 * Cleanup Rejected Suggestions Script
 *
 * Removes rejected suggestions older than 7 days from the database.
 * Part of the robust suggestions system to prevent clutter.
 *
 * Usage:
 *   npx tsx scripts/cleanup-rejected-suggestions.ts
 *
 * Or add to package.json:
 *   "scripts": {
 *     "cleanup:suggestions": "tsx scripts/cleanup-rejected-suggestions.ts"
 *   }
 */

import { createClient } from '@supabase/supabase-js'

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupRejectedSuggestions() {
  console.log('🧹 Starting cleanup of rejected suggestions older than 7 days...\n')

  try {
    // Call the cleanup function
    const { data, error } = await supabase.rpc('cleanup_old_rejected_suggestions')

    if (error) {
      console.error('❌ Error during cleanup:', error)
      process.exit(1)
    }

    const result = data && data.length > 0 ? data[0] : null

    if (!result) {
      console.log('⚠️  No data returned from cleanup function')
      return
    }

    console.log('✅ Cleanup completed successfully!\n')
    console.log('📊 Results:')
    console.log(`   - Deleted: ${result.deleted_count} suggestions`)
    console.log(`   - Oldest deleted: ${result.oldest_deleted || 'None'}`)
    console.log(`   - Cleanup timestamp: ${result.cleanup_timestamp}`)

    if (result.deleted_count === 0) {
      console.log('\n💡 No suggestions to clean up. All rejected suggestions are less than 7 days old.')
    } else {
      console.log(`\n✨ Successfully cleaned up ${result.deleted_count} old rejected suggestions!`)
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

// Run cleanup
cleanupRejectedSuggestions()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ Script failed:', err)
    process.exit(1)
  })
