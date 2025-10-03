import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

/**
 * POST /api/learning/record
 * Enregistre succès/échec pour apprentissage
 *
 * Body: {
 *   projectId: string
 *   technique: string
 *   context: string
 *   success: boolean
 *   metadata?: object
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, technique, context, success, metadata } = await req.json()

    if (!projectId || !technique || !context || success === undefined) {
      return NextResponse.json(
        { error: 'projectId, technique, context, success required' },
        { status: 400 }
      )
    }

    // Chercher pattern existant
    const { data: existing } = await supabase
      .from('attack_patterns')
      .select('*')
      .eq('project_id', projectId)
      .eq('pattern_type', technique)
      .eq('context', context)
      .maybeSingle()

    if (existing) {
      // Update existant
      const totalAttempts = existing.usage_count + 1
      const successCount = success
        ? (existing.success_rate * existing.usage_count) + 1
        : (existing.success_rate * existing.usage_count)
      const newSuccessRate = successCount / totalAttempts

      await supabase
        .from('attack_patterns')
        .update({
          usage_count: totalAttempts,
          success_rate: newSuccessRate,
          last_success: success ? new Date().toISOString() : existing.last_success,
          pattern: {
            ...existing.pattern,
            recent_attempts: [
              ...(existing.pattern?.recent_attempts || []).slice(-4),
              { success, timestamp: new Date().toISOString(), metadata }
            ]
          }
        })
        .eq('id', existing.id)

      return NextResponse.json({
        success: true,
        updated: true,
        pattern: {
          id: existing.id,
          usage_count: totalAttempts,
          success_rate: newSuccessRate
        }
      })
    } else {
      // Créer nouveau pattern
      const { data: newPattern, error } = await supabase
        .from('attack_patterns')
        .insert({
          project_id: projectId,
          pattern_type: technique,
          context,
          usage_count: 1,
          success_rate: success ? 1.0 : 0.0,
          last_success: success ? new Date().toISOString() : null,
          pattern: {
            metadata,
            recent_attempts: [{ success, timestamp: new Date().toISOString() }]
          }
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating pattern:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        created: true,
        pattern: newPattern
      })
    }
  } catch (error) {
    console.error('Error recording learning:', error)
    return NextResponse.json(
      { error: 'Failed to record learning' },
      { status: 500 }
    )
  }
}
