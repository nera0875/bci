import { createClient } from '@supabase/supabase-js'

// Replace with your actual Supabase URL and anon key
const supabaseUrl = 'https://ohmrsgxfjcitgahkrkkf.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function applyFixes() {
  console.log('Starting database fixes...')

  try {
    // Fix 1: Create message_cache table
    console.log('Creating message_cache table...')
    const { error: cacheError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.message_cache (
          content_hash varchar(64) PRIMARY KEY,
          response text NOT NULL,
          response_embedding vector(1536),
          usage_count integer DEFAULT 1,
          last_used timestamp with time zone DEFAULT now(),
          created_at timestamp with time zone DEFAULT now()
        );
      `
    })
    if (cacheError) console.error('Cache table error:', cacheError)

    // Fix 2: Add indexes
    console.log('Adding indexes...')
    await supabase.rpc('exec_sql', {
      query: `
        CREATE INDEX IF NOT EXISTS idx_message_cache_last_used ON public.message_cache(last_used);
        CREATE INDEX IF NOT EXISTS idx_message_cache_usage ON public.message_cache(usage_count);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
      `
    })

    // Fix 3: Create trigger function
    console.log('Creating trigger function...')
    await supabase.rpc('exec_sql', {
      query: `
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
      `
    })

    // Fix 4: Create trigger
    console.log('Creating trigger...')
    await supabase.rpc('exec_sql', {
      query: `
        DROP TRIGGER IF EXISTS update_conversation_count ON chat_messages;
        CREATE TRIGGER update_conversation_count
        AFTER INSERT OR DELETE ON chat_messages
        FOR EACH ROW
        EXECUTE FUNCTION update_conversation_message_count();
      `
    })

    // Fix 5: Update existing counts
    console.log('Updating existing conversation counts...')
    await supabase.rpc('exec_sql', {
      query: `
        UPDATE conversations c
        SET message_count = (
          SELECT COUNT(*)
          FROM chat_messages m
          WHERE m.conversation_id = c.id
        )
        WHERE c.message_count = 0
        AND EXISTS (
          SELECT 1 FROM chat_messages m WHERE m.conversation_id = c.id
        );
      `
    })

    // Fix 6: Clean orphaned conversations
    console.log('Cleaning orphaned conversations...')
    await supabase.rpc('exec_sql', {
      query: `
        DELETE FROM conversations
        WHERE message_count = 0
        AND created_at < now() - interval '1 day';
      `
    })

    console.log('Database fixes completed!')
  } catch (error) {
    console.error('Error applying fixes:', error)
  }
}

applyFixes()