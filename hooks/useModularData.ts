import { useState, useCallback, useEffect } from 'react'
import { useAdaptiveMemory } from '@/lib/services/adaptiveMemory'
import { useIntelligentTargeting } from '@/lib/services/intelligentTargeting'
import { supabase } from '@/lib/supabase/client'
import { SimpleRule } from '@/lib/rules/simpleRules'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'
import { MemoryNode } from '@/lib/types'

export interface TableDataItem {
  id: string
  name: string
  type: string
  content?: string
  instructions?: string
  created_at: string
  updated_at?: string
  targetFolder?: string
  trigger?: string
  action?: string
  priority?: number
  enabled?: boolean
  url?: string
  severity?: string
  impact?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

// Update TreeNode to use types from lib/types
export interface TreeNode extends MemoryNode {
  searchScore?: number
  tags?: string[]
}

interface ColumnConfig {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'json'
  width?: number
  required?: boolean
  options?: string[]
  section: string
}

interface BreadcrumbItem {
  id: string
  name: string
  icon?: string
  color?: string
}

// Fonction de détection automatique de langage pour Monaco Editor - SIMPLIFIÉE
export function detectLanguage(
  content: string,
  section: string,
  nodeType: 'folder' | 'document' | 'rule' = 'document'
): string {
  if (!content || typeof content !== 'string') return 'plaintext';

  const lowerContent = content.toLowerCase().trim();

  // Détection basée sur la section
  if (section === 'rules') return 'json';
  if (section === 'memory') return 'markdown';
  if (section === 'optimization') return 'javascript';

  // Détection générale simplifiée
  if (lowerContent.startsWith('{') && lowerContent.endsWith('}')) {
    try {
      JSON.parse(content);
      return 'json';
    } catch {
      return 'plaintext';
    }
  }

  if (lowerContent.match(/\b(select|insert|update|delete)\b/i)) return 'sql';
  if (lowerContent.match(/\b(function|const|let|=>)\b/)) return 'javascript';
  if (lowerContent.startsWith('# ') || lowerContent.includes('- ')) return 'markdown';

  return nodeType === 'document' ? 'markdown' : 'plaintext';
}

export function useModularData(projectId: string) {
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [rulesData, setRulesData] = useState<SimpleRule[]>([])
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [columns, setColumns] = useState<ColumnConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<TreeNode[]>([])

  // HOOKS ESSENTIELS POUR LE COPILOT
  const { searchMemory, updateUsage, addMemoryItem } = useAdaptiveMemory(projectId)
  const { analyzeTarget } = useIntelligentTargeting(projectId)

  // Fonction de recherche sémantique intégrée
  const semanticSearch = useCallback(async (query: string): Promise<TreeNode[]> => {
    if (!query.trim()) {
      setSearchResults([])
      return []
    }

    try {
      // Recherche sémantique via adaptiveMemory sur tout le contenu
      const memoryResults = await searchMemory(query, 'unified_board')
      
      // Mapper les résultats mémoire vers les nœuds treeData
      const results: TreeNode[] = []
      memoryResults.forEach((item: { metadata: { node_id?: string }, importance: number }) => {
        // Chercher le nœud correspondant dans treeData
        const findMatchingNode = (nodes: TreeNode[]): TreeNode | undefined => {
          for (const node of nodes) {
            if (node.id === item.metadata?.node_id ||
                node.name.toLowerCase().includes(query.toLowerCase()) ||
                node.data?.some((row: TableDataItem) =>
                  row.content?.toLowerCase().includes(query.toLowerCase()) ||
                  row.name?.toLowerCase().includes(query.toLowerCase())
                )) {
              return { ...node, searchScore: item.importance } // Ajouter score pour ranking
            }
            if (node.children) {
              const found = findMatchingNode(node.children)
              if (found) return found
            }
          }
          return undefined
        }

        const matchingNode = findMatchingNode(treeData)
        if (matchingNode) {
          results.push(matchingNode)
        }
      })

      // Trier par score sémantique et pertinence
      results.sort((a, b) => ((b as any).searchScore || 0) - ((a as any).searchScore || 0))
      setSearchResults(results)
      return results
    } catch (err) {
      console.error('Erreur recherche sémantique:', err)
      setSearchResults([])
      return []
    }
  }, [treeData, searchMemory])

  // Données par défaut si la base n'est pas disponible
  const getDefaultData = useCallback((section: string): TreeNode[] => {
    const baseData: TreeNode[] = [
      {
        id: `${section}-folder-1`,
        name: section === 'rules' ? 'Règles Globales' : section === 'memory' ? 'Failed' : 'Performance',
        type: 'folder' as const,
        section,
        parent_id: null,
        icon: section === 'rules' ? '🌐' : section === 'memory' ? '❌' : '🚀',
        color: section === 'rules' ? '#3b82f6' : section === 'memory' ? '#ef4444' : '#8b5cf6',
        position: 1,
        data: [],
        children: []
      },
      {
        id: `${section}-doc-1`,
        name: section === 'rules' ? 'Règles Générales' : section === 'memory' ? 'Échecs de Pentesting' : 'Optimisations IA',
        type: 'document' as const,
        section,
        parent_id: `${section}-folder-1`,
        icon: '📄',
        color: '#6b7280',
        position: 1,
        data: [{
          id: uuidv4(),  // Changed from `${section}-item-1` to real UUID
          name: `Exemple ${section}`,
          type: section,
          content: `Contenu exemple pour ${section}`,
          created_at: new Date().toISOString()
        }],
        children: []
      }
    ]
    return baseData
  }, [])

  // Add getNodeDepth function
  const getNodeDepth = useCallback((nodes: TreeNode[], targetId: string, currentDepth: number = 0): number => {
    for (const node of nodes) {
      if (node.id === targetId) return currentDepth
      if (node.children) {
        const foundDepth = getNodeDepth(node.children, targetId, currentDepth + 1)
        if (foundDepth !== -1) return foundDepth
      }
    }
    return -1
  }, [])

  // Organiser les données en structure d'arbre avec niveaux et paths
  const organizeTreeData = useCallback((flatData: unknown[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>()
    const rootNodes: TreeNode[] = []

    // Créer tous les nœuds avec informations étendues
    flatData.forEach((item: unknown) => {
      const dataItem = item as Record<string, unknown>
      const node: TreeNode = {
        id: String(dataItem.id),
        name: String(dataItem.name),
        type: dataItem.type as 'folder' | 'document',
        section: String(dataItem.section),
        icon: String(dataItem.icon || '📁'),
        color: String(dataItem.color || '#6b7280'),
        position: Number(dataItem.position || 0),
        parent_id: dataItem.parent_id ? String(dataItem.parent_id) : null,
        children: [],
        data: (dataItem.data as TableDataItem[]) || [],
        level: 0,
        path: [],
        isExpanded: expandedNodes.has(String(dataItem.id)),
        metadata: (dataItem.metadata as Record<string, unknown>) || {},
        tags: (dataItem.tags as string[]) || []
      }
      nodeMap.set(node.id, node)
    })

    // Organiser la hiérarchie avec calcul des niveaux et paths
    const calculateLevelsAndPaths = (node: TreeNode, level: number = 0, path: string[] = []) => {
      node.level = level
      node.path = [...path, node.name]
      
      if (node.children) {
        node.children.forEach(child => {
          calculateLevelsAndPaths(child, level + 1, node.path)
        })
      }
    }

    // Construire la hiérarchie
    nodeMap.forEach(node => {
      if (node.parent_id) {
        const parent = nodeMap.get(node.parent_id)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(node)
        }
      } else {
        rootNodes.push(node)
      }
    })

    // Calculer niveaux et paths
    rootNodes.forEach(node => calculateLevelsAndPaths(node))

    // After building hierarchy, set levels
    const setLevels = (nodes: TreeNode[], level: number = 0) => {
      nodes.forEach(node => {
        node.level = level
        if (node.children) {
          setLevels(node.children, level + 1)
        }
      })
    }
    
    setLevels(rootNodes)
    return rootNodes.sort((a, b) => (a.position || 0) - (b.position || 0))
  }, [expandedNodes])

  // Colonnes par défaut selon la section
  const getDefaultColumns = useCallback((section: string): ColumnConfig[] => {
    const baseColumns: ColumnConfig[] = [
      { id: 'name', name: 'Nom', type: 'text', required: true, section },
      { id: 'type', name: 'Type', type: 'select', section, options: [section, 'autre'] },
      { id: 'content', name: 'Contenu', type: 'text', section }
    ]

    if (section === 'rules') {
      baseColumns.push(
        { id: 'targetFolder', name: 'Dossier Cible', type: 'select', section, options: [] },
        { id: 'trigger', name: 'Déclencheur', type: 'text', section },
        { id: 'action', name: 'Action', type: 'text', section },
        { id: 'priority', name: 'Priorité', type: 'number', section },
        { id: 'enabled', name: 'Activée', type: 'boolean', section },
        { id: 'success_history', name: 'Succès Historique', type: 'number', section }
      )
    } else if (section === 'memory') {
      baseColumns.push(
        { id: 'url', name: 'URL', type: 'text', section },
        { id: 'severity', name: 'Sévérité', type: 'select', section, options: ['Faible', 'Moyen', 'Élevé', 'Critique'] }
      )
    }

    baseColumns.push({ id: 'actions', name: 'Actions', type: 'text', section })
    return baseColumns
  }, [])

  // Charger les règles depuis l'API avec priorisation historique
  const loadRules = useCallback(async () => {
    try {
      const response = await fetch(`/api/rules/simple?projectId=${projectId}`)
      if (response.ok) {
        const { rules } = await response.json()
        // Priorisation : d'abord par priority asc, puis par success_history desc (si metadata existe)
        const prioritizedRules = rules.sort((a: SimpleRule, b: SimpleRule) => {
          const prioA = a.priority || 999
          const prioB = b.priority || 999
          if (prioA !== prioB) return prioA - prioB
          const successA = Number(a.metadata?.success_history || 0)
          const successB = Number(b.metadata?.success_history || 0)
          return successB - successA
        })
        setRulesData(prioritizedRules)
        return prioritizedRules
      }
    } catch (err) {
      console.error('Erreur chargement règles:', err)
    }
    return []
  }, [projectId])

  // Fonction pour attacher les rows aux nœuds documents de l'arbre
  const attachRowsToTree = useCallback(async (tree: TreeNode[], section: string): Promise<TreeNode[]> => {
    console.log('attachRowsToTree called');
    console.log('Modular load: syncing local to DB');
    
    const attachRecursive = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
      return Promise.all(nodes.map(async (node: TreeNode) => {
        const updatedNode = { ...node };
        
        if (node.type === 'document') {
          try {
            const response = await fetch(`/api/unified/data?projectId=${projectId}&nodeId=${node.id}`);
            if (response.ok) {
              const { rows } = await response.json();
              updatedNode.data = rows || [];
              console.log(`Rows attached to ${node.name}:`, rows.length);
            } else {
              console.warn(`Failed to fetch rows for ${node.id}: ${response.status}`);
            }
          } catch (err) {
            console.error(`Erreur attach rows for ${node.id}:`, err);
          }
        }
        
        if (node.children && node.children.length > 0) {
          updatedNode.children = await attachRecursive(node.children);
        }
        
        return updatedNode;
      }));
    };
    
    return attachRecursive(tree);
  }, [projectId]);

