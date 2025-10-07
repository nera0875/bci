import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    // Get all facts without embeddings
    const { data: factsWithoutEmbedding } = await supabase
      .from('memory_facts')
      .select('id, fact')
      .eq('project_id', projectId)
      .is('embedding', null)

    if (!factsWithoutEmbedding || factsWithoutEmbedding.length === 0) {
      return NextResponse.json({ message: 'All facts have embeddings', updated: 0 })
    }

    let updated = 0
    for (const fact of factsWithoutEmbedding) {
      try {
        // Generate embedding
        const embeddingRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/openai/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: fact.fact, projectId })
        })

        if (!embeddingRes.ok) continue

        const { embedding } = await embeddingRes.json()

        // Update fact with embedding
        await supabase
          .from('memory_facts')
          .update({ embedding })
          .eq('id', fact.id)

        updated++
      } catch (err) {
        console.error('Failed to generate embedding for fact:', fact.id, err)
      }
    }

    return NextResponse.json({
      message: `${updated}/${factsWithoutEmbedding.length} embeddings generated`,
      updated
    })
  } catch (error: any) {
    console.error('Error regenerating embeddings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
