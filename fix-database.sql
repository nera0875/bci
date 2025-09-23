-- Fix 1: Create message_cache table if not exists
CREATE TABLE IF NOT EXISTS public.message_cache (
    content_hash varchar(64) PRIMARY KEY,
    response text NOT NULL,
    response_embedding vector(1536),
    usage_count integer DEFAULT 1,
    last_used timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_message_cache_last_used ON public.message_cache(last_used);
CREATE INDEX IF NOT EXISTS idx_message_cache_usage ON public.message_cache(usage_count);

-- Fix 2: Add conversation_id to chat_messages if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='chat_messages'
                   AND column_name='conversation_id')
    THEN
        ALTER TABLE public.chat_messages
        ADD COLUMN conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Fix 3: Create trigger to update message_count in conversations table
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

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_conversation_count ON chat_messages;

-- Create trigger
CREATE TRIGGER update_conversation_count
AFTER INSERT OR DELETE ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_message_count();

-- Fix 4: Update existing conversation counts (one-time fix)
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

-- Fix 5: Enable RLS on message_cache
ALTER TABLE public.message_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for message_cache
CREATE POLICY "Enable all operations for authenticated users" ON public.message_cache
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Fix 6: Grant permissions
GRANT ALL ON public.message_cache TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Fix 7: Create index for conversation_id on chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);

-- Fix 8: Clean up orphaned conversations with 0 messages older than 1 day
DELETE FROM conversations
WHERE message_count = 0
AND created_at < now() - interval '1 day';