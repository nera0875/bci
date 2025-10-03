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
    const { count, error } = await supabase
      .from('suggestions_queue')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'pending')

    if (error) {
      // If table doesn't exist, return 0
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({ count: 0 })
      }
      throw error
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Error counting suggestions:', error)
    return NextResponse.json({ count: 0 })
  }
}