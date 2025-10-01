// Système de mémoire adaptative pour le pentesting intelligent
// La mémoire s'adapte automatiquement selon vos patterns d'usage

import { supabase } from '@/lib/supabase/client'
import { createEmbedding } from './embeddings'

export interface MemoryItem {
  id: string
  content: string
  context: string
  importance: number
  usage_count: number
  last_accessed: string
  embedding?: number[]
  metadata: Record<string, unknown>
}

export interface ContextualMemory {
  rules: MemoryItem[]
  successes: MemoryItem[]
  failures: MemoryItem[]
  techniques: MemoryItem[]
  targets: MemoryItem[]
}

export class AdaptiveMemory {
  private projectId: string
  private memoryCache: Map<string, MemoryItem[]> = new Map()
  private lastCacheUpdate: number = 0
  private cacheExpiry: number = 5 * 60 * 1000 // 5 minutes

  constructor(projectId: string) {
    this.projectId = projectId
  }

  // Ajouter un élément à la mémoire avec importance adaptative
  async addMemoryItem(
    content: string,
    context: string,
    type: 'rule' | 'success' | 'failure' | 'technique' | 'target',
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      console.log('🧠 Adaptive Memory: Adding item', type, 'for context', context)

      // Calculer l'importance basée sur le type et le contexte
      let importance = this.calculateImportance(content, context, type)

      // Créer l'embedding pour la recherche sémantique
      const embedding = await createEmbedding(content)

      // Déterminer la section appropriée
      let section = 'memory'
      if (type === 'rule') section = 'rules'
      else if (type === 'success' || type === 'failure') section = 'memory'
      else if (type === 'technique') section = 'optimization'

      // Déterminer le dossier parent selon le contexte
      let parentFolder = this.getParentFolder(context, type)

      // Chercher ou créer le dossier parent
      let parentId = await this.ensureParentFolder(parentFolder, section)

      // Créer le nœud mémoire
      const { data: memoryNode, error } = await supabase
        .from('memory_nodes')
        .insert({
          project_id: this.projectId,
          type: 'document',
          name: this.generateMemoryTitle(content, type),
          content: {
            raw_content: content,
            context,
            type,
            importance,
            created_by: 'adaptive_memory',
            auto_generated: true
          },
          icon: this.getTypeIcon(type),
          color: this.getTypeColor(type),
          parent_id: parentId,
          embedding,
          metadata: {
            ...metadata,
            adaptive_memory: true,
            importance,
            usage_count: 1,
            last_accessed: new Date().toISOString()
          }
        })
        .select()
        .single()

      if (!error && memoryNode) {
        console.log('🧠 Adaptive Memory: Added memory item successfully', memoryNode.id)
        this.invalidateCache()
      } else {
        console.error('🧠 Adaptive Memory: Error adding item:', error)
      }
    } catch (error) {
      console.error('🧠 Adaptive Memory: Exception adding item:', error)
    }
  }

  // Obtenir la mémoire contextuelle pour un message
  async getContextualMemory(
    userMessage: string, 
    context: string,
    limit: number = 10
  ): Promise<ContextualMemory> {
    try {
      console.log('🧠 Adaptive Memory: Getting contextual memory for', context)

      // Vérifier le cache d'abord
      const cacheKey = `${context}_${userMessage.substring(0, 50)}`
      if (this.isCacheValid() && this.memoryCache.has(cacheKey)) {
        const cached = this.memoryCache.get(cacheKey)!
        return this.organizeByType(cached)
      }

      // Générer embedding pour la recherche
      const queryEmbedding = await createEmbedding(userMessage)

      // Recherche par similarité vectorielle
      const { data: similarNodes } = await supabase.rpc('search_similar_nodes', {
        query_embedding: queryEmbedding,
        project_id: this.projectId,
        match_limit: limit * 2 // Récupérer plus pour filtrer
      })

      let memoryItems: MemoryItem[] = []

      if (similarNodes) {
        memoryItems = similarNodes
          .filter((node: any) => node.metadata?.adaptive_memory)
          .map((node: any) => ({
            id: node.id,
            content: node.content?.raw_content || node.content,
            context: node.content?.context || context,
            importance: node.metadata?.importance || 0.5,
            usage_count: node.metadata?.usage_count || 1,
            last_accessed: node.metadata?.last_accessed || node.created_at,
            embedding: node.embedding,
            metadata: node.metadata || {}
          }))
          .sort((a, b) => b.importance - a.importance) // Trier par importance
          .slice(0, limit)
      }

      // Si pas assez de résultats similaires, chercher par contexte
      if (memoryItems.length < 5) {
        const { data: contextNodes } = await supabase
          .from('memory_nodes')
          .select('*')
          .eq('project_id', this.projectId)
          .contains('metadata', { adaptive_memory: true })
          .contains('content', { context })
          .limit(limit - memoryItems.length)

        if (contextNodes) {
          const additionalItems = contextNodes.map((node: any) => ({
            id: node.id,
            content: node.content?.raw_content || node.content,
            context: node.content?.context || context,
            importance: node.metadata?.importance || 0.5,
            usage_count: node.metadata?.usage_count || 1,
            last_accessed: node.metadata?.last_accessed || node.created_at,
            embedding: node.embedding,
            metadata: node.metadata || {}
          }))

          memoryItems = [...memoryItems, ...additionalItems]
        }
      }

      // Mettre en cache
      this.memoryCache.set(cacheKey, memoryItems)
      this.lastCacheUpdate = Date.now()

      return this.organizeByType(memoryItems)
    } catch (error) {
      console.error('🧠 Adaptive Memory: Error getting contextual memory:', error)
      return { rules: [], successes: [], failures: [], techniques: [], targets: [] }
    }
  }

  // Calculer l'importance d'un élément mémoire
  private calculateImportance(content: string, context: string, type: string): number {
    let importance = 0.5 // Base

    // Bonus selon le type
    if (type === 'success') importance += 0.3
    else if (type === 'rule') importance += 0.2
    else if (type === 'technique') importance += 0.1

    // Bonus selon le contexte critique
    if (context === 'business-logic') importance += 0.2
    else if (context === 'authentication') importance += 0.15

    // Bonus selon la longueur et détail du contenu
    if (content.length > 100) importance += 0.1
    if (content.includes('exploit') || content.includes('payload')) importance += 0.1

    return Math.min(importance, 1.0)
  }

  // Obtenir le dossier parent selon contexte et type
  private getParentFolder(context: string, type: string): string {
    if (type === 'success') return 'Success'
    if (type === 'failure') return 'Failed'
    if (type === 'rule') return 'Rules'
    
    // Mapping contextuel
    switch (context) {
      case 'business-logic': return 'Business Logic'
      case 'authentication': return 'Authentication'
      case 'api-requests': return 'API Security'
      default: return 'General'
    }
  }

  // S'assurer que le dossier parent existe
  private async ensureParentFolder(folderName: string, section: string): Promise<string> {
    try {
      // Chercher le dossier existant
      const { data: existing } = await supabase
        .from('memory_nodes')
        .select('id')
        .eq('project_id', this.projectId)
        .eq('name', folderName)
        .eq('type', 'folder')
        .eq('section', section)
        .maybeSingle()

      if (existing) {
        return existing.id
      }

      // Créer le dossier
      const { data: newFolder, error } = await supabase
        .from('memory_nodes')
        .insert({
          project_id: this.projectId,
          type: 'folder',
          name: folderName,
          section,
          icon: '📁',
          color: this.getSectionColor(section),
          position: 0
        })
        .select()
        .single()

      if (!error && newFolder) {
        console.log('🧠 Adaptive Memory: Created parent folder', folderName)
        return newFolder.id
      } else {
        console.error('🧠 Adaptive Memory: Error creating folder:', error)
        throw error
      }
    } catch (error) {
      console.error('🧠 Adaptive Memory: Exception ensuring folder:', error)
      throw error
    }
  }

  // Organiser les éléments par type
  private organizeByType(items: MemoryItem[]): ContextualMemory {
    const result: ContextualMemory = {
      rules: [],
      successes: [],
      failures: [],
      techniques: [],
      targets: []
    }

    items.forEach(item => {
      const type = item.metadata.type as string
      switch (type) {
        case 'rule':
          result.rules.push(item)
          break
        case 'success':
          result.successes.push(item)
          break
        case 'failure':
          result.failures.push(item)
          break
        case 'technique':
          result.techniques.push(item)
          break
        case 'target':
          result.targets.push(item)
          break
      }
    })

    return result
  }

  // Générer un titre pour l'élément mémoire
  private generateMemoryTitle(content: string, type: string): string {
    const firstLine = content.split('\n')[0].substring(0, 50)
    const typePrefix = {
      'rule': '📋 Règle: ',
      'success': '✅ Succès: ',
      'failure': '❌ Échec: ',
      'technique': '🔧 Technique: ',
      'target': '🎯 Cible: '
    }

    return (typePrefix[type as keyof typeof typePrefix] || '') + firstLine
  }

  // Obtenir l'icône selon le type
  private getTypeIcon(type: string): string {
    const icons = {
      'rule': '📋',
      'success': '✅',
      'failure': '❌',
      'technique': '🔧',
      'target': '🎯'
    }
    return icons[type as keyof typeof icons] || '📄'
  }

  // Obtenir la couleur selon le type
  private getTypeColor(type: string): string {
    const colors = {
      'rule': '#3b82f6',
      'success': '#22c55e',
      'failure': '#ef4444',
      'technique': '#8b5cf6',
      'target': '#f59e0b'
    }
    return colors[type as keyof typeof colors] || '#6b7280'
  }

  // Obtenir la couleur selon la section
  private getSectionColor(section: string): string {
    const colors = {
      'rules': '#ef4444',
      'memory': '#3b82f6',
      'optimization': '#22c55e'
    }
    return colors[section as keyof typeof colors] || '#6b7280'
  }

  // Mettre à jour l'usage d'un élément
  async updateUsage(itemId: string): Promise<void> {
    try {
      const { data: current } = await supabase
        .from('memory_nodes')
        .select('metadata')
        .eq('id', itemId)
        .single()

      if (current) {
        const currentMetadata = current.metadata as any || {}
        const newUsageCount = (currentMetadata.usage_count || 0) + 1
        const newImportance = Math.min(
          (currentMetadata.importance || 0.5) + 0.05, // Légère augmentation
          1.0
        )

        await supabase
          .from('memory_nodes')
          .update({
            metadata: {
              ...currentMetadata,
              usage_count: newUsageCount,
              importance: newImportance,
              last_accessed: new Date().toISOString()
            }
          })
          .eq('id', itemId)

        console.log('🧠 Adaptive Memory: Updated usage for item', itemId)
        this.invalidateCache()
      }
    } catch (error) {
      console.error('🧠 Adaptive Memory: Error updating usage:', error)
    }
  }

  // Renforcer une technique via usage et adjustment importance (pour learning system)
  async reinforceTechnique(technique: string, context: string, success: boolean): Promise<void> {
    try {
      console.log(`🧠 Adaptive Memory: Reinforcing technique "${technique}" in context "${context}" - Success: ${success}`)

      // Chercher items mémoire liés à la technique et contexte
      const relatedItems = await this.searchMemory(technique, context, 10)

      if (relatedItems.length === 0) {
        // Si pas trouvé, ajouter un nouveau item mémoire pour la technique
        const content = success
          ? `Technique réussie: ${technique} dans contexte ${context}. Confiance augmentée.`
          : `Technique échouée: ${technique} dans contexte ${context}. Chercher alternatives.`
        const type = success ? 'success' : 'failure'
        await this.addMemoryItem(content, context, type, { technique })
        console.log('🧠 Adaptive Memory: Created new memory item for technique reinforcement')
        return
      }

      // Mettre à jour tous les items liés
      const updatePromises = relatedItems.map(async (item) => {
        await this.updateUsage(item.id)
        
        // Ajuster importance basée sur succès/échec
        const { data: current } = await supabase
          .from('memory_nodes')
          .select('metadata')
          .eq('id', item.id)
          .single()

        if (current) {
          const currentMetadata = current.metadata as any || {}
          let newImportance = currentMetadata.importance || 0.5
          
          if (success) {
            // Augmenter confiance pour succès
            newImportance = Math.min(newImportance + 0.1, 1.0)
          } else {
            // Diminuer confiance et suggérer alternatives pour échecs
            newImportance = Math.max(newImportance - 0.05, 0.1)
            // Optionnel: ajouter metadata pour alternatives
            if (!currentMetadata.alternatives) {
              currentMetadata.alternatives = []
            }
          }

          await supabase
            .from('memory_nodes')
            .update({
              metadata: {
                ...currentMetadata,
                importance: newImportance,
                reinforced_at: new Date().toISOString(),
                success_history: success ? (currentMetadata.success_history || 0) + 1 : (currentMetadata.success_history || 0)
              }
            })
            .eq('id', item.id)
        }
      })

      await Promise.all(updatePromises)
      console.log(`🧠 Adaptive Memory: Reinforced ${relatedItems.length} items for technique "${technique}"`)

      // Persistance via API pour sync global
      try {
        await fetch('/api/memory/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: this.projectId,
            type: 'reinforcement',
            technique,
            context,
            success,
            updatedItems: relatedItems.length
          })
        })
        console.log('🧠 Adaptive Memory: Synced reinforcement to /api/memory/update')
      } catch (apiError) {
        console.warn('🧠 Adaptive Memory: Failed to sync to API, but local update succeeded:', apiError)
      }

    } catch (error) {
      console.error('🧠 Adaptive Memory: Error in reinforceTechnique:', error)
    }
  }

  // Nettoyer la mémoire (supprimer les éléments peu utilisés)
  async cleanupMemory(minImportance: number = 0.2): Promise<number> {
    try {
      console.log('🧹 Adaptive Memory: Cleaning up low importance items')

      const { data: toDelete } = await supabase
        .from('memory_nodes')
        .select('id')
        .eq('project_id', this.projectId)
        .contains('metadata', { adaptive_memory: true })
        .lt('metadata->importance', minImportance)
        .lt('metadata->usage_count', 3)

      if (toDelete && toDelete.length > 0) {
        const { error } = await supabase
          .from('memory_nodes')
          .delete()
          .in('id', toDelete.map(item => item.id))

        if (!error) {
          console.log('🧹 Adaptive Memory: Cleaned up', toDelete.length, 'items')
          this.invalidateCache()
          return toDelete.length
        }
      }

      return 0
    } catch (error) {
      console.error('🧹 Adaptive Memory: Error during cleanup:', error)
      return 0
    }
  }

  // Optimiser la mémoire selon l'usage
  async optimizeMemory(): Promise<void> {
    try {
      console.log('⚡ Adaptive Memory: Optimizing memory structure')

      // Augmenter l'importance des éléments très utilisés
      await supabase
        .from('memory_nodes')
        .update({
          metadata: supabase.raw(`
            metadata || jsonb_build_object(
              'importance', 
              LEAST((metadata->>'importance')::float + 0.1, 1.0)
            )
          `)
        })
        .eq('project_id', this.projectId)
        .contains('metadata', { adaptive_memory: true })
        .gte('metadata->usage_count', 10)

      // Réduire l'importance des éléments anciens non utilisés
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 30)

      await supabase
        .from('memory_nodes')
        .update({
          metadata: supabase.raw(`
            metadata || jsonb_build_object(
              'importance', 
              GREATEST((metadata->>'importance')::float - 0.05, 0.1)
            )
          `)
        })
        .eq('project_id', this.projectId)
        .contains('metadata', { adaptive_memory: true })
        .lt('metadata->last_accessed', cutoffDate.toISOString())

      console.log('⚡ Adaptive Memory: Memory optimization completed')
      this.invalidateCache()
    } catch (error) {
      console.error('⚡ Adaptive Memory: Error optimizing:', error)
    }
  }

  // Rechercher dans la mémoire avec contexte
  async searchMemory(
    query: string,
    context?: string,
    limit: number = 5
  ): Promise<MemoryItem[]> {
    try {
      const queryEmbedding = await createEmbedding(query)

      let searchQuery = supabase
        .rpc('search_similar_nodes', {
          query_embedding: queryEmbedding,
          project_id: this.projectId,
          match_limit: limit
        })

      const { data } = await searchQuery

      if (!data) return []

      return data
        .filter((node: any) => node.metadata?.adaptive_memory)
        .filter((node: any) => !context || node.content?.context === context)
        .map((node: any) => ({
          id: node.id,
          content: node.content?.raw_content || node.content,
          context: node.content?.context || '',
          importance: node.metadata?.importance || 0.5,
          usage_count: node.metadata?.usage_count || 1,
          last_accessed: node.metadata?.last_accessed || node.created_at,
          embedding: node.embedding,
          metadata: node.metadata || {}
        }))
        .sort((a, b) => b.importance - a.importance)
    } catch (error) {
      console.error('🧠 Adaptive Memory: Error searching:', error)
      return []
    }
  }

  // Exporter la mémoire adaptative
  async exportMemory(): Promise<string> {
    try {
      const { data } = await supabase
        .from('memory_nodes')
        .select('*')
        .eq('project_id', this.projectId)
        .contains('metadata', { adaptive_memory: true })
        .order('metadata->importance', { ascending: false })

      const exportData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        project_id: this.projectId,
        memory_items: (data || []).map(node => ({
          content: node.content,
          context: node.content?.context,
          type: node.content?.type,
          importance: node.metadata?.importance,
          usage_count: node.metadata?.usage_count,
          metadata: node.metadata
        }))
      }

      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error('🧠 Adaptive Memory: Error exporting:', error)
      return ''
    }
  }

  // Importer la mémoire adaptative
  async importMemory(memoryJson: string): Promise<boolean> {
    try {
      const data = JSON.parse(memoryJson)
      
      if (!data.memory_items) return false

      const importPromises = data.memory_items.map(async (item: any) => {
        await this.addMemoryItem(
          item.content,
          item.context,
          item.type,
          { ...item.metadata, imported: true }
        )
      })

      await Promise.all(importPromises)
      console.log('📥 Adaptive Memory: Imported', data.memory_items.length, 'memory items')
      return true
    } catch (error) {
      console.error('📥 Adaptive Memory: Error importing:', error)
      return false
    }
  }

  // Utilitaires de cache
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheExpiry
  }

  private invalidateCache(): void {
    this.memoryCache.clear()
    this.lastCacheUpdate = 0
  }

  // Obtenir les statistiques de la mémoire
  async getMemoryStats(): Promise<{
    total: number
    byType: Record<string, number>
    byContext: Record<string, number>
    avgImportance: number
  }> {
    try {
      const { data } = await supabase
        .from('memory_nodes')
        .select('content, metadata')
        .eq('project_id', this.projectId)
        .contains('metadata', { adaptive_memory: true })

      if (!data) return { total: 0, byType: {}, byContext: {}, avgImportance: 0 }

      const stats = {
        total: data.length,
        byType: {} as Record<string, number>,
        byContext: {} as Record<string, number>,
        avgImportance: 0
      }

      let totalImportance = 0

      data.forEach((item: any) => {
        const type = item.content?.type || 'unknown'
        const context = item.content?.context || 'unknown'
        const importance = item.metadata?.importance || 0.5

        stats.byType[type] = (stats.byType[type] || 0) + 1
        stats.byContext[context] = (stats.byContext[context] || 0) + 1
        totalImportance += importance
      })

      stats.avgImportance = totalImportance / data.length

      return stats
    } catch (error) {
      console.error('🧠 Adaptive Memory: Error getting stats:', error)
      return { total: 0, byType: {}, byContext: {}, avgImportance: 0 }
    }
  }
}

