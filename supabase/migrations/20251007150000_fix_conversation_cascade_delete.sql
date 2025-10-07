-- Fix conversation cascade delete to prevent orphan messages
-- This ensures when a conversation is deleted, all its messages are automatically deleted

-- Drop existing foreign key constraint
ALTER TABLE chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_conversation_id_fkey;

-- Add new constraint with CASCADE DELETE
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_conversation_id_fkey
FOREIGN KEY (conversation_id)
REFERENCES conversations(id)
ON DELETE CASCADE;

-- Verify no orphan messages exist (cleanup)
DELETE FROM chat_messages
WHERE conversation_id IS NOT NULL
AND conversation_id NOT IN (SELECT id FROM conversations);

-- Add index on conversation_id for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id
ON chat_messages(conversation_id);

COMMENT ON CONSTRAINT chat_messages_conversation_id_fkey ON chat_messages
IS 'Cascade delete: when conversation is deleted, all messages are automatically removed';
