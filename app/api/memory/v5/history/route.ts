import { NextRequest, NextResponse } from 'next/server'
import { SupabaseApiKeyService } from '@/lib/services/apiKeyService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memory_id = searchParams.get('memory_id')

    if (!memory_id) {
      return NextResponse.json(
        { error: 'Memory ID is required' },
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
    const response = await fetch(`https://api.mem0.ai/v1/memories/${memory_id}/history/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mem0Key.api_key}`
      }
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Mem0 API error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch memory history' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Get memory history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}