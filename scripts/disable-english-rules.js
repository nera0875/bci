const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://irgyhtvkgqwsgbgobqjj.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variables d\'environnement manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function disableEnglishRules() {
  // Récupérer les règles qui forcent l'anglais
  const { data: rules, error: fetchError } = await supabase
    .from('rules')
    .select('*')
    .or('action.eq.always_respond_in_english,trigger.ilike.%english%,description.ilike.%english%,description.ilike.%anglais%')

  if (fetchError) {
    console.error('Erreur lors de la récupération des règles:', fetchError)
    return
  }

  console.log(`Trouvé ${rules.length} règles liées à l'anglais`)

  // Désactiver chaque règle
  for (const rule of rules) {
    console.log(`Désactivation de la règle: ${rule.name}`)
    const { error } = await supabase
      .from('rules')
      .update({ enabled: false })
      .eq('id', rule.id)

    if (error) {
      console.error(`Erreur lors de la désactivation de ${rule.name}:`, error)
    } else {
      console.log(`✅ Règle "${rule.name}" désactivée`)
    }
  }

  console.log('Terminé!')
}

disableEnglishRules()