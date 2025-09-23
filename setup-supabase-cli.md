# Configuration du CLI Supabase

## Étapes pour configurer le CLI

### 1. ✅ Installation réussie
```bash
supabase --version
# 2.45.5
```

### 2. Générer un Access Token

1. Aller sur : https://supabase.com/dashboard/account/tokens
2. Cliquer sur "Generate new token"
3. Donner un nom : "BCI-CLI"
4. Copier le token

### 3. Se connecter avec le token

```bash
supabase login --token YOUR_ACCESS_TOKEN
```

Ou définir la variable d'environnement :
```bash
export SUPABASE_ACCESS_TOKEN="your-token-here"
```

### 4. Lier le projet

```bash
# Lier au projet BCI (ID: ohmrsgxfjcitgahkrkkf)
supabase link --project-ref ohmrsgxfjcitgahkrkkf
```

### 5. Exécuter le SQL pour créer le trigger

```bash
# Une fois connecté et lié, exécuter :
supabase db execute -f scripts/create-trigger.sql
```

Ou directement :
```bash
supabase db execute --sql "
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS \$\$
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
\$\$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_count ON chat_messages;

CREATE TRIGGER update_conversation_count
AFTER INSERT OR DELETE ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_message_count();
"
```

## Token requis

Pour continuer l'automatisation, il faut :
1. Créer un token sur https://supabase.com/dashboard/account/tokens
2. L'ajouter dans `.env.local` :
   ```
   SUPABASE_ACCESS_TOKEN=your-token-here
   ```

## Alternative : Via le Dashboard

Si tu préfères, tu peux directement :
1. Aller sur : https://supabase.com/dashboard/project/ohmrsgxfjcitgahkrkkf/sql
2. Coller le SQL du fichier `scripts/create-trigger.sql`
3. Exécuter