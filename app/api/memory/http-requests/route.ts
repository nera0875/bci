import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/memory/http-requests
 * Retrieve all facts with HTTP requests
 * Useful for AI to analyze pentest requests
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Query facts where metadata->>'http_request' IS NOT NULL
    const { data: facts, error } = await supabase
      .from('memory_facts')
      .select('*')
      .eq('project_id', projectId)
      .not('metadata->http_request', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching HTTP requests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch HTTP requests' },
        { status: 500 }
      )
    }

    // Transform for easier consumption
    const httpRequests = facts?.map(fact => ({
      id: fact.id,
      fact: fact.fact,
      severity: fact.metadata.severity,
      technique: fact.metadata.technique,
      category: fact.metadata.category,
      tags: fact.metadata.tags || [],
      http_request: fact.metadata.http_request,
      http_response: fact.metadata.http_response,
      created_at: fact.created_at
    })) || []

    return NextResponse.json({
      requests: httpRequests,
      total: httpRequests.length
    })

  } catch (error: any) {
    console.error('Error in GET /api/memory/http-requests:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/memory/http-requests/search
 * Search HTTP requests by criteria
 * Body: { projectId, method?, host?, technique?, severity? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, method, host, technique, severity } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    let query = supabase
      .from('memory_facts')
      .select('*')
      .eq('project_id', projectId)
      .not('metadata->http_request', 'is', null)

    // Filter by HTTP method
    if (method) {
      query = query.eq('metadata->http_request->>method', method.toUpperCase())
    }

    // Filter by host (contains)
    if (host) {
      query = query.ilike('metadata->http_request->>host', `%${host}%`)
    }

    // Filter by technique
    if (technique) {
      query = query.eq('metadata->>technique', technique)
    }

    // Filter by severity
    if (severity) {
      query = query.eq('metadata->>severity', severity)
    }

    query = query.order('created_at', { ascending: false })

    const { data: facts, error } = await query

    if (error) {
      console.error('Error searching HTTP requests:', error)
      return NextResponse.json(
        { error: 'Failed to search HTTP requests' },
        { status: 500 }
      )
    }

    const httpRequests = facts?.map(fact => ({
      id: fact.id,
      fact: fact.fact,
      severity: fact.metadata.severity,
      technique: fact.metadata.technique,
      category: fact.metadata.category,
      tags: fact.metadata.tags || [],
      http_request: fact.metadata.http_request,
      http_response: fact.metadata.http_response,
      created_at: fact.created_at
    })) || []

    return NextResponse.json({
      requests: httpRequests,
      total: httpRequests.length,
      filters: { method, host, technique, severity }
    })

  } catch (error: any) {
    console.error('Error in POST /api/memory/http-requests/search:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