  // Créer un nouveau nœud via API
  const createNode = async (nodeData: Partial<TreeNode>): Promise<TreeNode | null> => {
    try {
      // CORRECTION CRITIQUE: S'assurer que la section est correctement définie
      if (!nodeData.section) {
        console.error('ERREUR: Section manquante lors de createNode!')
        return null
      }

      // Check hierarchy limit
      if (nodeData.parent_id) {
        const parentDepth = getNodeDepth(treeData, nodeData.parent_id as string)
        if (parentDepth >= 2) {
          toast.error('Limite de hiérarchie atteinte (max 2 niveaux)')
          return null
        }
      }

      // CORRECTION CRITIQUE: Mapper les types frontend vers API
      const apiType = nodeData.type === 'document' ? 'table' : (nodeData.type || 'folder')
      
      const body = {
        type: apiType,
        parent_id: nodeData.parent_id,
        section: nodeData.section,
        title: nodeData.name || 'Nouveau élément',
        content: nodeData.content,
        view_mode: nodeData.type === 'folder' || nodeData.type === 'document' ? 'table' : undefined,
        projectId
      }

      const res = await fetch('/api/board/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      console.log('Modular createNode called:', body, 'Response status:', res.status)

      if (res.ok) {
        const result = await res.json()
        console.log('Modular createNode response:', result)

        // Refresh data after creation
        await loadData(nodeData.section as string)

        return result.node as TreeNode
      } else {
        const errorText = await res.text()
        console.error('Create node failed:', res.status, errorText)
        toast.error('Erreur création: ' + errorText)
        return null
      }
    } catch (err) {
      console.error('Erreur createNode API:', err)
      setError(err instanceof Error ? err.message : 'Erreur création node')
      return null
    }
  }

  // Créer la structure par défaut via API
  const createDefaultStructure = useCallback(async (section: string): Promise<boolean> => {
    console.log('Modular load: creating default structure for section', section);
    
    try {
      // Structure simplifiée pour le pentesting
      const structures = {
        rules: [
          { name: 'Rules', type: 'folder', icon: '📋', color: '#3b82f6' },
          { name: 'Business Logic', type: 'folder', icon: '💼', color: '#8b5cf6', parent: 'Rules' },
          { name: 'Authentication', type: 'folder', icon: '🔐', color: '#ef4444', parent: 'Rules' }
        ],
        memory: [
          { name: 'Success', type: 'folder', icon: '✅', color: '#22c55e' },
          { name: 'Failed', type: 'folder', icon: '❌', color: '#ef4444' },
          { name: 'Plan', type: 'folder', icon: '📋', color: '#f59e0b' },
          { name: 'SQLi Tests', type: 'document', icon: '🗃️', color: '#6b7280', parent: 'Success' },
          { name: 'XSS Tests', type: 'document', icon: '🗃️', color: '#6b7280', parent: 'Failed' }
        ],
        optimization: [
          { name: 'Performance', type: 'folder', icon: '🚀', color: '#8b5cf6' },
          { name: 'Memory Usage', type: 'document', icon: '📊', color: '#6b7280', parent: 'Performance' }
        ]
      }

      const sectionStructure = structures[section as keyof typeof structures] || []
      const createdNodes = new Map<string, any>()

      // Créer les dossiers d'abord
      for (const item of sectionStructure.filter(s => s.type === 'folder')) {
        const parentId = item.parent ? createdNodes.get(item.parent)?.id : null
        
        const folderData = {
          name: item.name,
          type: 'folder' as const,
          section,
          parent_id: parentId,
          icon: item.icon,
          color: item.color
        }
        
        const folder = await createNode(folderData)
        if (folder) {
          createdNodes.set(item.name, folder)
          console.log(`Created folder: ${item.name}`)
        }
      }

      // Créer les documents ensuite
      for (const item of sectionStructure.filter(s => s.type === 'document')) {
        const parentId = item.parent ? createdNodes.get(item.parent)?.id : null
        
        const docData = {
          name: item.name,
          type: 'document' as const,
          section,
          parent_id: parentId,
          icon: item.icon,
          color: item.color
        }
        
        const doc = await createNode(docData)
        if (doc) {
          createdNodes.set(item.name, doc)
          console.log(`Created document: ${item.name}`)
          
          // Ajouter une ligne d'exemple
          const defaultRow = {
            name: `Exemple ${item.name}`,
            type: section,
            content: `# ${item.name}\n\nContenu exemple pour ${item.name}`,
            created_at: new Date().toISOString()
          }
          
          const res = await fetch('/api/unified/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodeId: doc.id, data: defaultRow })
          })
          
          if (res.ok) {
            console.log(`Created example row for: ${item.name}`)
          }
        }
      }
      
      return true;
    } catch (err) {
      console.error('Modular load: error creating default structure:', err);
      return false;
    }
  }, [projectId]);

