import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, projectId } = body

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Get API key from project or environment
    let apiKey = process.env.OPENAI_API_KEY

    if (projectId) {
      const supabase = createServerClient()
      const { data: project } = await supabase
        .from('projects')
        .select('api_keys')
        .eq('id', projectId)
        .single()

      if (project?.api_keys?.openai) {
        apiKey = project.api_keys.openai
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 401 })
    }

    const openai = new OpenAI({ apiKey })

    // Generate embedding
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })

    const embedding = response.data[0].embedding

    return NextResponse.json({ embedding })
  } catch (error) {
    console.error('Embedding error:', error)
    return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 })
  }
}