/**
 * Memory Service V2 - Utilise Mem0 comme système principal
 * Supabase est utilisé uniquement pour l'UI des dossiers
 */

import { MemoryClient } from 'mem0ai'
import { supabase } from '@/lib/supabase/client'

interface MemoryNode {
  id?: string
  name: string
  type: 'folder' | 'document'
  content?: any
  path?: string
  parent?: string
  metadata?: any
}

export class MemoryServiceV2 {
  private mem0: MemoryClient | null = null
  private userId: string
  private projectId: string

  constructor(projectId: string, userId: string = 'default-user') {
    this.projectId = projectId
    this.userId = `${projectId}-${userId}`
  }

  async initialize() {
    const apiKey = process.env.NEXT_PUBLIC_MEM0_API_KEY || process.env.MEM0_API_KEY

    if (!apiKey) {
      throw new Error('MEM0_API_KEY is required for Memory Service V2')
    }

    this.mem0 = new MemoryClient({ apiKey })
    console.log('✅ Memory Service V2 initialized with Mem0')
  }

  /**
   * Créer un nœud (dossier ou document) dans Mem0
   */
  async createNode(node: MemoryNode) {
    if (!this.mem0) await this.initialize()

    // Construire le chemin complet
    const fullPath = node.parent
      ? `${node.parent}/${node.name}`
      : `/${node.name}`

    // Formater le contenu pour Mem0
    let memoryContent = []

    if (node.type === 'folder') {
      memoryContent = [
        {
          role: "system",
          content: `Created folder: ${fullPath}`
        },
        {
          role: "assistant",
          content: `Folder "${node.name}" created at ${fullPath}`
        }
      ]
    } else {
      // Pour les documents, inclure le contenu
      memoryContent = [
        {
          role: "user",
          content: `Create document ${node.name}: ${node.content || ''}`
        },
        {
          role: "assistant",
          content: `Document "${node.name}" saved at ${fullPath} with content: ${node.content || 'Empty document'}`
        }
      ]
    }

    // Ajouter à Mem0 avec metadata complètes
    const result = await this.mem0!.add(memoryContent, {
      user_id: this.userId,
      metadata: {
        node_type: node.type,
        node_name: node.name,
        node_path: fullPath,
        parent_path: node.parent || '/',
        project_id: this.projectId,
        created_at: new Date().toISOString(),
        ...node.metadata
      }
    })

    console.log(`✅ Created ${node.type} "${node.name}" in Mem0`, result)

    // Synchroniser avec Supabase pour l'UI (optionnel)
    if (node.type === 'folder') {
      await this.syncFolderToSupabase(node, fullPath)
    }

    return result
  }

  /**
   * Mettre à jour un nœud dans Mem0
   */
  async updateNode(path: string, updates: Partial<MemoryNode>) {
    if (!this.mem0) await this.initialize()

    // Rechercher le nœud existant
    const existing = await this.findNodeByPath(path)
    if (!existing) {
      throw new Error(`Node not found at path: ${path}`)
    }

    // Créer le contenu de mise à jour
    const updateContent = [
      {
        role: "user",
        content: `Update ${path}: ${JSON.stringify(updates)}`
      },
      {
        role: "assistant",
        content: `Updated ${path} with new content`
      }
    ]

    // Ajouter la mise à jour (Mem0 garde l'historique)
    const result = await this.mem0!.add(updateContent, {
      user_id: this.userId,
      metadata: {
        action: 'update',
        node_path: path,
        updates: updates,
        updated_at: new Date().toISOString()
      }
    })

    console.log(`✅ Updated node at ${path}`, result)
    return result
  }

  /**
   * Supprimer un nœud (marquer comme supprimé dans Mem0)
   */
  async deleteNode(path: string) {
    if (!this.mem0) await this.initialize()

    // Mem0 ne supporte pas vraiment la suppression, on marque comme supprimé
    const deleteContent = [
      {
        role: "user",
        content: `Delete ${path}`
      },
      {
        role: "assistant",
        content: `Marked ${path} as deleted`
      }
    ]

    const result = await this.mem0!.add(deleteContent, {
      user_id: this.userId,
      metadata: {
        action: 'delete',
        node_path: path,
        deleted_at: new Date().toISOString()
      }
    })

    console.log(`✅ Marked node as deleted: ${path}`)
    return result
  }

  /**
   * Rechercher un nœud par son chemin
   */
  async findNodeByPath(path: string): Promise<any> {
    if (!this.mem0) await this.initialize()

    const results = await this.mem0!.search(
      `path:${path}`,
      {
        user_id: this.userId,
        limit: 1
      }
    )

    return results?.memories?.[0] || null
  }

