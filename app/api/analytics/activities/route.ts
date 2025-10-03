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

    // Get recent activities
    const activities: any[] = []

    // Get chat messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('id, created_at, role, content')
      .eq('project_id', projectId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (!messagesError && messages) {
      messages.forEach(msg => {
        if (msg.role === 'user') {
          activities.push({
            type: 'chat',
            action: 'Message sent',
            description: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
            timestamp: msg.created_at
          })
        }
      })
    }

    // Get memory node creations
    const { data: memoryNodes, error: memoryError } = await supabase
      .from('memory_nodes')
      .select('id, created_at, name, type')
      .eq('project_id', projectId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    if (!memoryError && memoryNodes) {
      memoryNodes.forEach(node => {
        activities.push({
          type: 'memory',
          action: `Created ${node.type}`,
          description: node.name,
          timestamp: node.created_at
        })
      })
    }

    // Get rule activations
    const { data: rules, error: rulesError } = await supabase
      .from('rules')
      .select('id, created_at, name, enabled')
      .eq('project_id', projectId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    if (!rulesError && rules) {
      rules.forEach(rule => {
        activities.push({
          type: 'rule',
          action: rule.enabled ? 'Rule enabled' : 'Rule created',
          description: rule.name,
          timestamp: rule.created_at
        })
      })
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      activities: activities.slice(0, 50)
    })
  } catch (error: any) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}
