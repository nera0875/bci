import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase/client'

// Add CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, projectId } = body

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if embeddings are enabled globally via env
    const globalEnabled = process.env.ENABLE_EMBEDDINGS === 'true'

    // Check if embeddings are enabled for this project
    let projectEnabled = false
    if (projectId) {
      const { data: project } = await (supabase as any)
        .from('projects')
        .select('settings')
        .eq('id', projectId)
        .single()

      projectEnabled = project?.settings?.memorySearch?.embeddingsEnabled === true
    }

    const embeddingsEnabled = globalEnabled || projectEnabled

    if (!embeddingsEnabled) {
      console.log('⏭️ Embeddings disabled (global or project), returning null')
      return NextResponse.json(
        { embedding: null },
        { headers: corsHeaders }
      )
    }

    // Get API key from project or environment
    let apiKey = process.env.OPENAI_API_KEY

    if (projectId) {
      // Use existing supabase client
      const { data: project } = await (supabase as any)
        .from('projects')
        .select('api_keys')
        .eq('id', projectId)
        .single()

      if (project?.api_keys?.openai) {
        apiKey = project.api_keys.openai
      }
    }

    // If no API key found, use a mock embedding for development
    if (!apiKey) {
      console.warn('OpenAI API key not configured, returning mock embedding')
      // Generate a mock embedding (1536 dimensions for text-embedding-3-small)
      const mockEmbedding = Array.from({ length: 1536 }, () => Math.random() * 0.1 - 0.05)
      return NextResponse.json(
        { embedding: mockEmbedding },
        { headers: corsHeaders }
      )
    }

    const openai = new OpenAI({ apiKey })

    // Generate embedding
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })

    const embedding = response.data[0].embedding

    return NextResponse.json({ embedding }, { headers: corsHeaders })
  } catch (error) {
    console.error('Embedding error:', error)
    // Return mock embedding in case of error for development
    const mockEmbedding = Array.from({ length: 1536 }, () => Math.random() * 0.1 - 0.05)
    return NextResponse.json(
      { embedding: mockEmbedding },
      { headers: corsHeaders }
    )
  }
}