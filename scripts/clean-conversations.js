// Script pour nettoyer les conversations bugguées dans Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://clcpszhztwfhnvirexao.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsY3BzemhqdHdmaG52aXJleGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcxNDIyNjgsImV4cCI6MjA1MjcxODI2OH0.YEyfJKD5rKcQXVjNWJy5qj_u8haBqL1o3qxPn3qDqJo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanBuggedConversations() {
  console.log('🧹 Nettoyage des conversations bugguées...')

  // 1. Supprimer les conversations sans messages
  const { data: emptyConvs } = await supabase
    .from('conversations')
    .select('id, title, message_count')
    .eq('message_count', 0)

  if (emptyConvs && emptyConvs.length > 0) {
    console.log(`Trouvé ${emptyConvs.length} conversations vides`)

    for (const conv of emptyConvs) {
      await supabase
        .from('conversations')
        .update({ is_active: false })
        .eq('id', conv.id)
      console.log(`- Désactivé: ${conv.title}`)
    }
  }

  // 2. Supprimer les conversations avec des dates futures
  const now = new Date()
  const { data: futureConvs } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .gt('created_at', now.toISOString())

  if (futureConvs && futureConvs.length > 0) {
    console.log(`Trouvé ${futureConvs.length} conversations avec dates futures`)

    for (const conv of futureConvs) {
      await supabase
        .from('conversations')
        .update({ is_active: false })
        .eq('id', conv.id)
      console.log(`- Désactivé: ${conv.title}`)
    }
  }

  // 3. Supprimer les conversations dupliquées du même jour
  const { data: allConvs } = await supabase
    .from('conversations')
    .select('id, title, created_at, message_count')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (allConvs) {
    const titleGroups = {}

    allConvs.forEach(conv => {
      if (!titleGroups[conv.title]) {
        titleGroups[conv.title] = []
      }
      titleGroups[conv.title].push(conv)
    })

    // Pour chaque groupe de titres identiques, garder seulement celui avec des messages
    Object.keys(titleGroups).forEach(async (title) => {
      const convs = titleGroups[title]
      if (convs.length > 1) {
        console.log(`Trouvé ${convs.length} conversations avec titre: ${title}`)

        // Trier par nombre de messages (décroissant)
        convs.sort((a, b) => b.message_count - a.message_count)

        // Désactiver toutes sauf la première (celle avec le plus de messages)
        for (let i = 1; i < convs.length; i++) {
          await supabase
            .from('conversations')
            .update({ is_active: false })
            .eq('id', convs[i].id)
          console.log(`  - Désactivé doublon: ${convs[i].id}`)
        }
      }
    })
  }

  console.log('✅ Nettoyage terminé!')
}

// Exécuter le nettoyage
cleanBuggedConversations().catch(console.error)