import { MemoryClient } from 'mem0ai'
import { supabase } from '@/lib/supabase/client'

interface MemoryNode {
  id: string
  name: string
  type: string
  content: any
  parent_id: string | null
  project_id: string
  created_at: string
  updated_at: string
  metadata?: any
}

export class MemoryBridge {
  private mem0: MemoryClient | null = null
  private projectId: string
  private userId: string
  private initialized = false

  constructor(projectId: string, userId: string = 'default-user') {
    this.projectId = projectId
    this.userId = userId
  }

  async initialize() {
    if (this.initialized) return

    try {
      // Initialize Mem0 with API key from environment
      const apiKey = process.env.NEXT_PUBLIC_MEM0_API_KEY || process.env.MEM0_API_KEY

      if (!apiKey) {
        console.warn('⚠️ Mem0 API key not found, running in fallback mode')
        this.mem0 = null
        return
      }

      this.mem0 = new MemoryClient({
        apiKey: apiKey,
        orgId: process.env.MEM0_ORG_ID // Optional
      })

      this.initialized = true
      console.log('✅ MemoryBridge initialized with Mem0')
    } catch (error) {
      console.error('❌ Failed to initialize Mem0:', error)
      this.mem0 = null
    }
  }

  // Synchroniser un noeud Supabase vers Mem0
  async syncNodeToMem0(node: MemoryNode) {
    if (!this.mem0) return

    try {
      // Formatter le contenu pour Mem0
      const memoryContent = this.formatNodeForMem0(node)

      // Ajouter à Mem0 avec metadata
      await this.mem0.add(memoryContent, {
        user_id: this.userId,
        metadata: {
          supabase_id: node.id,
          project_id: this.projectId,
          node_type: node.type,
          parent_id: node.parent_id,
          created_at: node.created_at,
          path: await this.getNodePath(node)
        }
      })

      console.log(`✅ Synced node ${node.name} to Mem0`)
    } catch (error) {
      console.error(`❌ Failed to sync node ${node.name}:`, error)
    }
  }

  // Synchroniser toute l'arborescence Supabase vers Mem0
  async syncFullTreeToMem0() {
    if (!this.mem0) return

    try {
      // Récupérer tous les noeuds de Supabase
      const { data: nodes, error } = await supabase
        .from('memory_nodes')
        .select('*')
        .eq('project_id', this.projectId)
        .order('created_at', { ascending: true })

      if (error || !nodes) {
        throw new Error('Failed to fetch nodes from Supabase')
      }

      console.log(`📦 Syncing ${nodes.length} nodes to Mem0...`)

      // Synchroniser chaque noeud
      for (const node of nodes) {
        await this.syncNodeToMem0(node)
      }

      console.log('✅ Full tree sync completed')
    } catch (error) {
      console.error('❌ Full sync failed:', error)
    }
  }

  // Formater un noeud pour Mem0
  private formatNodeForMem0(node: MemoryNode): string {
    let content = `[${node.type.toUpperCase()}] ${node.name}`

    if (node.content) {
      if (typeof node.content === 'string') {
        content += `\n${node.content}`
      } else {
        content += `\n${JSON.stringify(node.content, null, 2)}`
      }
    }

    return content
  }

  // Obtenir le chemin complet d'un noeud
  private async getNodePath(node: MemoryNode): Promise<string> {
    let path = node.name
    let currentNode = node

    while (currentNode.parent_id) {
      const { data: parent } = await supabase
        .from('memory_nodes')
        .select('name, parent_id')
        .eq('id', currentNode.parent_id)
        .single()

      if (!parent) break

      path = `${parent.name}/${path}`
      currentNode = parent as any
    }

    return path
  }

  // Recherche hybride : Mem0 + Supabase
  async hybridSearch(query: string, options: {
    useVectorSearch?: boolean
    limit?: number
    includeHierarchy?: boolean
  } = {}) {
    const {
      useVectorSearch = true,
      limit = 10,
      includeHierarchy = true
    } = options

    const results: any = {
      mem0Results: null,
      supabaseResults: null,
      merged: []
    }

    // 1. Recherche Mem0 (si disponible et activée)
    if (this.mem0 && useVectorSearch) {
      try {
        const mem0Results = await this.mem0.search(query, {
          user_id: this.userId,
          limit: limit
        })
        results.mem0Results = mem0Results
      } catch (error) {
        console.error('Mem0 search failed:', error)
      }
    }

    // 2. Recherche Supabase (toujours)
    try {
      const { data: nodes } = await supabase
        .from('memory_nodes')
        .select('*')
        .eq('project_id', this.projectId)
        .ilike('name', `%${query}%`)
        .limit(limit)

      results.supabaseResults = nodes

      // Si hierarchy demandée, construire l'arbre
      if (includeHierarchy && nodes) {
        for (const node of nodes) {
          node.path = await this.getNodePath(node)
        }
      }
    } catch (error) {
      console.error('Supabase search failed:', error)
    }

    // 3. Fusionner les résultats intelligemment
    results.merged = this.mergeResults(
      results.mem0Results?.memories || [],
      results.supabaseResults || []
    )

    return results
  }

  // Fusionner les résultats Mem0 et Supabase
  private mergeResults(mem0Results: any[], supabaseResults: any[]): any[] {
    const merged = new Map()

    // Ajouter les résultats Supabase
    for (const node of supabaseResults) {
      merged.set(node.id, {
        source: 'supabase',
        ...node,
        relevance: 0.5 // Score de base
      })
    }

    // Enrichir avec les résultats Mem0
    for (const memory of mem0Results) {
      const supabaseId = memory.metadata?.supabase_id
      if (supabaseId && merged.has(supabaseId)) {
        // Fusionner les infos
        const existing = merged.get(supabaseId)
        existing.mem0Memory = memory
        existing.relevance = memory.score || 0.8 // Score Mem0 généralement plus pertinent
      } else {
        // Ajouter comme nouvelle entrée
        merged.set(memory.id, {
          source: 'mem0',
          ...memory,
          relevance: memory.score || 0.7
        })
      }
    }

    // Trier par pertinence
    return Array.from(merged.values())
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
  }

  // Mettre à jour la mémoire dans Mem0
  async updateMem0Memory(nodeId: string, newContent: string) {
    if (!this.mem0) return false

    try {
      // Récupérer le noeud Supabase
      const { data: node } = await supabase
        .from('memory_nodes')
        .select('*')
        .eq('id', nodeId)
        .single()

      if (!node) return false

      // Rechercher la mémoire correspondante dans Mem0
      const memories = await this.mem0.search(`supabase_id:${nodeId}`, {
        user_id: this.userId,
        limit: 1
      })

      if (memories?.memories?.[0]) {
        // Mettre à jour
        await this.mem0.update({
          memory_id: memories.memories[0].id,
          data: newContent
        })
        return true
      } else {
        // Créer nouvelle mémoire
        await this.syncNodeToMem0(node)
        return true
      }
    } catch (error) {
      console.error('Failed to update Mem0 memory:', error)
      return false
    }
  }

  // Obtenir l'état de santé du bridge
  getHealthStatus() {
    return {
      mem0Connected: this.mem0 !== null,
      initialized: this.initialized,
      projectId: this.projectId,
      userId: this.userId
    }
  }
}

// Instance singleton pour l'app
let bridgeInstance: MemoryBridge | null = null

export function getMemoryBridge(projectId: string, userId?: string): MemoryBridge {
  if (!bridgeInstance || bridgeInstance['projectId'] !== projectId) {
    bridgeInstance = new MemoryBridge(projectId, userId || 'default-user')
  }
  return bridgeInstance
}