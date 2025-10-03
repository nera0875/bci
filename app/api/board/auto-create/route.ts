import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * API pour créer automatiquement une structure hiérarchique dans le board
 * Utilisée par le système de chat pour ranger automatiquement les tests
 * 
 * Exemple: Memory/Success/Business Logic/Prix négatif
 * - Crée tous les dossiers parents s'ils n'existent pas
 * - Crée le document final avec le contenu
 * - Retourne l'ID et le chemin créé
 */

interface AutoCreateRequest {
  projectId: string
  section: 'memory' | 'rules' | 'optimization'
  folderName: string // Ex: "Success/Business Logic" ou "Failed/Authentication"
  itemName: string // Ex: "Prix négatif" ou "admin:admin"
  itemContent: string // Contenu du test
  context?: string // Ex: "business-logic"
  technique?: string // Ex: "prix négatif"
}

export async function POST(request: NextRequest) {
  try {
    const body: AutoCreateRequest = await request.json()
    const { projectId, section, folderName, itemName, itemContent, context, technique } = body

    if (!projectId || !section || !folderName || !itemName) {
      return NextResponse.json({
        error: 'projectId, section, folderName et itemName requis'
      }, { status: 400 })
    }

    console.log('📦 Auto-create: Starting hierarchical creation', {
      section,
      folderName,
      itemName
    })

    // Diviser le chemin en segments (ex: "Success/Business Logic" -> ["Success", "Business Logic"])
    const pathSegments = folderName.split('/').filter(s => s.trim())
    
    if (pathSegments.length === 0) {
      return NextResponse.json({
        error: 'folderName doit contenir au moins un segment'
      }, { status: 400 })
    }

    // Créer la hiérarchie de dossiers
    let currentParentId: string | null = null
    const createdPath: string[] = []

    for (const segment of pathSegments) {
      const trimmedSegment = segment.trim()
      createdPath.push(trimmedSegment)

      // Vérifier si le dossier existe déjà
      let query = supabase
        .from('memory_nodes')
        .select('id, name')
        .eq('project_id', projectId)
        .eq('section', section)
        .eq('type', 'folder')
        .eq('name', trimmedSegment)

      if (currentParentId) {
        query = query.eq('parent_id', currentParentId)
      } else {
        query = query.is('parent_id', null)
      }

      const { data: existingFolder, error: queryError } = await query.maybeSingle()

      if (existingFolder && !queryError) {
        // Le dossier existe déjà, utiliser son ID
        currentParentId = (existingFolder as any).id
        console.log('📁 Dossier existant trouvé:', trimmedSegment)
      } else {
        // Créer le nouveau dossier
        const folderIcon = getFolderIcon(trimmedSegment, createdPath)
        const folderColor = getFolderColor(trimmedSegment, createdPath)

        const { data: newFolder, error: folderError }: { data: any; error: any } = await supabase
          .from('memory_nodes')
          .insert([{
            project_id: projectId,
            parent_id: currentParentId,
            section,
            type: 'folder',
            name: trimmedSegment,
            icon: folderIcon,
            color: folderColor,
            position: 0,
            metadata: {
              auto_created: true,
              created_at: new Date().toISOString(),
              context: context || 'general'
            }
          }])
          .select()
          .single()

        if (folderError) {
          console.error('❌ Erreur création dossier:', folderError)
          return NextResponse.json({
            error: `Erreur création dossier "${trimmedSegment}": ${folderError.message}`
          }, { status: 500 })
        }

        currentParentId = (newFolder as any).id
        console.log('✅ Nouveau dossier créé:', trimmedSegment)
      }
    }

    // Créer le document final dans le dernier dossier
    const documentIcon = getDocumentIcon(itemName, context, technique)
    const documentColor = getDocumentColor(context)

    const { data: document, error: docError } = await supabase
      .from('memory_nodes')
      .insert([{
        project_id: projectId,
        parent_id: currentParentId,
        section,
        type: 'document',
        name: itemName,
        content: itemContent,
        icon: documentIcon,
        color: documentColor,
        position: 0,
        metadata: {
          auto_created: true,
          created_at: new Date().toISOString(),
          context: context || 'general',
          technique: technique || itemName,
          full_path: `${section}/${folderName}/${itemName}`
        }
      }])
      .select()
      .single()

    if (docError) {
      console.error('❌ Erreur création document:', docError)
      return NextResponse.json({
        error: `Erreur création document "${itemName}": ${docError.message}`
      }, { status: 500 })
    }

    const fullPath = `${section}/${folderName}/${itemName}`
    console.log('🎉 Auto-create: Hiérarchie créée avec succès:', fullPath)

    return NextResponse.json({
      success: true,
      documentId: (document as any).id,
      path: fullPath,
      pathSegments: [...createdPath, itemName],
      message: `Rangé dans ${fullPath}`,
      metadata: {
        section,
        context,
        technique,
        auto_created: true
      }
    })

  } catch (error: any) {
    console.error('❌ Auto-create error:', error)
    return NextResponse.json({
      error: 'Erreur lors de la création automatique',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Détermine l'icône du dossier selon son nom et sa position
 */
function getFolderIcon(folderName: string, path: string[]): string {
  const lowerName = folderName.toLowerCase()
  
  // Icônes pour les dossiers racine
  if (path.length === 1) {
    if (lowerName.includes('success') || lowerName.includes('réussi')) return '✅'
    if (lowerName.includes('failed') || lowerName.includes('échec')) return '❌'
    if (lowerName.includes('pending') || lowerName.includes('attente')) return '⏳'
    if (lowerName.includes('critical') || lowerName.includes('critique')) return '🔴'
  }
  
  // Icônes pour les sous-dossiers (contextes)
  if (lowerName.includes('business') || lowerName.includes('logic')) return '💰'
  if (lowerName.includes('auth') || lowerName.includes('login')) return '🔐'
  if (lowerName.includes('api')) return '🔌'
  if (lowerName.includes('race') || lowerName.includes('concurrent')) return '⚡'
  if (lowerName.includes('idor')) return '🎯'
  if (lowerName.includes('xss')) return '🔥'
  if (lowerName.includes('sql')) return '💉'
  if (lowerName.includes('csrf')) return '🔗'
  
  return '📁'
}

/**
 * Détermine la couleur du dossier
 */
function getFolderColor(folderName: string, path: string[]): string {
  const lowerName = folderName.toLowerCase()
  
  if (lowerName.includes('success') || lowerName.includes('réussi')) return '#10B981'
  if (lowerName.includes('failed') || lowerName.includes('échec')) return '#EF4444'
  if (lowerName.includes('pending') || lowerName.includes('attente')) return '#F59E0B'
  if (lowerName.includes('critical') || lowerName.includes('critique')) return '#DC2626'
  
  return '#6E6E80'
}

/**
 * Détermine l'icône du document selon le contexte
 */
function getDocumentIcon(itemName: string, context?: string, technique?: string): string {
  const lowerName = itemName.toLowerCase()
  const lowerTechnique = technique?.toLowerCase() || ''
  
  // Icônes selon la technique
  if (lowerTechnique.includes('prix') || lowerTechnique.includes('price')) return '💵'
  if (lowerTechnique.includes('quantité') || lowerTechnique.includes('quantity')) return '🔢'
  if (lowerTechnique.includes('token') || lowerTechnique.includes('jwt')) return '🎫'
  if (lowerTechnique.includes('idor')) return '🎯'
  if (lowerTechnique.includes('sql')) return '💉'
  if (lowerTechnique.includes('xss')) return '🔥'
  if (lowerTechnique.includes('bypass')) return '🚪'
  if (lowerTechnique.includes('race')) return '⚡'
  
  // Icônes selon le contexte
  if (context === 'business-logic') return '💰'
  if (context === 'authentication') return '🔐'
  if (context === 'api-security') return '🔌'
  if (context === 'race-condition') return '⚡'
  if (context === 'idor') return '🎯'
  
  return '📄'
}

/**
 * Détermine la couleur du document selon le contexte
 */
function getDocumentColor(context?: string): string {
  switch (context) {
    case 'business-logic': return '#10B981'
    case 'authentication': return '#3B82F6'
    case 'api-security': return '#8B5CF6'
    case 'race-condition': return '#F59E0B'
    case 'idor': return '#EF4444'
    default: return '#6E6E80'
  }
}