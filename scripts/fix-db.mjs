#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndFixDatabase() {
  console.log('🔧 Starting database fixes...\n')

  // Test 1: Check if message_cache table exists
  console.log('1️⃣ Checking message_cache table...')
  const { data: cacheData, error: cacheError } = await supabase
    .from('message_cache')
    .select('*')
    .limit(1)

  if (cacheError) {
    console.log('❌ message_cache table missing or inaccessible')
    console.log('   Error:', cacheError.message)
    console.log('   ➡️ Need to create table via Supabase SQL Editor\n')
  } else {
    console.log('✅ message_cache table exists\n')
  }

  // Test 2: Check conversation_id in chat_messages
  console.log('2️⃣ Checking conversation_id column in chat_messages...')
  const { data: msgData, error: msgError } = await supabase
    .from('chat_messages')
    .select('id, conversation_id')
    .limit(1)

  if (msgError && msgError.message.includes('conversation_id')) {
    console.log('❌ conversation_id column missing in chat_messages')
    console.log('   ➡️ Need to add column via SQL\n')
  } else {
    console.log('✅ conversation_id column exists\n')
  }

  // Test 3: Check and update conversation counts
  console.log('3️⃣ Checking conversation message counts...')
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, message_count, title')
    .order('created_at', { ascending: false })
    .limit(10)

  if (conversations) {
    console.log(`Found ${conversations.length} recent conversations:`)

    for (const conv of conversations) {
      // Count actual messages
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)

      const actualCount = count || 0

      if (conv.message_count !== actualCount) {
        console.log(`   ⚠️ ${conv.title}: shows ${conv.message_count} but has ${actualCount} messages`)

        // Fix the count
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ message_count: actualCount })
          .eq('id', conv.id)

        if (!updateError) {
          console.log(`      ✅ Fixed count to ${actualCount}`)
        } else {
          console.log(`      ❌ Failed to fix: ${updateError.message}`)
        }
      } else {
        console.log(`   ✅ ${conv.title}: ${conv.message_count} messages`)
      }
    }
  }

  // Test 4: Clean up empty old conversations
  console.log('\n4️⃣ Cleaning up old empty conversations...')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const { data: emptyConvs, error: emptyError } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .eq('message_count', 0)
    .lt('created_at', yesterday.toISOString())

  if (emptyConvs && emptyConvs.length > 0) {
    console.log(`   Found ${emptyConvs.length} empty conversations to clean:`)

    for (const conv of emptyConvs) {
      const { error: deleteError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conv.id)

      if (!deleteError) {
        console.log(`   🗑️ Deleted: ${conv.title}`)
      } else {
        console.log(`   ❌ Failed to delete ${conv.title}: ${deleteError.message}`)
      }
    }
  } else {
    console.log('   ✅ No old empty conversations to clean')
  }

  console.log('\n✨ Database check complete!\n')

  // Show SQL to run if needed
  if (cacheError) {
    console.log('📝 SQL to run in Supabase Dashboard:\n')
    console.log(`-- Create message_cache table
CREATE TABLE IF NOT EXISTS public.message_cache (
    content_hash varchar(64) PRIMARY KEY,
    response text NOT NULL,
    response_embedding vector(1536),
    usage_count integer DEFAULT 1,
    last_used timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_cache_last_used ON public.message_cache(last_used);
CREATE INDEX IF NOT EXISTS idx_message_cache_usage ON public.message_cache(usage_count);

-- Enable RLS
ALTER TABLE public.message_cache ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Enable all operations for authenticated users" ON public.message_cache
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.message_cache TO anon, authenticated;`)
  }
}

checkAndFixDatabase().catch(console.error)