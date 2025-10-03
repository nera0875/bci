import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const range = searchParams.get('range') || 'week'

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Calculate date range
    const now = new Date()
    const startDate = new Date()

    switch (range) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    // Get chat messages count
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('id, created_at, metadata')
      .eq('project_id', projectId)
      .gte('created_at', startDate.toISOString())

    if (messagesError) throw messagesError

    // Get memory nodes count
    const { data: memoryNodes, error: memoryError } = await supabase
      .from('memory_nodes')
      .select('id')
      .eq('project_id', projectId)

    if (memoryError) throw memoryError

    // Get rules count
    const { data: rules, error: rulesError } = await supabase
      .from('rules')
      .select('id, enabled')
      .eq('project_id', projectId)

    if (rulesError) throw rulesError

    // Calculate metrics
    const totalMessages = messages?.length || 0
    const totalMemoryNodes = memoryNodes?.length || 0
    const totalRules = rules?.length || 0
    const activeRules = rules?.filter(r => r.enabled).length || 0

    // Calculate API costs from metadata
    const totalCost = messages?.reduce((sum, msg) => {
      const cost = msg.metadata?.cost || 0
      return sum + cost
    }, 0) || 0

    // Calculate cache savings
    const cacheSavings = messages?.reduce((sum, msg) => {
      const savings = msg.metadata?.cache_savings || 0
      return sum + savings
    }, 0) || 0

    return NextResponse.json({
      metrics: {
        totalMessages,
        totalMemoryNodes,
        totalRules,
        activeRules,
        totalCost,
        cacheSavings,
        cacheHitRate: totalCost > 0 ? (cacheSavings / (totalCost + cacheSavings)) * 100 : 0
      }
    })
  } catch (error: any) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
