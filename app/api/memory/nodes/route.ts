import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type')
    const section = searchParams.get('section')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId requis' }, { status: 400 })
    }

    let query = supabase
      .from('memory_nodes')
      .select('*')
      .eq('project_id', projectId)

    if (type) {
      query = query.eq('type', type)
    }

    // Filtrer par section si fournie (explicitement actif)
    let data;
    let error;
    if (section) {
      const { data: sectionData, error: sectionError } = await query
        .eq('section', section)
        .order('created_at', { ascending: true })
      
      if (sectionError) {
        console.log('Section filter failed, falling back without section:', sectionError.message);
        // Fallback sans section
        const { data: fallbackData, error: fallbackError } = await query
          .order('created_at', { ascending: true })
        
        if (fallbackError) {
          return NextResponse.json({ error: fallbackError.message }, { status: 400 })
        }
        data = fallbackData
      } else {
        data = sectionData
      }
    } else {
      const { data: noSectionData, error: noSectionError } = await query
        .order('created_at', { ascending: true })
      if (noSectionError) {
        return NextResponse.json({ error: noSectionError.message }, { status: 400 })
      }
      data = noSectionData
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: true, nodes: [], total: 0 })
    }

    // Construire l'arbre hiérarchique
    const buildTree = (nodes: any[]) => {
      const nodeMap = new Map()
      const rootNodes: any[] = []

      // Créer la map des nodes
      nodes.forEach(node => {
        nodeMap.set(node.id, { ...node, children: [] })
      })

      // Construire l'arbre
      nodes.forEach(node => {
        const treeNode = nodeMap.get(node.id)
        if (node.parent_id && nodeMap.has(node.parent_id)) {
          const parent = nodeMap.get(node.parent_id)
          parent.children.push(treeNode)
        } else {
          rootNodes.push(treeNode)
        }
      })

      return rootNodes
    }

    const tree = buildTree(data)

    return NextResponse.json({ 
      success: true, 
      nodes: tree,
      total: data.length
    })
  } catch (error) {
    console.error('Erreur GET memory nodes:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, parentId, name, type, content, view_mode, section, category } = await request.json()

    if (!projectId || !name || !type) {
      return NextResponse.json({
        error: 'projectId, name et type requis'
      }, { status: 400 })
    }

    const insertData: Database['public']['Tables']['memory_nodes']['Insert'] = {
      project_id: projectId,
      parent_id: parentId,
      name,
      type,
      content: content || (type === 'prompt' ? "Écrivez votre prompt ici..." : type === 'document' ? `# ${name}\n\nContenu...` : null),
      icon: type === 'prompt' ? '💭' : type === 'folder' ? '📁' : '📄',
      color: '#6E6E80',
      position: 0,
      section: section || 'memory'
    }

    if (category) {
      (insertData as any).category = category
    }

    // Créer le node
    const { data, error } = await supabase
      .from('memory_nodes')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Si c'est un dossier avec view_mode table, initialiser les colonnes par défaut
    if (type === 'folder' && view_mode === 'table' && (data as any)?.id) {
      await initializeDefaultColumns((data as any).id, name)
    }

    return NextResponse.json({
      success: true,
      node: data,
      message: `${type === 'prompt' ? 'Prompt' : type === 'folder' ? 'Dossier' : 'Document'} "${name}" créé`
    })
  } catch (error) {
    console.error('Erreur POST memory nodes:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { nodeId, updates } = await request.json()

    if (!nodeId || !updates) {
      return NextResponse.json({ error: 'nodeId et updates requis' }, { status: 400 })
    }

    // Récupérer le node pour vérifier son type
    const { data: existingNode, error: fetchError } = await supabase
      .from('memory_nodes')
      .select('type')
      .eq('id', nodeId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Node non trouvé' }, { status: 404 })
    }

    if (existingNode.type !== 'document' && existingNode.type !== 'prompt') {
      return NextResponse.json({ error: 'Édition limitée aux documents et prompts' }, { status: 403 })
    }

    // Valider et filtrer les updates : seulement name et content pour documents
    const allowedUpdates: Partial<Database['public']['Tables']['memory_nodes']['Update']> = {}
    if ('name' in updates && typeof updates.name === 'string') {
      allowedUpdates.name = updates.name
    }
    if ('content' in updates && typeof updates.content === 'string') {
      allowedUpdates.content = updates.content
    }
    if ('category' in updates && typeof updates.category === 'string') {
      (allowedUpdates as any).category = updates.category
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: 'Aucun champ éditable fourni (name ou content)' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('memory_nodes')
      .update(allowedUpdates)
      .eq('id', nodeId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      node: data,
      message: `${existingNode.type === 'prompt' ? 'Prompt' : 'Document'} mis à jour`
    })
  } catch (error) {
    console.error('Erreur PUT memory nodes:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { nodeId } = await request.json()

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId requis' }, { status: 400 })
    }

    const { error } = await supabase
      .from('memory_nodes')
      .delete()
      .eq('id', nodeId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Node supprimé'
    })
  } catch (error) {
    console.error('Erreur DELETE memory nodes:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function initializeDefaultColumns(nodeId: string, folderName: string) {
  try {
    let folderType = 'general'
    
    // Détecter le type selon le nom
    if (folderName.toLowerCase().includes('requête') || folderName.toLowerCase().includes('request')) {
      folderType = 'requests'
    } else if (folderName.toLowerCase().includes('faille') || folderName.toLowerCase().includes('vulnér')) {
      folderType = 'vulnerabilities'
    } else if (folderName.toLowerCase().includes('test') || folderName.toLowerCase().includes('payload')) {
      folderType = 'tests'
    } else if (folderName.toLowerCase().includes('règle') || folderName.toLowerCase().includes('rule')) {
      folderType = 'rules'
    }

    // Créer les colonnes par défaut
    const defaultColumns = getDefaultColumnsForType(folderType)
    
    for (const column of defaultColumns) {
      await supabase
        .from('table_columns')
        .insert({
          node_id: nodeId,
          column_name: column.name,
          column_type: column.type,
          column_options: column.options,
          visible: true,
          order_index: column.order
        } as Database['public']['Tables']['table_columns']['Insert'])
    }
  } catch (error) {
    console.error('Erreur initialisation colonnes:', error)
  }
}

function getDefaultColumnsForType(type: string) {
  switch (type) {
    case 'requests':
      return [
        { name: 'name', type: 'text', options: { placeholder: 'Nom de la requête' }, order: 1 },
        { name: 'method', type: 'select', options: { options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }, order: 2 },
        { name: 'url', type: 'text', options: { placeholder: 'https://example.com/endpoint' }, order: 3 },
        { name: 'status', type: 'select', options: { options: ['À tester', 'Testé', 'Vulnérable', 'Sécurisé'] }, order: 4 },
        { name: 'content', type: 'text', options: { placeholder: 'Headers, body, réponse...', multiline: true }, order: 5 }
      ]
    
    case 'vulnerabilities':
      return [
        { name: 'name', type: 'text', options: { placeholder: 'Nom de la faille' }, order: 1 },
        { name: 'type', type: 'select', options: { options: ['XSS', 'SQLi', 'Business Logic', 'CSRF', 'IDOR', 'Auth Bypass'] }, order: 2 },
        { name: 'severity', type: 'select', options: { options: ['Critique', 'Élevé', 'Moyen', 'Faible'] }, order: 3 },
        { name: 'status', type: 'select', options: { options: ['Découverte', 'Confirmée', 'Reportée', 'Corrigée'] }, order: 4 },
        { name: 'content', type: 'text', options: { placeholder: 'Description, impact, reproduction...', multiline: true }, order: 5 }
      ]
    
    case 'rules':
      return [
        { name: 'name', type: 'text', options: { placeholder: 'Nom de la règle' }, order: 1 },
        { name: 'trigger', type: 'select', options: { options: ['*', 'requetes', 'failles', 'tests', 'analysis'] }, order: 2 },
        { name: 'action', type: 'text', options: { placeholder: 'Instruction ou template...', multiline: true }, order: 3 },
        { name: 'priority', type: 'select', options: { options: ['1', '2', '3'] }, order: 4 },
        { name: 'enabled', type: 'boolean', options: { default: true }, order: 5 }
      ]
    
    default:
      return [
        { name: 'name', type: 'text', options: { placeholder: 'Nom' }, order: 1 },
        { name: 'content', type: 'text', options: { placeholder: 'Contenu...', multiline: true }, order: 2 },
        { name: 'status', type: 'select', options: { options: ['Actif', 'Inactif', 'En cours'] }, order: 3 }
      ]
  }
}
