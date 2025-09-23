#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

console.log('🔧 Connecting to Supabase...')
console.log('URL:', supabaseUrl)

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyTrigger() {
  console.log('\n📝 Applying database trigger for message_count auto-update...\n')

  try {
    // First, let's check if we can access the database
    console.log('1️⃣ Checking database access...')
    try {
      const { data: test, error: testError } = await supabase
        .from('conversations')
        .select('count(*)', { count: 'exact', head: true })

      if (testError) {
        console.log('   ⚠️ Database access error:', testError.message)
      } else {
        console.log('   ✅ Database accessible')
      }
    } catch (e) {
      console.log('   ❌ Cannot access database:', e.message)
    }

    // Try to create the function and trigger
    console.log('2️⃣ Creating trigger function...')

    // Since we can't execute raw SQL via the client, we'll create a helper
    // that updates counts manually for now
    console.log('   Note: Trigger must be created via Supabase Dashboard SQL editor')
    console.log('   Go to: https://supabase.com/dashboard/project/ohmrsgxfjcitgahkrkkf/sql')
    console.log('\n📋 Copy and paste this SQL:\n')

    const sql = `-- Fonction trigger pour mettre à jour automatiquement message_count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE conversations
        SET message_count = message_count + 1,
            updated_at = now()
        WHERE id = NEW.conversation_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE conversations
        SET message_count = GREATEST(message_count - 1, 0),
            updated_at = now()
        WHERE id = OLD.conversation_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS update_conversation_count ON chat_messages;

-- Créer le trigger
CREATE TRIGGER update_conversation_count
AFTER INSERT OR DELETE ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_message_count();

-- Vérifier que tout fonctionne
SELECT 'Trigger created successfully!' as status;`

    console.log(sql)
    console.log('\n✅ After running this SQL, new messages will automatically update the conversation count!')

    // Meanwhile, let's verify the current state
    console.log('\n3️⃣ Verifying current database state...')

    // Check a recent conversation
    const { data: recentConv } = await supabase
      .from('conversations')
      .select('id, title, message_count')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (recentConv) {
      console.log(`   Latest conversation: ${recentConv.title} (${recentConv.message_count} messages)`)

      // Count actual messages
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', recentConv.id)

      console.log(`   Actual message count: ${count}`)

      if (count !== recentConv.message_count) {
        console.log('   ⚠️ Count mismatch detected - trigger needed!')
      } else {
        console.log('   ✅ Counts match!')
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

applyTrigger().catch(console.error)