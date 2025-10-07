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

  const { data: pending, count } = await supabase
    .from('pending_facts')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const { data: all, count: allCount } = await supabase
    .from('pending_facts')
    .select('id, status', { count: 'exact' })
    .eq('project_id', projectId)

  return NextResponse.json({
    pending: pending || [],
    pendingCount: count || 0,
    totalCount: allCount || 0,
    allStatuses: all || []
  })
}
