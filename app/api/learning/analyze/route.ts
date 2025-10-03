/**
 * Pattern Analysis API Route
 *
 * Triggers pattern analysis on user_decisions
 * Generates learned_patterns and implicit_rules
 */

import { NextRequest, NextResponse } from 'next/server'
import { PatternLearner } from '@/lib/services/patternLearner'

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    console.log('🧠 Starting pattern analysis for project:', projectId)

    const learner = new PatternLearner(projectId)

    // 1. Analyze decisions and generate patterns
    const patterns = await learner.analyzeDecisions()

    // 2. Generate implicit rules from patterns
    const rules = await learner.generateImplicitRules()

    console.log(`✅ Analysis complete: ${patterns.length} patterns, ${rules.length} rules generated`)

    return NextResponse.json({
      success: true,
      patterns: patterns.length,
      rules: rules.length,
      data: {
        patterns,
        rules
      }
    })
  } catch (error) {
    console.error('Error in pattern analysis:', error)
    return NextResponse.json(
      { error: 'Failed to analyze patterns', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check analysis status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    // Get pattern and rule counts
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    const [patternsResult, rulesResult] = await Promise.all([
      supabase.from('learned_patterns').select('id', { count: 'exact' }).eq('project_id', projectId),
      supabase.from('implicit_rules').select('id', { count: 'exact' }).eq('project_id', projectId).eq('status', 'suggestion')
    ])

    return NextResponse.json({
      patterns: patternsResult.count || 0,
      suggestionsCount: rulesResult.count || 0
    })
  } catch (error) {
    console.error('Error getting analysis status:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
