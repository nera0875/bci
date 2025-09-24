import { NextRequest, NextResponse } from 'next/server'
import { SupabaseApiKeyService } from '@/lib/services/apiKeyService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received body:', body)
    const { messages, user_id, agent_id, metadata, categories, filters } = body

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages:', messages)
      return NextResponse.json(
        { error: 'Messages are required and must be a non-empty array' },
        { status: 400 }
      )
    }

    // Get Mem0 API key from Supabase
    const apiKeyService = new SupabaseApiKeyService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const mem0Key = await apiKeyService.get('mem0')
    if (!mem0Key || !mem0Key.api_key) {
      return NextResponse.json(
        { error: 'Mem0 API key not configured' },
        { status: 401 }
      )
    }

    // Call Mem0 API
    const response = await fetch('https://api.mem0.ai/v1/memories/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${mem0Key.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages,
        user_id,
        agent_id,
        metadata: {
          ...metadata,
          categories: categories || []
        },
        filters
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Mem0 API error:', response.status, error)
      console.error('Request payload was:', JSON.stringify({
        messages,
        user_id,
        agent_id,
        metadata: {
          ...metadata,
          categories: categories || []
        },
        filters
      }, null, 2))
      return NextResponse.json(
        { error: 'Failed to add memory', details: error },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Add memory error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}