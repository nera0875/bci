import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// GET /api/rules/active - Get active rules matching a trigger pattern
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const context = searchParams.get('context') // e.g., "auth", "api", "business-logic"

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    // Get all enabled rules for this project
    let query = supabase
      .from('rules')
      .select(`
        *,
        category:rule_categories(id, key, label, icon, description)
      `)
      .eq('project_id', projectId)
      .eq('enabled', true)
      .order('priority', { ascending: false })

    const { data, error } = await query

    if (error) throw error

    // Filter rules by trigger pattern if context provided
    let filteredRules = data || []

    if (context) {
      filteredRules = filteredRules.filter(rule => {
        const trigger = rule.trigger.toLowerCase()
        const ctx = context.toLowerCase()

        // Match exact context or wildcard patterns
        return (
          trigger === ctx ||
          trigger === '*' ||
          trigger.startsWith(`${ctx}/*`) ||
          trigger.endsWith(`/*`) && ctx.startsWith(trigger.replace('/*', ''))
        )
      })
    }

    return NextResponse.json({
      rules: filteredRules,
      count: filteredRules.length
    })
  } catch (error) {
    console.error('Error fetching active rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active rules' },
      { status: 500 }
    )
  }
}
