import { NextRequest, NextResponse } from 'next/server'
import { SupabaseApiKeyService } from '@/lib/services/apiKeyService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, user_id, agent_id, limit = 10, filters } = body

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
    const response = await fetch('https://api.mem0.ai/v1/memories/search/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mem0Key.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        user_id,
        agent_id,
        limit,
        filters
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Mem0 API error:', error)
      return NextResponse.json(
        { error: 'Failed to search memories' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Search memory error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}