/**
 * Memory Service V3 - Version optimisée utilisant TOUTE la puissance de Mem0
 *
 * Améliorations par rapport à V2:
 * - Update direct par ID
 * - Recherche RAG vectorielle automatique
 * - Contexte conversationnel intégré
 * - History API pour le versioning
 * - Filtres avancés (date, catégorie, etc.)
 * - Support des agent_id pour multi-agents
 */

import { MemoryClient } from 'mem0ai'

interface MemoryOptions {
  user_id?: string
  agent_id?: string
  app_id?: string
  run_id?: string
  metadata?: Record<string, any>
  filters?: Record<string, any>
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export class MemoryServiceV3 {
  private mem0: MemoryClient | null = null
  private projectId: string
  private userId: string
  private agentId: string = 'bci-assistant'

  constructor(projectId: string, userId: string = 'default-user') {
    this.projectId = projectId
    // On garde l'isolation par projet
    this.userId = `${projectId}-${userId}`
  }

  async initialize() {
    // Utiliser la config avec valeurs par défaut
    const { getMem0Config } = await import('@/lib/config/mem0')
    const config = getMem0Config()

    const apiKey = config.apiKey

    if (!apiKey) {
      throw new Error('MEM0_API_KEY is required')
    }

    this.mem0 = new MemoryClient({ apiKey })
    console.log('✅ Memory Service V3 initialized with full Mem0 capabilities')
  }

  /**
   * 1. CONTEXTE CONVERSATIONNEL - La vraie force de Mem0
   * Passer directement les messages du chat pour que Mem0 extraie automatiquement les infos importantes
   */
  async addFromConversation(messages: ChatMessage[], options?: Partial<MemoryOptions>) {
    if (!this.mem0) await this.initialize()

    // Mem0 va automatiquement:
    // - Extraire les infos importantes
    // - Déduper les doublons
    // - Mettre à jour les infos existantes
    // - Créer des liens sémantiques
    const result = await this.mem0!.add(messages, {
      user_id: this.userId,
      agent_id: options?.agent_id || this.agentId,
      metadata: {
        project_id: this.projectId,
        timestamp: new Date().toISOString(),
        ...options?.metadata
      },
      ...options
    })

    return result
  }

  /**
   * 2. UPDATE DIRECT - Pas de workarounds, utiliser l'API native
   */
  async updateMemory(memoryId: string, newContent: string) {
    if (!this.mem0) await this.initialize()

    return await this.mem0!.update(memoryId, newContent)
  }

  /**
   * 3. RECHERCHE RAG VECTORIELLE - Utiliser la vraie puissance de recherche
   */
  async searchWithContext(query: string, options?: {
    limit?: number
    threshold?: number
    rerank?: boolean
  }) {
    if (!this.mem0) await this.initialize()

    // Recherche vectorielle avec similarité sémantique
    const results = await this.mem0!.search(query, {
      user_id: this.userId,
      agent_id: this.agentId,
      limit: options?.limit || 10,
      threshold: options?.threshold || 0.5
    })

    return results
  }

  /**
   * 4. FILTRES AVANCÉS - Utiliser les capacités de filtrage
   */
  async searchWithFilters(query: string, filters: {
    created_after?: Date
    created_before?: Date
    categories?: string[]
    metadata_filters?: Record<string, any>
  }) {
    if (!this.mem0) await this.initialize()

    const searchFilters: any = {
      user_id: [this.userId]
    }

    if (filters.created_after) {
      searchFilters.created_at = { gte: filters.created_after.toISOString() }
    }

    if (filters.categories?.length) {
      searchFilters.categories = filters.categories
    }

    // V2 API avec filtres avancés
    return await this.mem0!.search(query, {
      version: 'v2',
      filters: searchFilters
    })
  }

  /**
   * 5. HISTORY - Tracker les versions des mémoires
   */
  async getMemoryHistory(memoryId: string) {
    if (!this.mem0) await this.initialize()

    return await this.mem0!.history(memoryId)
  }

  /**
   * 6. CONTEXTE AUGMENTÉ - Récupérer le contexte pertinent pour une conversation
   */
  async getRelevantContext(currentMessage: string, options?: {
    includeHistory?: boolean
    maxTokens?: number
  }) {
    if (!this.mem0) await this.initialize()

    // Recherche sémantique pour trouver les mémoires pertinentes
    const relevantMemories = await this.searchWithContext(currentMessage, {
      limit: 5,
      threshold: 0.6,
      rerank: true
    })

    // Récupérer aussi les mémoires récentes
    const recentMemories = await this.mem0!.getAll({
      user_id: this.userId,
      agent_id: this.agentId,
      page_size: 5
    })

    return {
      relevant: relevantMemories,
      recent: recentMemories,
      formatted: this.formatContext(relevantMemories, recentMemories)
    }
  }

  /**
   * 7. DELETE avec options avancées
   */
  async deleteMemory(memoryId: string) {
    if (!this.mem0) await this.initialize()

    return await this.mem0!.delete(memoryId)
  }

  async deleteAll(options?: {
    agent_id?: string
    before_date?: Date
  }) {
    if (!this.mem0) await this.initialize()

    return await this.mem0!.deleteAll({
      user_id: this.userId,
      agent_id: options?.agent_id || this.agentId
    })
  }

  /**
   * 8. CATÉGORIES ET TAGS - Organiser les mémoires
   */
  async addWithCategories(content: string, categories: string[], metadata?: any) {
    if (!this.mem0) await this.initialize()

    const messages = [
      { role: 'user' as const, content },
      { role: 'assistant' as const, content: `Stored: ${content}` }
    ]

    return await this.mem0!.add(messages, {
      user_id: this.userId,
      agent_id: this.agentId,
      categories,
      metadata: {
        project_id: this.projectId,
        ...metadata
      }
    })
  }

  /**
   * 9. BULK OPERATIONS - Opérations en masse
   */
  async addMultiple(memories: Array<{ content: string, metadata?: any }>) {
    if (!this.mem0) await this.initialize()

    const promises = memories.map(mem => {
      const messages = [
        { role: 'user' as const, content: mem.content },
        { role: 'assistant' as const, content: `Acknowledged: ${mem.content}` }
      ]

      return this.mem0!.add(messages, {
        user_id: this.userId,
        agent_id: this.agentId,
        metadata: {
          project_id: this.projectId,
          ...mem.metadata
        }
      })
    })

    return await Promise.all(promises)
  }

  /**
   * 10. STATS ET ANALYTICS - Obtenir des stats sur les mémoires
   */
  async getMemoryStats() {
    if (!this.mem0) await this.initialize()

    const allMemories = await this.mem0!.getAll({
      user_id: this.userId,
      page_size: 100
    })

    return {
      total: allMemories?.length || 0,
      by_agent: this.groupByAgent(allMemories),
      recent: this.getRecentStats(allMemories),
      categories: this.getCategoryStats(allMemories)
    }
  }

  // Helpers privés
  private formatContext(relevant: any, recent: any): string {
    let context = '## Contexte pertinent:\n'

    if (relevant?.length > 0) {
      context += '\n### Mémoires liées:\n'
      relevant.forEach((mem: any) => {
        context += `- ${mem.memory}\n`
      })
    }

    if (recent?.length > 0) {
      context += '\n### Mémoires récentes:\n'
      recent.slice(0, 3).forEach((mem: any) => {
        context += `- ${mem.memory}\n`
      })
    }

    return context
  }

  private groupByAgent(memories: any[]): Record<string, number> {
    const groups: Record<string, number> = {}
    memories?.forEach(mem => {
      const agent = mem.agent_id || 'default'
      groups[agent] = (groups[agent] || 0) + 1
    })
    return groups
  }

  private getRecentStats(memories: any[]): any {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    return {
      last_24h: memories?.filter(m =>
        new Date(m.created_at) > oneDayAgo
      ).length || 0,
      last_week: memories?.filter(m =>
        new Date(m.created_at) > oneWeekAgo
      ).length || 0
    }
  }

  private getCategoryStats(memories: any[]): Record<string, number> {
    const cats: Record<string, number> = {}
    memories?.forEach(mem => {
      mem.categories?.forEach((cat: string) => {
        cats[cat] = (cats[cat] || 0) + 1
      })
    })
    return cats
  }
}

// Export singleton factory
let instances: Map<string, MemoryServiceV3> = new Map()

export async function getMemoryServiceV3(projectId: string, userId?: string): Promise<MemoryServiceV3> {
  const key = `${projectId}-${userId || 'default'}`

  if (!instances.has(key)) {
    const service = new MemoryServiceV3(projectId, userId)
    await service.initialize()
    instances.set(key, service)
  }

  return instances.get(key)!
}