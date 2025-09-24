import { NextResponse } from 'next/server'
import { getMemoryServiceV2 } from '@/lib/services/memoryServiceV2'

export async function GET() {
  const projectId = 'test-project-001'
  const userId = 'test-user'

  try {
    // Initialiser le service
    const memoryService = await getMemoryServiceV2(projectId, userId)

    // Test: Créer un document
    const result = await memoryService.createNode({
      name: 'test-document',
      type: 'document',
      content: 'Contenu de test: Ma taille est 190cm',
      parent: '/',
      metadata: {
        test: true,
        created_at: new Date().toISOString()
      }
    })

    // Rechercher le document
    const searchResults = await memoryService.searchNodes('190cm', {
      limit: 5
    })

    // Obtenir l'arbre
    const tree = await memoryService.getMemoryTree()

    return NextResponse.json({
      success: true,
      message: 'Test Mem0 réussi',
      results: {
        created: result,
        search: searchResults,
        treeSize: tree?.length || 0
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}