  // Fonction pour synchroniser les rows locaux vers DB si IDs fictifs détectés
  const syncLocalToDB = useCallback(async (tree: TreeNode[]): Promise<TreeNode[]> => {
    console.log('Modular load: syncing local rows to DB');
    
    const isUUID = (id: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };

    const syncRecursive = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
      return Promise.all(nodes.map(async (node: TreeNode) => {
        const updatedNode = { ...node };
        
        if (node.type === 'document' && node.data && node.data.length > 0) {
          const realRows = node.data.filter(row => isUUID(row.id));
          const fakeRows = node.data.filter(row => !isUUID(row.id));
          
          if (fakeRows.length > 0) {
            console.log('Modular load: syncing', fakeRows.length, 'fictif rows to DB for node', node.id);
          }
          
          const syncedFakePromises = fakeRows.map(async (row) => {
            const body = {
              nodeId: node.id,
              data: row
            };
            
            try {
              const res = await fetch('/api/unified/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
              
              if (res.ok) {
                const { row: newRow } = await res.json();
                console.log('Modular load: fictif ids to UUID in DB for row', row.id, '->', newRow.id);
                return { ...row, id: newRow.id, updated_at: new Date().toISOString() };
              } else {
                console.error('Modular load: failed to sync fictif row:', await res.text());
                return row;
              }
            } catch (err) {
              console.error('Modular load: error syncing fictif row:', err);
              return row;
            }
          });
          
          const syncedFakeRows = await Promise.all(syncedFakePromises);
          
          updatedNode.data = [...realRows, ...syncedFakeRows];
        }
        
        if (node.children && node.children.length > 0) {
          updatedNode.children = await syncRecursive(node.children);
        }
        
        return updatedNode;
      }));
    };
    
    return syncRecursive(tree);
  }, [projectId]);

