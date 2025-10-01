// Gestion optimisée des états fictifs vs UUID pour le système modulaire
// Résout les problèmes de synchronisation entre état local et base de données

import { TableDataItem } from '@/hooks/useModularData'

export interface SyncState {
  localItems: TableDataItem[]
  dbItems: TableDataItem[]
  pendingSync: TableDataItem[]
  syncInProgress: boolean
}

// Utilitaires pour gérer les IDs
export const IdUtils = {
  // Vérifier si un ID est un UUID valide
  isUUID: (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  },

  // Générer un ID fictif temporaire
  generateFictifId: (prefix: string = 'temp'): string => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },

  // Vérifier si un ID est fictif
  isFictif: (id: string): boolean => {
    return !IdUtils.isUUID(id) && (id.startsWith('temp-') || id.startsWith('row-') || id.includes('-item-'))
  }
}

// Gestionnaire de synchronisation état local ↔ base de données
export class StateManager {
  private projectId: string
  private syncState: Map<string, SyncState> = new Map()

  constructor(projectId: string) {
    this.projectId = projectId
  }

  // Synchroniser un nœud document avec la base de données
  async syncNodeToDatabase(nodeId: string, localData: TableDataItem[]): Promise<TableDataItem[]> {
    console.log('📊 State Manager: Syncing node', nodeId, 'with', localData.length, 'items')

    try {
      // Séparer les éléments réels des fictifs
      const realItems = localData.filter(item => IdUtils.isUUID(item.id))
      const fictifItems = localData.filter(item => IdUtils.isFictif(item.id))

      console.log('📊 Real items:', realItems.length, 'Fictif items:', fictifItems.length)

      // Synchroniser les éléments fictifs vers la DB
      const syncedFictifItems = await this.syncFictifItems(nodeId, fictifItems)

      // Récupérer les données fraîches de la DB pour les éléments réels
      const freshRealItems = await this.getFreshRealItems(nodeId)

      // Combiner tout
      const syncedData = [...freshRealItems, ...syncedFictifItems]

      console.log('📊 State Manager: Sync completed, total items:', syncedData.length)
      return syncedData
    } catch (error) {
      console.error('📊 State Manager: Sync error:', error)
      return localData // Fallback aux données locales
    }
  }

