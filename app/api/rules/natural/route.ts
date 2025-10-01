import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId requis' }, { status: 400 })
    }

    // Récupérer les règles du projet
    const { data: project, error } = await supabase
      .from('projects')
      .select('rules_text')
      .eq('id', projectId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      rules_text: project?.rules_text || ''
    })
  } catch (error) {
    console.error('Erreur GET rules natural:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { projectId, rules_text } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'projectId requis' }, { status: 400 })
    }

    if (typeof rules_text !== 'string') {
      return NextResponse.json({ error: 'rules_text doit être une chaîne' }, { status: 400 })
    }

    // Mettre à jour les règles du projet
    const { data, error } = await supabase
      .from('projects')
      .update({ rules_text })
      .eq('id', projectId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      project: data,
      message: 'Règles mises à jour avec succès'
    })
  } catch (error) {
    console.error('Erreur PUT rules natural:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, user_message, ai_action, user_feedback, suggested_rule } = await request.json()

    if (!projectId || !user_message || !ai_action) {
      return NextResponse.json({ 
        error: 'projectId, user_message et ai_action requis' 
      }, { status: 400 })
    }

    // Enregistrer feedback pour apprentissage
    const { data, error } = await supabase
      .from('rule_feedback')
      .insert({
        project_id: projectId,
        user_message,
        ai_action,
        user_feedback: user_feedback || 'correct',
        suggested_rule
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Si feedback positif, augmenter confiance des patterns similaires
    if (user_feedback === 'correct') {
      await supabase
        .from('learned_patterns')
        .update({ 
          confidence: supabase.raw('LEAST(confidence + 0.1, 1.0)'),
          usage_count: supabase.raw('usage_count + 1'),
          last_used: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .ilike('pattern_text', `%${user_message.slice(0, 20)}%`)
    }

    return NextResponse.json({
      success: true,
      feedback: data,
      message: 'Feedback enregistré pour apprentissage'
    })
  } catch (error) {
    console.error('Erreur POST rules feedback:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
