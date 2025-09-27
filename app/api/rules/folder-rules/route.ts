import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { action, projectId, data } = await request.json()

    switch (action) {
      case 'create':
        return await createFolderRule(projectId, data)
      case 'update':
        return await updateFolderRule(data.id, data)
      case 'delete':
        return await deleteFolderRule(data.id)
      case 'list':
        return await listFolderRules(projectId, data.folderId)
      case 'get-by-folder':
        return await getRulesByFolder(projectId, data.folderId)
      default:
        return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur API rules/folder-rules:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function createFolderRule(projectId: string, data: any) {
  const { error, data: result } = await supabase
    .from('folder_rules')
    .insert({
      project_id: projectId,
      folder_id: data.folderId,
      rule_name: data.ruleName,
      rule_description: data.ruleDescription,
      rule_type: data.ruleType || 'behavior',
      rule_content: data.ruleContent,
      is_active: data.isActive !== false,
      priority: data.priority || 1,
      metadata: data.metadata || {}
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    data: result,
    message: `Règle "${data.ruleName}" créée pour le dossier`
  })
}

async function updateFolderRule(ruleId: string, data: any) {
  const updateData: any = {
    updated_at: new Date().toISOString()
  }

  if (data.ruleName) updateData.rule_name = data.ruleName
  if (data.ruleDescription) updateData.rule_description = data.ruleDescription
  if (data.ruleType) updateData.rule_type = data.ruleType
  if (data.ruleContent) updateData.rule_content = data.ruleContent
  if (data.isActive !== undefined) updateData.is_active = data.isActive
  if (data.priority) updateData.priority = data.priority
  if (data.metadata) updateData.metadata = data.metadata

  const { error, data: result } = await supabase
    .from('folder_rules')
    .update(updateData)
    .eq('id', ruleId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    data: result,
    message: `Règle "${result.rule_name}" mise à jour`
  })
}

async function deleteFolderRule(ruleId: string) {
  const { data: rule } = await supabase
    .from('folder_rules')
    .select('rule_name')
    .eq('id', ruleId)
    .single()

  const { error } = await supabase
    .from('folder_rules')
    .delete()
    .eq('id', ruleId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true,
    message: `Règle "${rule?.rule_name || 'inconnue'}" supprimée`
  })
}

async function listFolderRules(projectId: string, folderId?: string) {
  let query = supabase
    .from('folder_rules')
    .select(`
      *,
      memory_nodes!folder_rules_folder_id_fkey (
        id,
        name,
        type,
        icon
      )
    `)
    .eq('project_id', projectId)
    .order('priority', { ascending: true })

  if (folderId) {
    query = query.eq('folder_id', folderId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    data: data,
    message: `${data.length} règle(s) récupérée(s)`
  })
}

async function getRulesByFolder(projectId: string, folderId: string) {
  const { data, error } = await supabase
    .from('folder_rules')
    .select('*')
    .eq('project_id', projectId)
    .eq('folder_id', folderId)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    data: data,
    message: `${data.length} règle(s) active(s) pour ce dossier`
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const folderId = searchParams.get('folderId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId requis' }, { status: 400 })
    }

    return await listFolderRules(projectId, folderId || undefined)
  } catch (error) {
    console.error('Erreur GET rules/folder-rules:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