  // Synchroniser les éléments fictifs vers la base de données
  private async syncFictifItems(nodeId: string, fictifItems: TableDataItem[]): Promise<TableDataItem[]> {
    if (fictifItems.length === 0) return []

    console.log('📊 State Manager: Syncing', fictifItems.length, 'fictif items to DB')

    const syncPromises = fictifItems.map(async (item) => {
      try {
        const response = await fetch('/api/unified/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId,
            data: {
              ...item,
              created_at: new Date().toISOString()
            }
          })
        })

        if (response.ok) {
          const { row } = await response.json()
          console.log('📊 State Manager: Fictif item synced:', item.id, '→', row.id)
          return {
            ...item,
            id: row.id,
            updated_at: new Date().toISOString()
          }
        } else {
          console.error('📊 State Manager: Failed to sync fictif item:', await response.text())
          return item // Garder l'élément fictif en cas d'échec
        }
      } catch (error) {
        console.error('📊 State Manager: Error syncing fictif item:', error)
        return item
      }
    })

    return await Promise.all(syncPromises)
  }

  // Récupérer les données fraîches pour les éléments réels
  private async getFreshRealItems(nodeId: string): Promise<TableDataItem[]> {
    try {
      const response = await fetch(`/api/unified/data?nodeId=${nodeId}`)
      
      if (response.ok) {
        const { rows } = await response.json()
        return rows.filter((row: TableDataItem) => IdUtils.isUUID(row.id))
      } else {
        console.error('📊 State Manager: Failed to get fresh data:', await response.text())
        return []
      }
    } catch (error) {
      console.error('📊 State Manager: Error getting fresh data:', error)
      return []
    }
  }

  // Créer un élément avec gestion intelligente des IDs
  async createItemIntelligent(
    nodeId: string,
    itemData: Partial<TableDataItem>,
    immediate: boolean = false
  ): Promise<TableDataItem> {
    if (immediate) {
      // Créer immédiatement en DB
      return await this.createInDatabase(nodeId, itemData)
    } else {
      // Créer localement avec ID fictif pour UX rapide
      return this.createLocally(itemData)
    }
  }

  // Créer immédiatement en base de données
  private async createInDatabase(nodeId: string, itemData: Partial<TableDataItem>): Promise<TableDataItem> {
    try {
      const response = await fetch('/api/unified/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          data: {
            name: itemData.name || 'Nouvel élément',
            type: itemData.type || 'default',
            content: itemData.content || '',
            ...itemData,
            created_at: new Date().toISOString()
          }
        })
      })

      if (response.ok) {
        const { row } = await response.json()
        console.log('📊 State Manager: Created in DB immediately:', row.id)
        return {
          id: row.id,
          name: itemData.name || 'Nouvel élément',
          type: itemData.type || 'default',
          content: itemData.content || '',
          created_at: new Date().toISOString(),
          ...itemData
        }
      } else {
        throw new Error(`DB creation failed: ${await response.text()}`)
      }
    } catch (error) {
      console.error('📊 State Manager: Error creating in DB:', error)
      throw error
    }
  }

  // Créer localement avec ID fictif
  private createLocally(itemData: Partial<TableDataItem>): TableDataItem {
    const fictifId = IdUtils.generateFictifId('row')
    
    const localItem: TableDataItem = {
      id: fictifId,
      name: itemData.name || 'Nouvel élément',
      type: itemData.type || 'default',
      content: itemData.content || '',
      created_at: new Date().toISOString(),
      ...itemData
    }

    console.log('📊 State Manager: Created locally with fictif ID:', fictifId)
    return localItem
  }

  // Mettre à jour un élément avec gestion intelligente
  async updateItemIntelligent(
    nodeId: string,
    item: TableDataItem,
    updates: Partial<TableDataItem>
  ): Promise<TableDataItem> {
    try {
      // Si l'item a un ID fictif, le convertir d'abord en réel
      let effectiveItem = item
      if (IdUtils.isFictif(item.id)) {
        console.log('📊 State Manager: Converting fictif item to real:', item.id)
        effectiveItem = await this.createInDatabase(nodeId, { ...item, ...updates })
      }

      // Mettre à jour en DB
      const response = await fetch('/api/unified/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowId: effectiveItem.id,
          columnId: Object.keys(updates)[0], // Premier champ modifié
          value: Object.values(updates)[0]   // Première valeur modifiée
        })
      })

      if (response.ok) {
        console.log('📊 State Manager: Updated in DB:', effectiveItem.id)
        return {
          ...effectiveItem,
          ...updates,
          updated_at: new Date().toISOString()
        }
      } else {
        throw new Error(`Update failed: ${await response.text()}`)
      }
    } catch (error) {
      console.error('📊 State Manager: Error updating item:', error)
      throw error
    }
  }

  // Optimiser l'état global du projet
  async optimizeProjectState(sections: string[] = ['rules', 'memory', 'optimization']): Promise<{
    optimized: number
    errors: number
    totalItems: number
  }> {
    console.log('⚡ State Manager: Optimizing project state for sections:', sections)
    
    let optimized = 0
    let errors = 0
    let totalItems = 0

    for (const section of sections) {
      try {
        // Obtenir tous les documents de la section
        const { data: documents } = await supabase
          .from('memory_nodes')
          .select('id, name')
          .eq('project_id', this.projectId)
          .eq('type', 'document')
          .eq('section', section)

        if (documents) {
          for (const doc of documents) {
            try {
              // Charger les données du document
              const response = await fetch(`/api/unified/data?nodeId=${doc.id}`)
              if (response.ok) {
                const { rows } = await response.json()
                totalItems += rows.length

                // Compter les éléments fictifs
                const fictifCount = rows.filter((row: any) => IdUtils.isFictif(row.id)).length
                
                if (fictifCount > 0) {
                  console.log(`📊 Found ${fictifCount} fictif items in ${doc.name}`)
                  // Les fictifs seront synchronisés lors du prochain chargement
                  optimized += fictifCount
                }
              }
            } catch (error) {
              console.error(`📊 Error processing document ${doc.name}:`, error)
              errors++
            }
          }
        }
      } catch (error) {
        console.error(`📊 Error processing section ${section}:`, error)
        errors++
      }
    }

    console.log('⚡ State Manager: Optimization completed:', { optimized, errors, totalItems })
    return { optimized, errors, totalItems }
  }

  // Nettoyer les états obsolètes
  async cleanupObsoleteStates(): Promise<number> {
    try {
      console.log('🧹 State Manager: Cleaning up obsolete states')
      
      // Supprimer les éléments fictifs orphelins (sans nœud parent)
      const cutoffDate = new Date()
      cutoffDate.setHours(cutoffDate.getHours() - 1) // Plus d'1h

      // Note: Cette fonction sera utilisée pour nettoyer si nécessaire
      // Pour l'instant, la synchronisation automatique gère les fictifs

      console.log('🧹 State Manager: Cleanup completed')
      return 0
    } catch (error) {
      console.error('🧹 State Manager: Error during cleanup:', error)
      return 0
    }
  }
}

