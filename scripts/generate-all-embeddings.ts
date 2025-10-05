/**
 * Script de migration : Générer embeddings pour tous les documents existants
 * Usage: npx tsx scripts/generate-all-embeddings.ts
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

async function generateAllEmbeddings() {
  try {
    console.log('🔍 Recherche des documents sans embeddings...')

    // Récupérer tous les documents sans embedding
    const { data: documents, error } = await supabase
      .from('memory_nodes')
      .select('id, name, content, project_id')
      .eq('type', 'document')
      .is('embedding', null)

    if (error) {
      console.error('❌ Erreur récupération documents:', error)
      return
    }

    if (!documents || documents.length === 0) {
      console.log('✅ Tous les documents ont déjà un embedding !')
      return
    }

    console.log(`📄 Trouvé ${documents.length} documents sans embedding\n`)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i]
      const progress = `[${i + 1}/${documents.length}]`

      try {
        console.log(`${progress} Génération embedding pour "${doc.name}"...`)

        // Créer le texte combiné (nom + contenu)
        const text = `${doc.name}\n${doc.content || ''}`

        // Générer embedding via OpenAI
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
          encoding_format: 'float'
        })

        const embedding = response.data[0].embedding

        // Sauvegarder dans Supabase
        const { error: updateError } = await supabase
          .from('memory_nodes')
          .update({ embedding })
          .eq('id', doc.id)

        if (updateError) {
          console.error(`  ❌ Erreur sauvegarde: ${updateError.message}`)
          errorCount++
        } else {
          console.log(`  ✅ Embedding sauvegardé (${embedding.length} dimensions)`)
          successCount++
        }

        // Rate limiting (3 requêtes/sec max)
        await new Promise(resolve => setTimeout(resolve, 350))

      } catch (err: any) {
        console.error(`  ❌ Erreur: ${err.message}`)
        errorCount++
      }
    }

    console.log('\n📊 RÉSUMÉ:')
    console.log(`  ✅ Succès: ${successCount}`)
    console.log(`  ❌ Erreurs: ${errorCount}`)
    console.log(`  📄 Total traité: ${documents.length}`)

  } catch (error) {
    console.error('❌ Erreur fatale:', error)
  }
}

// Exécution
generateAllEmbeddings()
  .then(() => {
    console.log('\n✨ Migration terminée !')
    process.exit(0)
  })
  .catch(err => {
    console.error('💥 Erreur:', err)
    process.exit(1)
  })
