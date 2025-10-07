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
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  // Check memory_facts
  const { data: facts, count: factsCount } = await supabase
    .from('memory_facts')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)

  // Check pending_facts
  const { data: pendingFacts, count: pendingCount } = await supabase
    .from('pending_facts')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)

  return NextResponse.json({
    memory_facts: {
      count: factsCount,
      items: facts?.slice(0, 5) // First 5
    },
    pending_facts: {
      count: pendingCount,
      items: pendingFacts?.slice(0, 10) // First 10
    }
  })
}
