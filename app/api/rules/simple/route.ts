import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId requis' }, { status: 400 })
    }

    // Récupérer toutes les règles du projet depuis la table 'rules'
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      rules: data || []
    })
  } catch (error) {
    console.error('Erreur GET simple rules:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, projectId, rule } = await request.json()

    switch (action) {
      case 'create':
        return await createRule(projectId, rule)
      case 'update':
        return await updateRule(rule.id, rule)
      case 'delete':
        return await deleteRule(rule.id)
      case 'toggle':
        return await toggleRule(rule.id, rule.active)
      default:
        return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur POST simple rules:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function createRule(projectId: string, rule: any) {
  try {
    const { error, data } = await supabase
      .from('rules')
      .insert({
        project_id: projectId,
        name: rule.name || 'Nouvelle règle',
        description: rule.description || '',
        trigger: rule.trigger || '*',
        action: rule.action || 'Instruction...',
        enabled: rule.enabled !== false,
        priority: rule.priority || 1,
        config: rule.config || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Create rule error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      rule: data,
      message: `Règle "${rule.name}" créée`
    })
  } catch (error) {
    console.error('Create rule error:', error)
    return NextResponse.json({ error: 'Erreur création règle' }, { status: 500 })
  }
}

async function updateRule(ruleId: string, rule: any) {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Merger seulement les champs fournis
    if (rule.name !== undefined) updateData.name = rule.name
    if (rule.description !== undefined) updateData.description = rule.description
    if (rule.trigger !== undefined) updateData.trigger = rule.trigger
    if (rule.action !== undefined) updateData.action = rule.action
    if (rule.enabled !== undefined) updateData.enabled = rule.enabled
    if (rule.priority !== undefined) updateData.priority = rule.priority
    if (rule.config !== undefined) updateData.config = rule.config

    const { error, data } = await supabase
      .from('rules')
      .update(updateData)
      .eq('id', ruleId)
      .select()
      .single()

    if (error) {
      console.error('Update rule error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      rule: data,
      message: 'Règle mise à jour'
    })
  } catch (error) {
    console.error('Update rule error:', error)
    return NextResponse.json({ error: 'Erreur mise à jour règle' }, { status: 500 })
  }
}

async function deleteRule(ruleId: string) {
  const { error } = await supabase
    .from('rules')
    .delete()
    .eq('id', ruleId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true,
    message: 'Règle supprimée'
  })
}

async function toggleRule(ruleId: string, active: boolean) {
  const { error, data } = await supabase
    .from('rules')
    .update({ 
      enabled: active,
      updated_at: new Date().toISOString()
    })
    .eq('id', ruleId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    rule: data,
    message: active ? 'Règle activée' : 'Règle désactivée'
  })
}