  // Fonction syncFictifToReal pour remplacer ids fictifs par UUID (créer rows en batch via API si nécessaire)
  const syncFictifToReal = useCallback(async (tree: TreeNode[]): Promise<TreeNode[]> => {
    console.log('Modular load: starting syncFictifToReal - syncing fictif ids to UUID in DB');
    
    const isUUIDLocal = (id: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };
    
    const syncRecursive = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
      return Promise.all(nodes.map(async (node: TreeNode) => {
        const updatedNode = { ...node };
        
        if (node.type === 'document' && node.data && node.data.length > 0) {
          const realRows = node.data.filter((row: TableDataItem) => isUUIDLocal(row.id));
          const fakeRows = node.data.filter((row: TableDataItem) => !isUUIDLocal(row.id));
          
          if (fakeRows.length > 0) {
            console.log(`Modular load: batch syncing ${fakeRows.length} fictif rows for node ${node.id}`);
          }
          
          const syncPromises = fakeRows.map(async (row: TableDataItem) => {
            const body = {
              nodeId: node.id,
              data: row
            };
            
            try {
              const res = await fetch('/api/unified/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
              
              if (res.ok) {
                const { row: newRow } = await res.json();
                console.log('Modular load: fictif row synced to real UUID', newRow.id);
                return { ...row, id: newRow.id, updated_at: new Date().toISOString() } as TableDataItem;
              } else {
                console.error('Modular load: failed to sync fictif row to DB:', await res.text());
                return row;
              }
            } catch (err) {
              console.error('Modular load: error syncing fictif row:', err);
              return row;
            }
          });
          
          const syncedFakeRows = await Promise.all(syncPromises);
          updatedNode.data = [...realRows, ...syncedFakeRows];
        }
        
        if (node.children && node.children.length > 0) {
          updatedNode.children = await syncRecursive(node.children);
        }
        
        return updatedNode;
      }));
    };
    
    return syncRecursive(tree);
  }, [projectId]);

