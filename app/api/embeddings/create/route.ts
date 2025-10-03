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
 * POST /api/embeddings/create
 * Crée embedding pour un document mémoire
 *
 * Body: {
 *   nodeId: string
 *   content: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { nodeId, content } = await req.json()

    if (!nodeId || !content) {
      return NextResponse.json(
        { error: 'nodeId and content required' },
        { status: 400 }
      )
    }

    // Générer embedding via OpenAI
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
      encoding_format: 'float'
    })

    const embedding = response.data[0].embedding

    // Sauvegarder embedding dans memory_nodes
    const { error } = await supabase
      .from('memory_nodes')
      .update({ embedding })
      .eq('id', nodeId)

    if (error) {
      console.error('Error saving embedding:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      nodeId,
      dimensions: embedding.length
    })
  } catch (error) {
    console.error('Error creating embedding:', error)
    return NextResponse.json(
      { error: 'Failed to create embedding' },
      { status: 500 }
    )
  }
}