  /**
   * Rechercher des nœuds par requête
   */
  async searchNodes(query: string, options?: {
    type?: 'folder' | 'document'
    parent?: string
    limit?: number
  }) {
    if (!this.mem0) await this.initialize()

    // Construire la requête de recherche
    let searchQuery = query
    if (options?.type) {
      searchQuery += ` type:${options.type}`
    }
    if (options?.parent) {
      searchQuery += ` parent:${options.parent}`
    }

    const results = await this.mem0!.search(searchQuery, {
      user_id: this.userId,
      limit: options?.limit || 20
    })

    // Filtrer les résultats supprimés
    const activeResults = results?.memories?.filter((m: any) =>
      !m.metadata?.action || m.metadata.action !== 'delete'
    ) || []

    return activeResults
  }

  /**
   * Lister tous les nœuds d'un dossier
   */
  async listFolder(folderPath: string = '/') {
    if (!this.mem0) await this.initialize()

    // Rechercher tous les nœuds avec ce parent
    const results = await this.searchNodes('', {
      parent: folderPath,
      limit: 100
    })

    // Organiser par type
    const folders = results.filter((r: any) =>
      r.metadata?.node_type === 'folder'
    )
    const documents = results.filter((r: any) =>
      r.metadata?.node_type === 'document'
    )

    return { folders, documents }
  }

  /**
   * Obtenir l'arbre complet de la mémoire
   */
  async getMemoryTree() {
    if (!this.mem0) await this.initialize()

    // Récupérer toutes les mémoires
    const allMemories = await this.mem0!.getAll({
      user_id: this.userId
    })

    // Construire l'arbre
    const tree = this.buildTreeFromMemories(allMemories?.memories || [])
    return tree
  }

  /**
   * Construire un arbre à partir des mémoires
   */
  private buildTreeFromMemories(memories: any[]) {
    const nodeMap = new Map()
    const rootNodes = []

    // Filtrer et organiser les mémoires
    const activeMemories = memories.filter(m =>
      m.metadata?.node_path &&
      (!m.metadata?.action || m.metadata.action !== 'delete')
    )

    // Créer les nœuds
    for (const memory of activeMemories) {
      const path = memory.metadata.node_path
      const parentPath = memory.metadata.parent_path || '/'

      const node = {
        id: memory.id,
        name: memory.metadata.node_name,
        type: memory.metadata.node_type,
        path: path,
        content: memory.memory,
        children: []
      }

      nodeMap.set(path, node)

      if (parentPath === '/') {
        rootNodes.push(node)
      }
    }

    // Lier les enfants aux parents
    for (const [path, node] of nodeMap) {
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/'
      const parent = nodeMap.get(parentPath)
      if (parent) {
        parent.children.push(node)
      }
    }

    return rootNodes
  }

  /**
   * Synchroniser un dossier avec Supabase (pour l'UI uniquement)
   */
  private async syncFolderToSupabase(node: MemoryNode, fullPath: string) {
    try {
      // Créer une entrée minimale dans Supabase pour l'affichage
      await supabase
        .from('memory_nodes')
        .upsert({
          project_id: this.projectId,
          name: node.name,
          type: 'folder',
          content: null,
          metadata: {
            mem0_synced: true,
            mem0_path: fullPath
          }
        })

      console.log('📦 Synced folder to Supabase for UI')
    } catch (error) {
      console.log('⚠️ Supabase sync skipped:', error)
      // Pas critique si la sync échoue
    }
  }

  /**
   * Migrer les données existantes de Supabase vers Mem0
   */
  async migrateFromSupabase() {
    console.log('🔄 Starting migration from Supabase to Mem0...')

    // Récupérer tous les nœuds de Supabase
    const { data: nodes } = await supabase
      .from('memory_nodes')
      .select('*')
      .eq('project_id', this.projectId)
      .order('created_at')

    if (!nodes || nodes.length === 0) {
      console.log('No nodes to migrate')
      return
    }

    // Migrer chaque nœud
    for (const node of nodes) {
      await this.createNode({
        name: node.name,
        type: node.type as 'folder' | 'document',
        content: node.content,
        parent: node.parent_id ? await this.getPathFromId(node.parent_id) : undefined,
        metadata: {
          original_id: node.id,
          migrated_at: new Date().toISOString()
        }
      })
    }

    console.log(`✅ Migrated ${nodes.length} nodes to Mem0`)
  }

  /**
   * Helper pour obtenir le chemin depuis un ID Supabase
   */
  private async getPathFromId(nodeId: string): Promise<string> {
    const { data } = await supabase
      .from('memory_nodes')
      .select('name, parent_id')
      .eq('id', nodeId)
      .single()

    if (!data) return '/'

    if (data.parent_id) {
      const parentPath = await this.getPathFromId(data.parent_id)
      return `${parentPath}/${data.name}`
    }

    return `/${data.name}`
  }
}

// Export singleton instance
let serviceInstance: MemoryServiceV2 | null = null

export async function getMemoryServiceV2(projectId: string, userId?: string): Promise<MemoryServiceV2> {
  if (!serviceInstance || serviceInstance['projectId'] !== projectId) {
    serviceInstance = new MemoryServiceV2(projectId, userId || 'default-user')
    await serviceInstance.initialize()
  }
  return serviceInstance
}