  // Charger les données depuis Supabase - Version sécurisée SANS boucle infinie
  const loadData = useCallback(async (section: string, retryCount: number = 0, maxRetries = 3) => {
    console.log('loadData called for section:', section, 'retry:', retryCount)

    if (retryCount > maxRetries) {
      console.error('Max retries exceeded, using default data')
      setError('Max retries exceeded, using default data')
      setTreeData(getDefaultData(section))
      setColumns(getDefaultColumns(section))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let response
      let useSection = true

      // First try with section
      response = await fetch(`/api/memory/nodes?projectId=${projectId}&section=${section}`)

      if (!response.ok && response.status === 400) {
        console.log('400 error with section, falling back without section')
        useSection = false
        response = await fetch(`/api/memory/nodes?projectId=${projectId}`)
      }

      if (response.ok) {
        const { nodes: apiTree } = await response.json()

        if (apiTree && apiTree.length > 0) {
          const organizedTree = organizeTreeData(apiTree)
          let treeWithData
          try {
            treeWithData = await attachRowsToTree(organizedTree, section)
          } catch (err) {
            console.error('Error in attachRowsToTree:', err)
            treeWithData = organizedTree
          }
          const finalTree = await syncFictifToReal(treeWithData)
          setTreeData(finalTree)
          setColumns(getDefaultColumns(section))
          console.log('loadData completed successfully')
        } else {
          console.log('No data, creating default')
          const created = await createDefaultStructure(section)
          if (created) {
            // Schedule reload
            setTimeout(() => loadData(section, 0), 500)
          } else {
            setTreeData(getDefaultData(section))
            setColumns(getDefaultColumns(section))
          }
        }
      } else {
        throw new Error(`API error: ${response.status}`)
      }
    } catch (err) {
      console.error('loadData error:', err)
      // Retry on network errors
      if (retryCount < maxRetries && (err as any).name === 'TypeError' || (err as any).message.includes('fetch')) {
        console.log('Network error, retrying in 2s...')
        setTimeout(() => loadData(section, retryCount + 1, maxRetries), 2000)
      } else {
        console.log('Using fallback default data')
        setTreeData(getDefaultData(section))
        setColumns(getDefaultColumns(section))
        setError('API indisponible, données par défaut')
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, createDefaultStructure, getDefaultData, getDefaultColumns, organizeTreeData, attachRowsToTree, syncFictifToReal])

  // Mettre à jour un nœud
  const updateNode = async (nodeId: string, updates: Partial<TreeNode>): Promise<boolean> => {
    try {
      setTreeData(prev => {
        const updateNodeRecursive = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map(node => {
            if (node.id === nodeId) {
              const updated = { ...node, ...updates }
              if (nodeId === selectedNode?.id) {
                setSelectedNode(updated)
              }
              return updated
            }
            if (node.children) {
              return { ...node, children: updateNodeRecursive(node.children) }
            }
            return node
          })
        }
        return updateNodeRecursive(prev)
      })

      const payload: Record<string, unknown> = { ...updates }
      delete payload.children
      delete payload.level
      delete payload.path
      delete payload.isExpanded
      delete payload.metadata

      await fetch('/api/memory/nodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, updates: payload })
      })

      return true
    } catch (err) {
      console.error('updateNode error:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
      return false
    }
  }

  // Supprimer un nœud
  const deleteNode = async (nodeId: string): Promise<boolean> => {
    try {
      console.log('Modular deleteNode: starting deletion for node', nodeId);

      // 1. Appeler l'API pour supprimer en base de données
      const res = await fetch('/api/memory/nodes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, projectId })
      });

      console.log('Modular deleteNode API call:', { nodeId, projectId }, 'Response status:', res.status);

      if (res.ok) {
        console.log('Modular deleteNode: API deletion successful');
        
        // 2. Supprimer toutes les rows associées si c'est un document
        const nodeToDelete = findNodeById(treeData, nodeId);
        if (nodeToDelete?.type === 'document' && nodeToDelete.data) {
          console.log('Modular deleteNode: deleting', nodeToDelete.data.length, 'associated rows');
          
          const deletePromises = nodeToDelete.data.map(async (row) => {
            try {
              const deleteRowRes = await fetch('/api/unified/data', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rowId: row.id })
              });
              console.log('Modular deleteNode: row deletion for', row.id, 'status:', deleteRowRes.status);
            } catch (err) {
              console.warn('Modular deleteNode: failed to delete row', row.id, err);
            }
          });
          
          await Promise.all(deletePromises);
        }

        // 3. Mettre à jour l'état local
        setTreeData(prev => {
          const removeNodeRecursive = (nodes: TreeNode[]): TreeNode[] => {
            return nodes.filter(node => {
              if (node.id === nodeId) return false
              if (node.children) {
                node.children = removeNodeRecursive(node.children)
              }
              return true
            })
          }
          return removeNodeRecursive(prev)
        });

        // 4. Nettoyer selectedNode si nécessaire
        if (selectedNode?.id === nodeId) {
          setSelectedNode(null);
        }

