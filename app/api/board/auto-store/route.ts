import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const FOLDER_ICONS: Record<string, string> = {
  'Memory': '🗂️',
  'Success': '✅',
  'Failed': '❌',
  'In Progress': '🔄',
  'Business Logic': '💰',
  'Authentication': '🔐',
  'API': '🔌',
  'XSS': '⚠️',
  'SQLi': '💉',
  'IDOR': '🎯'
}

/**
 * POST /api/board/auto-store
 * Créé automatiquement la hiérarchie + document
 *
 * Body: {
 *   projectId: string
 *   path: string (ex: "Memory/Success/Business Logic/Prix négatif")
 *   content: string
 *   metadata?: object
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, path, content, metadata } = await req.json()

    if (!projectId || !path || !content) {
      return NextResponse.json(
        { error: 'projectId, path, content required' },
        { status: 400 }
      )
    }

    // Parse path: "Memory/Success/BL/Prix négatif" → ["Memory", "Success", "BL", "Prix négatif"]
    const parts = path.split('/').filter((p: string) => p.trim())

    if (parts.length < 2) {
      return NextResponse.json(
        { error: 'Path must have at least 2 parts (folder + document)' },
        { status: 400 }
      )
    }

    // Créer/récupérer dossiers (tous sauf dernier)
    let parentId: string | null = null

    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i]

      // Chercher si existe
      const { data: existing }: { data: { id: string } | null } = await supabase
        .from('memory_nodes')
        .select('id')
        .eq('project_id', projectId)
        .eq('parent_id', parentId)
        .eq('name', folderName)
        .eq('type', 'folder')
        .maybeSingle()

      if (existing) {
        parentId = existing.id
      } else {
        // Créer
        const { data: newFolder, error }: { data: { id: string } | null; error: any } = await supabase
          .from('memory_nodes')
          .insert({
            project_id: projectId,
            parent_id: parentId,
            name: folderName,
            type: 'folder',
            icon: FOLDER_ICONS[folderName] || '📁'
          })
          .select()
          .single()

        if (error || !newFolder) {
          console.error('Error creating folder:', error)
          return NextResponse.json(
            { error: `Failed to create folder: ${folderName}` },
            { status: 500 }
          )
        }

        parentId = newFolder.id
      }
    }

    // Créer document (dernier élément)
    const docName = parts[parts.length - 1]

    const { data: doc, error: docError } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: projectId,
        parent_id: parentId,
        name: docName,
        type: 'document',
        content,
        icon: metadata?.icon || '📄',
        metadata: metadata || {}
      })
      .select()
      .single()

    if (docError) {
      console.error('Error creating document:', docError)
      return NextResponse.json(
        { error: 'Failed to create document' },
        { status: 500 }
      )
    }

    // Créer embedding en arrière-plan (sans attendre)
    fetch(`http://localhost:3000/api/embeddings/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeId: doc.id,
        content
      })
    }).catch(err => console.error('Background embedding failed:', err))

    return NextResponse.json({
      success: true,
      path,
      nodeId: doc.id,
      message: `Rangé dans ${path}`
    })

  } catch (error) {
    console.error('Error in auto-store:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
