import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('suggestions_queue')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.log('Suggestions table not found, returning empty array')
        return NextResponse.json([])
      }
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error loading suggestions:', error)
    return NextResponse.json({ error: 'Failed to load suggestions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, type, confidence, suggestion, metadata } = await request.json()

    const { data, error } = await supabase
      .from('suggestions_queue')
      .insert({
        project_id: projectId,
        type,
        confidence,
        suggestion,
        metadata,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating suggestion:', error)
    return NextResponse.json({ error: 'Failed to create suggestion' }, { status: 500 })
  }
}