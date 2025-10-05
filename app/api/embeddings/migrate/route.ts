import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

/**
 * POST /api/embeddings/migrate
 * Génère les embeddings pour TOUS les documents existants sans embedding
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Démarrage migration embeddings...')

    // 1. Récupérer tous les documents sans embedding
    const { data: documents, error } = await supabase
      .from('memory_nodes')
      .select('id, name, content, project_id')
      .eq('type', 'document')
      .is('embedding', null)

    if (error) {
      console.error('❌ Erreur chargement documents:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        message: 'Tous les documents ont déjà des embeddings!',
        total: 0,
        success: 0,
        failed: 0
      })
    }

    console.log(`📄 Trouvé ${documents.length} document(s) sans embedding`)

    let success = 0
    let failed = 0
    const errors: string[] = []

    for (const doc of documents) {
      try {
        // Texte = nom + contenu (comme dans MemoryProV2.tsx)
        const text = `${doc.name}\n${doc.content || ''}`

        // Générer embedding via OpenAI
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
          encoding_format: 'float'
        })

        const embedding = response.data[0].embedding

        // Sauvegarder dans DB
        const { error: updateError } = await supabase
          .from('memory_nodes')
          .update({ embedding })
          .eq('id', doc.id)

        if (updateError) {
          console.error(`❌ [${doc.name}] Erreur sauvegarde:`, updateError.message)
          errors.push(`${doc.name}: ${updateError.message}`)
          failed++
        } else {
          console.log(`✅ [${doc.name}] Embedding généré`)
          success++
        }

        // Attendre 200ms entre chaque requête (rate limiting OpenAI)
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error: any) {
        console.error(`❌ [${doc.name}] Erreur génération:`, error.message)
        errors.push(`${doc.name}: ${error.message}`)
        failed++
      }
    }

    console.log('📊 Résumé:', { success, failed, total: documents.length })

    return NextResponse.json({
      message: 'Migration terminée',
      total: documents.length,
      success,
      failed,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('💥 Erreur fatale:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
