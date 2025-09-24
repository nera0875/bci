import { NextRequest, NextResponse } from 'next/server'
import { SupabaseApiKeyService } from '@/lib/services/apiKeyService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const agent_id = searchParams.get('agent_id')
    const limit = searchParams.get('limit') || '100'
    const page = searchParams.get('page') || '1'

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

    // Build query params
    const params = new URLSearchParams()
    if (user_id) params.append('user_id', user_id)
    if (agent_id) params.append('agent_id', agent_id)
    params.append('limit', limit)
    params.append('page', page)

    // Call Mem0 API
    const response = await fetch(`https://api.mem0.ai/v1/memories/?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${mem0Key.api_key}`
      }
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Mem0 API error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch memories' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Get all memories error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filters, page = 1, page_size = 100 } = body

    // Get Mem0 API key from Supabase
    const apiKeyService = new SupabaseApiKeyService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const mem0Key = await apiKeyService.get('mem0')
    if (!mem0Key || !mem0Key.api_key) {
      return NextResponse.json(
        { error: 'Mem0 API key not configured', results: [], memories: [] },
        { status: 200 }
      )
    }

    // Build query params for Mem0 API
    const params = new URLSearchParams()

    // Handle filters if provided
    if (filters?.OR) {
      // If there's an OR filter with user_id and agent_id, get both
      for (const filter of filters.OR) {
        if (filter.user_id) params.append('user_id', filter.user_id)
        if (filter.agent_id) params.append('agent_id', filter.agent_id)
      }
    } else if (filters?.AND) {
      // Handle AND filters
      for (const filter of filters.AND) {
        if (filter.user_id) params.append('user_id', filter.user_id)
        if (filter.agent_id) params.append('agent_id', filter.agent_id)
      }
    }

    params.append('limit', page_size.toString())
    params.append('page', page.toString())

    // Call Mem0 API
    const response = await fetch(`https://api.mem0.ai/v1/memories/?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${mem0Key.api_key}`
      }
    })

    if (!response.ok) {
      console.error('Mem0 API error:', response.status)
      return NextResponse.json(
        { results: [], memories: [] },
        { status: 200 }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      results: data.results || [],
      memories: data.results || []
    })
  } catch (error) {
    console.error('Get all memories error:', error)
    return NextResponse.json(
      { results: [], memories: [] },
      { status: 200 }
    )
  }
}