// Hook pour utiliser la mémoire adaptative
export function useAdaptiveMemory(projectId: string) {
  const adaptiveMemory = new AdaptiveMemory(projectId)

  const addMemoryItem = async (
    content: string,
    context: string,
    type: 'rule' | 'success' | 'failure' | 'technique' | 'target',
    metadata: Record<string, unknown> = {}
  ) => {
    await adaptiveMemory.addMemoryItem(content, context, type, metadata)
  }

  const getContextualMemory = async (userMessage: string, context: string) => {
    return await adaptiveMemory.getContextualMemory(userMessage, context)
  }

  const searchMemory = async (query: string, context?: string) => {
    return await adaptiveMemory.searchMemory(query, context)
  }

  const updateUsage = async (itemId: string) => {
    await adaptiveMemory.updateUsage(itemId)
  }

  const optimizeMemory = async () => {
    await adaptiveMemory.optimizeMemory()
  }

  const cleanupMemory = async (minImportance: number = 0.2) => {
    return await adaptiveMemory.cleanupMemory(minImportance)
  }

  const getMemoryStats = async () => {
    return await adaptiveMemory.getMemoryStats()
  }

  return {
    addMemoryItem,
    getContextualMemory,
    searchMemory,
    updateUsage,
    optimizeMemory,
    cleanupMemory,
    getMemoryStats,
    adaptiveMemory
  }
}
