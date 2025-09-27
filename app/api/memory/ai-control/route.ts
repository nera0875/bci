import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { action, projectId, data } = await request.json()

    switch (action) {
      case 'create':
        return await createMemoryNode(projectId, data)
      case 'update':
        return await updateMemoryNode(data.id, data)
      case 'delete':
        return await deleteMemoryNode(data.id)
      case 'move':
        return await moveMemoryNode(data.id, data.parentId)
      case 'search':
        return await searchMemoryNodes(projectId, data.query)
      case 'list':
        return await listMemoryNodes(projectId)
      default:
        return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur API memory/ai-control:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function createMemoryNode(projectId: string, data: any) {
  const { error, data: result } = await supabase
    .from('memory_nodes')
    .insert({
      project_id: projectId,
      parent_id: data.parentId || null,
      name: data.name,
      type: data.type || 'document',
      icon: data.icon || (data.type === 'folder' ? '📁' : '📄'),
      color: data.color || '#202123',
      content: data.content || (data.type === 'document' ? `# ${data.name}\n\nContenu créé par l'IA...` : null),
      position: data.position || 0,
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
    message: `${data.type === 'folder' ? 'Dossier' : 'Document'} "${data.name}" créé avec succès`
  })
}

async function updateMemoryNode(nodeId: string, data: any) {
  const updateData: any = {
    updated_at: new Date().toISOString()
  }

  if (data.name) updateData.name = data.name
  if (data.content !== undefined) updateData.content = data.content
  if (data.icon) updateData.icon = data.icon
  if (data.color) updateData.color = data.color
  if (data.metadata) updateData.metadata = data.metadata

  const { error, data: result } = await supabase
    .from('memory_nodes')
    .update(updateData)
    .eq('id', nodeId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    data: result,
    message: `Élément "${result.name}" mis à jour avec succès`
  })
}

async function deleteMemoryNode(nodeId: string) {
  // Récupérer d'abord le nom pour le message
  const { data: node } = await supabase
    .from('memory_nodes')
    .select('name')
    .eq('id', nodeId)
    .single()

  const { error } = await supabase
    .from('memory_nodes')
    .delete()
    .eq('id', nodeId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true,
    message: `Élément "${node?.name || 'inconnu'}" supprimé avec succès`
  })
}

async function moveMemoryNode(nodeId: string, parentId: string | null) {
  const { error, data: result } = await supabase
    .from('memory_nodes')
    .update({ 
      parent_id: parentId,
      updated_at: new Date().toISOString()
    })
    .eq('id', nodeId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    data: result,
    message: `Élément "${result.name}" déplacé avec succès`
  })
}

async function searchMemoryNodes(projectId: string, query: string) {
  const { data, error } = await supabase
    .from('memory_nodes')
    .select('*')
    .eq('project_id', projectId)
    .or(`name.ilike.%${query}%,content.ilike.%${query}%`)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    data: data,
    message: `${data.length} résultat(s) trouvé(s) pour "${query}"`
  })
}

async function listMemoryNodes(projectId: string) {
  const { data, error } = await supabase
    .from('memory_nodes')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    data: data,
    message: `${data.length} élément(s) de mémoire récupéré(s)`
  })
}
