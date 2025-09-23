#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!')
  process.exit(1)
}

console.log('🔧 Connecting to Supabase...')
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

// SQL pour créer le trigger
const triggerSQL = `
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
`

async function executeTrigger() {
  console.log('\n📝 Tentative d\'exécution du trigger SQL...\n')

  // Malheureusement, Supabase JS client ne peut pas exécuter de DDL directement
  // On doit utiliser une autre méthode

  console.log('❌ Le client Supabase JS ne peut pas exécuter de DDL (CREATE FUNCTION/TRIGGER)')
  console.log('\n📋 Voici 3 méthodes pour appliquer le trigger :\n')

  console.log('### Méthode 1: Via le Dashboard Supabase (RECOMMANDÉ)')
  console.log('1. Aller sur : https://supabase.com/dashboard/project/clcpszhztwfhnvirexao/sql')
  console.log('2. Coller le SQL suivant :')
  console.log('```sql')
  console.log(triggerSQL)
  console.log('```')
  console.log('3. Cliquer sur "Run"\n')

  console.log('### Méthode 2: Via psql (si installé)')
  console.log('```bash')
  console.log('export DATABASE_URL="postgresql://postgres.[project-ref]:password@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"')
  console.log('psql $DATABASE_URL -f scripts/create-trigger.sql')
  console.log('```\n')

  console.log('### Méthode 3: Via l\'API Supabase (nécessite Service Role Key)')
  console.log('Si tu as la Service Role Key, on peut utiliser l\'API admin pour exécuter le SQL.\n')

  // Vérifier l'état actuel
  console.log('📊 Vérification de l\'état actuel...')

  const { data: testConv } = await supabase
    .from('conversations')
    .select('id, title, message_count')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (testConv) {
    console.log(`✅ Dernière conversation : ${testConv.title} (${testConv.message_count} messages)`)

    // Tester en ajoutant un message
    console.log('\n🧪 Test : ajout d\'un message de test...')

    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        project_id: 'test-project-id',
        conversation_id: testConv.id,
        role: 'user',
        content: 'Message de test pour vérifier le trigger'
      })

    if (!insertError) {
      // Vérifier si le count a changé
      const { data: updatedConv } = await supabase
        .from('conversations')
        .select('message_count')
        .eq('id', testConv.id)
        .single()

      if (updatedConv && updatedConv.message_count > testConv.message_count) {
        console.log('✅ Le trigger fonctionne déjà ! Le compteur est passé de', testConv.message_count, 'à', updatedConv.message_count)
      } else {
        console.log('⚠️ Le trigger n\'est pas encore actif. Le compteur n\'a pas changé.')
        console.log('   Applique le SQL via une des méthodes ci-dessus.')
      }

      // Nettoyer le message de test
      await supabase
        .from('chat_messages')
        .delete()
        .eq('content', 'Message de test pour vérifier le trigger')
        .eq('conversation_id', testConv.id)
    }
  }
}

executeTrigger().catch(console.error)