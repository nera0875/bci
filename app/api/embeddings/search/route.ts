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
 * POST /api/embeddings/search
 * Recherche documents similaires via embeddings
 *
 * Body: {
 *   projectId: string
 *   query: string
 *   limit?: number (default 5)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, query, limit = 5 } = await req.json()

    if (!projectId || !query) {
      return NextResponse.json(
        { error: 'projectId and query required' },
        { status: 400 }
      )
    }

    // Générer embedding de la query
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float'
    })

    const queryEmbedding = response.data[0].embedding

    // Recherche similarité via pgvector
    const { data, error } = await supabase.rpc('match_memory_nodes', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
      p_project_id: projectId
    })

    if (error) {
      console.error('Error searching embeddings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      results: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('Error searching embeddings:', error)
    return NextResponse.json(
      { error: 'Failed to search embeddings' },
      { status: 500 }
    )
  }
}