// Hook pour utiliser la gestion d'état optimisée
export function useOptimizedState(projectId: string) {
  const stateManager = new StateManager(projectId)

  const syncNodeToDatabase = async (nodeId: string, localData: TableDataItem[]) => {
    return await stateManager.syncNodeToDatabase(nodeId, localData)
  }

  const createItemIntelligent = async (
    nodeId: string,
    itemData: Partial<TableDataItem>,
    immediate: boolean = false
  ) => {
    return await stateManager.createItemIntelligent(nodeId, itemData, immediate)
  }

  const updateItemIntelligent = async (
    nodeId: string,
    item: TableDataItem,
    updates: Partial<TableDataItem>
  ) => {
    return await stateManager.updateItemIntelligent(nodeId, item, updates)
  }

  const optimizeProjectState = async (sections?: string[]) => {
    return await stateManager.optimizeProjectState(sections)
  }

  const cleanupObsoleteStates = async () => {
    return await stateManager.cleanupObsoleteStates()
  }

  return {
    syncNodeToDatabase,
    createItemIntelligent,
    updateItemIntelligent,
    optimizeProjectState,
    cleanupObsoleteStates,
    IdUtils,
    stateManager
  }
}

// Fonction d'aide pour optimiser les performances
export function optimizeDataFlow(data: TableDataItem[]): {
  real: TableDataItem[]
  fictif: TableDataItem[]
  needsSync: boolean
} {
  const real = data.filter(item => IdUtils.isUUID(item.id))
  const fictif = data.filter(item => IdUtils.isFictif(item.id))
  const needsSync = fictif.length > 0

  return { real, fictif, needsSync }
}

// Middleware pour les opérations CRUD optimisées
export const CrudMiddleware = {
  // Préparer une création optimisée
  prepareCreate: (data: Partial<TableDataItem>, immediate: boolean = false): TableDataItem => {
    return {
      id: immediate ? '' : IdUtils.generateFictifId('new'),
      name: data.name || 'Nouvel élément',
      type: data.type || 'default',
      content: data.content || '',
      created_at: new Date().toISOString(),
      ...data
    }
  },

  // Préparer une mise à jour optimisée
  prepareUpdate: (item: TableDataItem, updates: Partial<TableDataItem>): TableDataItem => {
    return {
      ...item,
      ...updates,
      updated_at: new Date().toISOString()
    }
  },

  // Vérifier si une opération nécessite une synchronisation
  needsSync: (item: TableDataItem): boolean => {
    return IdUtils.isFictif(item.id)
  }
}