        console.log('Modular deleteNode: completed successfully');
        return true;
      } else {
        const errorText = await res.text();
        console.error('Modular deleteNode: API failed:', res.status, errorText);
        setError(`Erreur API suppression: ${errorText}`);
        return false;
      }
    } catch (err) {
      console.error('Modular deleteNode: exception:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      return false;
    }
  }

  // Déplacer un nœud avec logique complète
  const moveNode = async (nodeId: string, newParentId: string | null, newPosition: number): Promise<boolean> => {
    try {
      // Persist move intent in DB
      try {
        await fetch('/api/memory/nodes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId, updates: { parent_id: newParentId, position: newPosition } })
        })
      } catch (e) {
        console.warn('Persist move failed:', e)
      }

      setTreeData(prev => {
        // Trouver et retirer le nœud à déplacer
        let nodeToMove: TreeNode | null = null
        
        const removeNode = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.filter(node => {
            if (node.id === nodeId) {
              nodeToMove = { ...node }
              return false
            }
            if (node.children) {
              node.children = removeNode(node.children)
            }
            return true
          })
        }
        
        const nodesWithoutMoved = removeNode([...prev])
        
        if (!nodeToMove) return prev

        // Mettre à jour le parent du nœud déplacé
        const movedNode = { ...(nodeToMove as TreeNode), parent_id: newParentId }
        
        // Ajouter le nœud à sa nouvelle position
        if (newParentId) {
          const addToNewParent = (nodes: TreeNode[]): TreeNode[] => {
            return nodes.map(node => {
              if (node.id === newParentId) {
                return {
                  ...node,
                  children: [...(node.children || []), movedNode]
                }
              }
              if (node.children) {
                return {
                  ...node,
                  children: addToNewParent(node.children)
                }
              }
              return node
            })
          }
          return addToNewParent(nodesWithoutMoved)
        } else {
          // Ajouter à la racine
          return [...nodesWithoutMoved, movedNode]
        }
      })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du déplacement')
      return false
    }
  }

  // Navigation et breadcrumbs
  const selectNode = useCallback((node: TreeNode | null) => {
    setSelectedNode(node)
    if (node?.path) {
      const breadcrumbItems: BreadcrumbItem[] = node.path.map((name, index) => ({
        id: `breadcrumb-${index}`,
        name,
        icon: index === 0 ? '🏠' : (index === node.path!.length - 1 ? node.icon : '📁'),
        color: node.color
      }))
      setBreadcrumbs(breadcrumbItems)
    } else {
      setBreadcrumbs([])
    }
  }, [])

  // Toggle expansion d'un nœud
  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId)
      } else {
        newExpanded.add(nodeId)
      }
      return newExpanded
    })
  }, [])

  // Recherche dans l'arbre
  const searchNodes = useCallback((query: string): TreeNode[] => {
    const results: TreeNode[] = []
    
    const searchRecursive = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.name.toLowerCase().includes(query.toLowerCase()) ||
            node.data?.some(item => 
              item.name.toLowerCase().includes(query.toLowerCase()) ||
              item.content?.toLowerCase().includes(query.toLowerCase())
            )) {
          results.push(node)
        }
        if (node.children) {
          searchRecursive(node.children)
        }
      })
    }
    
    searchRecursive(treeData)
    return results
  }, [treeData])

  // Dupliquer un nœud
  const duplicateNode = async (nodeId: string): Promise<TreeNode | null> => {
    try {
      const nodeToDuplicate = findNodeById(treeData, nodeId)
      if (!nodeToDuplicate) return null

      const newNode = await createNode({
        name: `${nodeToDuplicate.name} (Copie)`,
        type: nodeToDuplicate.type,
        section: nodeToDuplicate.section,
        parent_id: nodeToDuplicate.parent_id,
        icon: nodeToDuplicate.icon,
        color: nodeToDuplicate.color,
        data: nodeToDuplicate.data
      })
      return newNode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la duplication')
      return null
    }
  }

  // Trouver un nœud par ID
  const findNodeById = useCallback((nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children) {
        const found = findNodeById(node.children, id)
        if (found) return found
      }
    }
    return null
  }, [])

  // Obtenir tous les dossiers
  const getAllFolders = useCallback((): TreeNode[] => {
    const folders: TreeNode[] = []
    
    const collectFolders = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'folder') {
          folders.push(node)
        }
        if (node.children) {
          collectFolders(node.children)
        }
      })
    }
    
    collectFolders(treeData)
    return folders
  }, [treeData])

  // Gestion colonnes
  const addColumn = async (columnConfig: Omit<ColumnConfig, 'id'>) => {
    const newColumn: ColumnConfig = {
      ...columnConfig,
      id: `col-${Date.now()}`
    }
    setColumns(prev => [...prev, newColumn])
  }

  const removeColumn = (columnId: string) => {
    setColumns(prev => prev.filter(col => col.id !== columnId))
  }

  const updateColumn = (columnId: string, updates: Partial<ColumnConfig>) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, ...updates } : col
    ))
  }

  // Handle multi-level targeting queries - RETOURNE LES INFORMATIONS AU LIEU DE MANIPULER L'UI
  const handleTargetingQuery = useCallback(async (query: string) => {
    console.log('🎯 handleTargetingQuery - Début de la fonction')

    if (!query.trim()) return null

    try {
      // Parse query like "rules/Business Logic/table1/row-5" or "memory/Success/*"
      const parts = query.split('/').filter(p => p)
      if (parts.length < 2) throw new Error('Format de query invalide. Utilisez: section/dossier/table/row')

      const section = parts[0]
      const folder = parts[1] || ''
      const table = parts[2] || ''
      const row = parts[3] || ''

      // Use intelligent targeting to analyze
      const contextMessage = `Ciblez précisément: ${query} dans le contexte du board modulaire`
      const targetingContext = await analyzeTarget(contextMessage)

      // Execute based on path - RETOURNE LES ACTIONS À EFFECTUER AU LIEU DE LES EXÉCUTER
      if (targetingContext.path.section === section && targetingContext.path.folder === folder) {
        if (table && row) {
          // Target specific row: update or access
          const targetNode = findNodeById(treeData, table) // Assume table is node id
          if (targetNode && targetNode.data) {
            const targetRow = targetNode.data.find(r => r.id === row)
            if (targetRow) {
              // Return action info instead of executing
              toast(`🎯 Ciblage row ${row} dans ${table}`)
              if (section === 'memory') {
                await updateUsage(row)
              }
              console.log('Hook: Returning action', 'row_targeted')
              return { action: 'row_targeted', node: targetNode, row: targetRow }
            }
          }
        } else if (table) {
          // Target table/document
          const targetNode = findNodeById(treeData, table)
          if (targetNode) {
            // Return action info instead of executing
            toast.success(`📋 Sélectionné: ${targetNode.name}`)
            console.log('Hook: Returning action', 'node_selected')
            return { action: 'node_selected', node: targetNode }
          }
        } else if (folder === '*') {
          // Wildcard: operate on all in folder
          const folderNode = findNodeById(treeData, section + '-folder-' + folder.replace(' ', '-'))
          if (folderNode) {
            // Return action info instead of executing
            toast(`🔄 Rangement auto appliqué à ${folder}`)
            console.log('Hook: Returning action', 'folder_auto_organized')
            return { action: 'folder_auto_organized', node: folderNode }
          }
        }
        // Fallback: navigate to section/folder - RETURN ACTION INFO
        if (folder) {
          const folderNode = treeData.find(n => n.name.toLowerCase() === folder.toLowerCase())
          if (folderNode) {
            toast.success(`🎯 Navigué vers ${section}/${folder}`)
            console.log('Hook: Returning action', 'navigate')
            return { action: 'navigate', section, folder, node: folderNode }
          }
        }
        // Navigate to section only
        toast.success(`🎯 Navigué vers ${section}`)
        console.log('Hook: Returning action', 'navigate')
        return { action: 'navigate', section, folder: null, node: null }
      } else {
        throw new Error('Ciblage non résolu par IA')
      }
    } catch (err) {
      console.error('Erreur ciblage:', err)
      throw err
    }
  }, [analyzeTarget, treeData, findNodeById, updateUsage])

  // Gestion données tableaux avec synchronisation selectedNode
  const addTableRow = useCallback(async (documentId: string, rowData: Partial<TableDataItem>) => {
    // Validate documentId is UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(documentId)) {
      console.error('Invalid documentId (not UUID):', documentId)
      toast.error('Erreur: ID de document invalide. Rechargez la page.')
      return false
    }

    const newRow: TableDataItem = {
      id: crypto.randomUUID(), // Temp UUID for local state
      name: rowData.name || 'Nouveau élément',
      type: rowData.type || 'default',
      created_at: (rowData.created_at as string) || new Date().toISOString(),
      ...rowData
    }

    // Persist to DB first
    try {
      const body = {
        nodeId: documentId,
        data: newRow
      }
      const res = await fetch('/api/unified/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        const { row: insertedRow } = await res.json()
        // Use real DB ID
        const realRow = { ...newRow, id: insertedRow.id }

        // Update local state
        setTreeData(prev => {
          const updateNodeData = (nodes: TreeNode[]): TreeNode[] => {
            return nodes.map(node => {
              if (node.id === documentId) {
                const updatedNode = { ...node, data: [...(node.data || []), realRow] }
                if (selectedNode?.id === documentId) {
                  setSelectedNode(updatedNode)
                }
                return updatedNode
              }
              if (node.children) {
                return { ...node, children: updateNodeData(node.children) }
              }
              return node
            })
          }
          return updateNodeData(prev)
        })

        toast.success('📝 Nouvelle ligne ajoutée avec succès')
        return true
      } else {
        const errorText = await res.text()
        console.error('Add row failed:', errorText)
        toast.error('Erreur ajout ligne: ' + errorText)
        return false
      }
    } catch (err) {
      console.error('Add row error:', err)
      toast.error('Erreur réseau lors de l\'ajout')
      return false
    }
  }, [selectedNode])

  const removeTableRow = useCallback((documentId: string, rowId: string) => {
    setTreeData(prev => {
      const updateNodeData = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.id === documentId) {
            return { ...node, data: (node.data || []).filter(row => row.id !== rowId) }
          }
          if (node.children) {
            return { ...node, children: updateNodeData(node.children) }
          }
          return node
        })
      }
      return updateNodeData(prev)
    })
  }, [])

  const updateTableRow = useCallback((documentId: string, rowId: string, updates: Partial<TableDataItem>) => {
    setTreeData(prev => {
      const updateNodeData = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.id === documentId) {
            return {
              ...node,
              data: (node.data || []).map(row => 
                row.id === rowId 
                  ? { ...row, ...updates, updated_at: new Date().toISOString() }
                  : row
              )
            }
          }
          if (node.children) {
            return { ...node, children: updateNodeData(node.children) }
          }
          return node
        })
      }
      return updateNodeData(prev)
    })
  }, [])

  // Export/Import
  const exportData = useCallback(() => {
    const exportObj = {
      version: '3.0',
      timestamp: new Date().toISOString(),
      projectId,
      treeData,
      columns
    }
    
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `board-${projectId}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [projectId, treeData, columns])

  const importData = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (data.version && data.treeData && data.columns) {
        setTreeData(data.treeData)
        setColumns(data.columns)
        return true
      }
      
      setError('Format de fichier invalide')
      return false
    } catch (err) {
      setError('Erreur lors de l\'import')
      return false
    }
  }

  // Statistiques
  const getStats = useCallback(() => {
    const stats = {
      totalNodes: 0,
      totalFolders: 0,
      totalDocuments: 0,
      totalRows: 0,
      bySection: {} as Record<string, number>
    }

    const countRecursive = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        stats.totalNodes++
        if (node.type === 'folder') stats.totalFolders++
        if (node.type === 'document') {
          stats.totalDocuments++
          stats.totalRows += node.data?.length || 0
        }
        stats.bySection[node.section] = (stats.bySection[node.section] || 0) + 1
        
        if (node.children) {
          countRecursive(node.children)
        }
      })
    }

    countRecursive(treeData)
    return stats
  }, [treeData])

  // Fonction vide pour compatibilité
  const filterData = () => treeData

  // Fonction de réorganisation des nodes (drag & drop)
  const reorderNodes = useCallback(async (activeId: string, overId: string, position: 'before' | 'after' = 'after') => {
    console.log('🔄 Reordering nodes:', { activeId, overId, position })

    try {
      const activeNode = findNodeById(treeData, activeId)
      const overNode = findNodeById(treeData, overId)

      if (!activeNode || !overNode) {
        console.error('Nodes not found for reordering')
        return false
      }

      // Persist simple ordering hint (timestamp-based)
      try {
        await fetch('/api/memory/nodes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId: activeId, updates: { position: Date.now() } })
        })
      } catch (e) {
        console.warn('Persist reorder hint failed:', e)
      }

      return true
    } catch (err) {
      console.error('Error reordering nodes:', err)
      return false
    }
  }, [treeData, findNodeById])

  // Fonction de réorganisation des rows dans un document
  const reorderRows = useCallback(async (documentId: string, oldIndex: number, newIndex: number) => {
    console.log('🔄 Reordering rows:', { documentId, oldIndex, newIndex })
    
    try {
      setTreeData(prev => {
        const updateNodeData = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map(node => {
            if (node.id === documentId && node.data) {
              const newData = [...node.data]
              const [removed] = newData.splice(oldIndex, 1)
              newData.splice(newIndex, 0, removed)
              return { ...node, data: newData }
            }
            if (node.children) {
              return { ...node, children: updateNodeData(node.children) }
            }
            return node
          })
        }
        return updateNodeData(prev)
      })
      return true
    } catch (err) {
      console.error('Error reordering rows:', err)
      return false
    }
  }, [])

  // Export hiérarchie en JSON
  const exportHierarchyAsJson = useCallback(() => {
    const exportData = {
      version: '3.0',
      timestamp: new Date().toISOString(),
      projectId,
      treeData,
      columns
    }
    return JSON.stringify(exportData, null, 2)
  }, [projectId, treeData, columns])

  // Export hiérarchie en Markdown
  const exportHierarchyAsMd = useCallback(() => {
    let markdown = `# Board Export - ${new Date().toISOString()}\n\n`
    
    const renderNode = (node: TreeNode, level: number = 0): string => {
      const indent = '  '.repeat(level)
      let md = `${indent}- ${node.icon || '📄'} **${node.name}**\n`
      
      if (node.data && node.data.length > 0) {
        node.data.forEach(row => {
          md += `${indent}  - ${row.name}: ${row.content?.substring(0, 100) || ''}\n`
        })
      }
      
      if (node.children) {
        node.children.forEach(child => {
          md += renderNode(child, level + 1)
        })
      }
      
      return md
    }
    
    treeData.forEach(node => {
      markdown += renderNode(node)
    })
    
    return markdown
  }, [treeData])

  // Import hiérarchie depuis JSON ou Markdown
  const importHierarchy = useCallback(async (content: string, format: 'json' | 'md'): Promise<boolean> => {
    try {
      if (format === 'json') {
        const data = JSON.parse(content)
        if (data.treeData && data.columns) {
          setTreeData(data.treeData)
          setColumns(data.columns)
          return true
        }
      }
      // TODO: Implémenter import MD
      console.warn('Import Markdown not yet implemented')
      return false
    } catch (err) {
      console.error('Import error:', err)
      return false
    }
  }, [])

  // In useModularData, add useEffect for realtime
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel('memory_nodes_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'memory_nodes', filter: `project_id=eq.${projectId}` }, 
        (payload) => {
          console.log('Realtime change:', payload)
          loadData(activeSection) // Need activeSection, but since hook has no section, perhaps pass or use state
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIPTION_ERROR') {
          console.error('Realtime subscription error')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, loadData]) // Add activeSection if available, but since it's param, assume global load

  return {
    // État
    treeData,
    setTreeData,
    rulesData,
    setRulesData,
    selectedNode,
    breadcrumbs,
    expandedNodes,
    columns,
    loading,
    error,

    // Navigation
    selectNode,
    toggleExpanded,
    searchNodes,
    getAllFolders,

    // CRUD de base
    loadData,
    createNode,
    updateNode,
    deleteNode,
    moveNode,
    duplicateNode,

    // Gestion colonnes
    addColumn,
    removeColumn,
    updateColumn,

    // Gestion données tableaux
    addTableRow,
    removeTableRow,
    updateTableRow,

    // Règles
    loadRules,

    // Utilitaires
    findNodeById,
    exportData,
    importData,
    filterData,
    getStats,

    // Fonctions pour UnifiedBoardModular
    semanticSearch,
    reorderNodes,
    reorderRows,
    exportHierarchyAsJson,
    exportHierarchyAsMd,
    importHierarchy,
    handleTargetingQuery
  }
}
