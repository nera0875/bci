-- Fonction trigger pour mettre à jour automatiquement message_count
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