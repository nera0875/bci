import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { action, projectId, data } = await request.json()

    switch (action) {
      // Actions mémoire existantes
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
      
      // NOUVELLES ACTIONS BOARD MODULAIRE pour l'IA Chat
      case 'board-create-folder':
        return await createBoardFolder(projectId, data)
      case 'board-create-document':
        return await createBoardDocument(projectId, data)
      case 'board-add-content':
        return await addBoardContent(projectId, data)
      case 'board-organize':
        return await organizeBoardContent(projectId, data)
      case 'board-move-element':
        return await moveBoardElement(projectId, data)
      case 'board-edit-monaco':
        return await editMonacoContent(projectId, data)
      
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

// NOUVELLES FONCTIONS BOARD MODULAIRE pour l'IA Chat

// FONCTIONS BOARD MODULAIRE utilisant votre système existant

async function createBoardFolder(projectId: string, data: any) {
  // Utiliser memory_nodes existant au lieu de modular_items inexistant
  return await createMemoryNode(projectId, {
    name: data.name || 'Nouveau dossier IA',
    type: 'folder',
    parentId: data.parent_id || null,
    icon: data.icon || '📁',
    color: data.color || '#6b7280',
    metadata: { 
      section: data.section || 'memory',
      boardElement: true,
      aiCreated: true
    }
  })
}

async function createBoardDocument(projectId: string, data: any) {
  return await createMemoryNode(projectId, {
    name: data.name || 'Nouveau document IA',
    type: 'document',
    parentId: data.parent_id || null,
    icon: data.icon || '📄',
    color: data.color || '#3b82f6',
    content: `# ${data.name}\n\nDocument créé par l'IA`,
    metadata: { 
      section: data.section || 'memory',
      boardElement: true,
      aiCreated: true,
      tableData: data.initialData || []
    }
  })
}

async function addBoardContent(projectId: string, data: any) {
  // Utiliser le système memory_nodes existant
  const { data: memoryNode, error: fetchError } = await supabase
    .from('memory_nodes')
    .select('*')
    .eq('id', data.documentId)
    .single()

  if (fetchError || !memoryNode) {
    return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
  }

  // Ajouter contenu au metadata existant
  const currentTableData = memoryNode.metadata?.tableData || []
  const newContent = {
    id: `content-${Date.now()}`,
    name: data.content.name || 'Contenu IA',
    type: data.content.type || 'ai-generated',
    content: data.content.content || '',
    created_at: new Date().toISOString(),
    ...data.content
  }

  const updatedTableData = [...currentTableData, newContent]
  
  return await updateMemoryNode(data.documentId, {
    metadata: {
      ...memoryNode.metadata,
      tableData: updatedTableData
    }
  })
}

async function organizeBoardContent(projectId: string, data: any) {
  // Utiliser le système embeddings existant pour organisation intelligente
  try {
    const { createEmbedding } = await import('@/lib/services/embeddings')
    
    // Créer embedding du contenu
    const embedding = await createEmbedding(data.content)
    
    // Analyser et déterminer le placement optimal
    const analysis = await analyzeContentForPlacement(data.content, data.rules || [])
    
    if (analysis.targetFolder) {
      // Ajouter au dossier cible avec formatage selon les règles
      return await addBoardContent(projectId, {
        documentId: analysis.targetFolder,
        content: {
          name: analysis.title || 'Contenu organisé par IA',
          content: analysis.formattedContent,
          type: analysis.type || 'organized',
          url: analysis.url || '',
          severity: analysis.severity || 'Moyen',
          embedding: embedding.slice(0, 10) // Premiers éléments pour debug
        }
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Aucune règle d\'organisation trouvée'
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur organisation' }, { status: 500 })
  }
}

async function moveBoardElement(projectId: string, data: any) {
  const { error, data: result } = await supabase
    .from('modular_items')
    .update({
      parent_id: data.newParentId,
      position: data.newPosition || Date.now(),
      updated_at: new Date().toISOString()
    })
    .eq('id', data.nodeId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    data: result,
    message: `Élément "${result.name}" déplacé par l'IA`
  })
}

async function editMonacoContent(projectId: string, data: any) {
  // Éditer le contenu Monaco d'un élément spécifique
  const { data: item, error: fetchError } = await supabase
    .from('modular_items')
    .select('*')
    .eq('id', data.itemId)
    .single()

  if (fetchError || !item) {
    return NextResponse.json({ error: 'Élément non trouvé' }, { status: 404 })
  }

  // Mettre à jour le contenu/instructions
  const updateField = data.field || 'content'
  const currentData = item.data || []
  
  const updatedData = currentData.map((row: any) => 
    row.id === data.rowId 
      ? { ...row, [updateField]: data.newContent, updated_at: new Date().toISOString() }
      : row
  )

  const { error } = await supabase
    .from('modular_items')
    .update({ 
      data: updatedData,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.itemId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    message: `Contenu Monaco mis à jour par l'IA`
  })
}

// Fonction d'analyse de contenu pour placement intelligent
async function analyzeContentForPlacement(content: string, rules: any[]) {
  const analysis = {
    targetFolder: null as string | null,
    formattedContent: content,
    title: '',
    type: 'default',
    url: '',
    severity: 'Moyen'
  }

  // Détection automatique selon mots-clés
  const contentLower = content.toLowerCase()
  
  // Détecter vulnérabilités
  if (contentLower.includes('xss') || contentLower.includes('injection') || contentLower.includes('faille')) {
    analysis.type = contentLower.includes('trouvé') || contentLower.includes('réussi') ? 'succès' : 'échec'
    analysis.targetFolder = analysis.type === 'succès' ? 'memory-success' : 'memory-failed'
    analysis.severity = 'Critique'
  }

  // Détecter URLs
  const urlMatch = content.match(/https?:\/\/[^\s]+/)
  if (urlMatch) {
    analysis.url = urlMatch[0]
  }

  // Extraire titre
  const titleMatch = content.match(/^#\s*(.+)$/m) || content.match(/^(.+?)[\n\r]/m)
  if (titleMatch) {
    analysis.title = titleMatch[1].trim()
  }

  // Appliquer règles personnalisées
  for (const rule of rules) {
    if (rule.enabled && rule.trigger) {
      if (content.includes(rule.trigger) || contentLower.includes(rule.name.toLowerCase())) {
        analysis.targetFolder = rule.targetFolder
        if (rule.name.includes('French')) {
          analysis.formattedContent = formatFrenchStyle(content)
        }
      }
    }
  }

  return analysis
}

// Formatage style français
function formatFrenchStyle(content: string): string {
  const lines = content.split('\n')
  const formatted = []
  
  formatted.push('# ' + (lines[0] || 'Élément Organisé'))
  formatted.push('')
  formatted.push(`- **Date:** ${new Date().toLocaleDateString('fr-FR')}`)
  formatted.push(`- **Traité par:** IA Assistant`)
  formatted.push('')
  formatted.push('## Contenu')
  formatted.push(content)
  
  return formatted.join('\n')
}
