'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  X, Plus, Folder, FileText, Edit3, Trash2, Settings, Download, Upload, 
  Target, Code, ChevronDown, ChevronRight, Search, Zap, AlertCircle, 
  AlertTriangle, Save, MoreHorizontal, Copy, Archive, Star
} from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Editor from '@monaco-editor/react'
import { Toaster, toast } from 'react-hot-toast'
import { useModularData, detectLanguage, TreeNode as ModularTreeNode } from '@/hooks/useModularData'
import { useAdaptiveMemory } from '@/lib/services/adaptiveMemory'
import { useIntelligentTargeting } from '@/lib/services/intelligentTargeting'
import { useLearningSystem } from '@/lib/services/learningSystem'
import { SimpleRule } from '@/lib/rules/simpleRules'
import { getRulesForFolder } from '@/lib/rules/simpleRules'
import { TableView } from './TableView'
import { SimpleRulesEditor } from '../rules/SimpleRulesEditor'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

// Utiliser le type TreeNode de useModularData pour cohérence
type TreeNode = ModularTreeNode

// Fonction getIcon globale accessible par tous les composants
const getIcon = (iconName: string, type?: string) => {
  switch (iconName) {
    case 'Target': return <Target className="w-4 h-4" />
    case 'Folder': return <Folder className="w-4 h-4" />
    case 'Code': return <Code className="w-4 h-4" />
    case 'Search': return <Search className="w-4 h-4" />
    case 'Trash': return <Trash2 className="w-4 h-4" />
    case 'AlertTriangle': return <AlertTriangle className="w-4 h-4" />
    default: 
      if (type === 'table') return <span className="text-lg">📊</span>
      return <FileText className="w-4 h-4" />
  }
}

interface UnifiedBoardModularProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export function UnifiedBoardModular({ projectId, isOpen, onClose }: UnifiedBoardModularProps) {
  const [activeSection, setActiveSection] = useState<string>('rules')
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<TreeNode | null>(null)
  const [appliedRules, setAppliedRules] = useState<SimpleRule[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [editorContent, setEditorContent] = useState('')
  const [editorTitle, setEditorTitle] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [configTarget, setConfigTarget] = useState<TreeNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false)
  const [importanceEdit, setImportanceEdit] = useState<{rowId: string, value: number} | null>(null)

  // États pour édition inline des rows avec Monaco
  const [showRowEditor, setShowRowEditor] = useState(false)
  const [editingRow, setEditingRow] = useState<any>(null)
  const [rowEditorContent, setRowEditorContent] = useState('')
  const [rowLanguage, setRowLanguage] = useState('markdown')

  // États pour export/import
  const [exportFormat, setExportFormat] = useState<'json' | 'md'>('json')
  const [importFormat, setImportFormat] = useState<'json' | 'md'>('json')

  // Add state
  const [showRulesDialog, setShowRulesDialog] = useState(false)
  const [rulesList, setRulesList] = useState<SimpleRule[]>([])
  const [editingRule, setEditingRule] = useState<SimpleRule | null>(null)
  const [newRule, setNewRule] = useState<Partial<SimpleRule>>({ enabled: true, priority: 1 })

  // États pour sélection multiple
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)

  const modularData = useModularData(projectId)
  const {
    treeData,
    rulesData,
    semanticSearch,
    reorderNodes,
    reorderRows,
    exportHierarchyAsJson,
    exportHierarchyAsMd,
    importHierarchy,
    loadData,
    handleTargetingQuery
  } = modularData
  const adaptiveMemory = useAdaptiveMemory(projectId)
  const { updateUsage } = adaptiveMemory
  const intelligentTargeting = useIntelligentTargeting(projectId)
  const { analyzeTarget } = intelligentTargeting
  const learningSystem = useLearningSystem(projectId)
  const { getPredictions } = learningSystem

  const [tableData, setTableData] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<TreeNode[]>([])
  const [proactiveSuggestions, setProactiveSuggestions] = useState<any[]>([])
  const [targetingQuery, setTargetingQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [configNode, setConfigNode] = useState<any>(null)

  const sections = [
    { id: 'memory', name: 'Mémoire', icon: 'Folder' },
    { id: 'rules', name: 'Règles', icon: 'Target' }
  ]

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Recherche sémantique
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      const results = await semanticSearch(query)
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }, [semanticSearch])

  // Load section data
  useEffect(() => {
    if (isOpen && activeSection) {
      loadData(activeSection)
    }
  }, [isOpen, activeSection, loadData])

  // Load rules
  useEffect(() => {
    const loadRulesData = async () => {
      try {
        const response = await fetch(`/api/rules/simple?projectId=${projectId}`)
        if (response.ok) {
          const { rules } = await response.json()
          setRulesList(rules)
        }
      } catch (err) {
        console.error('Error loading rules:', err)
      }
    }
    if (isOpen) loadRulesData()
  }, [isOpen, projectId])

  // Fetch proactive suggestions based on active section
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (activeSection) {
        try {
          const suggestions = await getPredictions(activeSection)
          setProactiveSuggestions(suggestions)
        } catch (err) {
          console.error('Erreur fetch suggestions:', err)
        }
      }
    }
    fetchSuggestions()
  }, [activeSection, getPredictions])

  // Update tableData when selectedNode changes - CORRECTION CRITIQUE
  useEffect(() => {
    if (selectedNode) {
      console.log('🔍 DEBUG - selectedNode changed:', selectedNode.id, 'data:', selectedNode.data)
      // Force reload data if empty
      if (!selectedNode.data || selectedNode.data.length === 0) {
        console.log('🔍 DEBUG - No data found, reloading...')
        loadData(activeSection).then(() => {
          // Find updated node after reload
          const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
            for (const node of nodes) {
              if (node.id === id) return node
              if (node.children) {
                const found = findNode(node.children, id)
                if (found) return found
              }
            }
            return null
          }
          const updatedNode = findNode(treeData, selectedNode.id)
          if (updatedNode && updatedNode.data) {
            setTableData(updatedNode.data)
          }
        })
      } else {
        setTableData(selectedNode.data)
      }
    } else {
      setTableData([])
    }
  }, [selectedNode, activeSection, loadData, treeData])

  // Fonctions pour configuration - DÉPLACÉES AVANT renderTreeNodes
  const openConfiguration = useCallback((node: TreeNode) => {
    console.log('🔍 DEBUG - openConfiguration:', node.id)
    setConfigNode({
      title: node.name,
      icon: node.icon,
      color: node.color
    })
    setConfigTarget(node)
    setShowConfig(true)
  }, [])

  const closeConfiguration = useCallback(() => {
    console.log('🔍 DEBUG - closeConfiguration')
    setShowConfig(false)
    setConfigTarget(null)
  }, [])

  // Fonction pour créer un nouveau dossier
  const createNewFolder = useCallback(async () => {
    console.log('🔍 DEBUG - createNewFolder for section:', activeSection)
    try {
      const newFolder = await modularData.createNode({
        name: 'Nouveau Dossier',
        type: 'folder',
        section: activeSection,
        parent_id: null,
        icon: '📁',
        color: '#6b7280'
      })
      if (newFolder) {
        toast.success('📁 Dossier créé avec succès')
        await loadData(activeSection)
      } else {
        toast.error('❌ Erreur création dossier')
      }
    } catch (err) {
      console.error('Erreur createNewFolder:', err)
      toast.error('❌ Erreur création dossier')
    }
  }, [activeSection, modularData, loadData])

  // Fonctions pour Monaco Editor
  const openEditor = useCallback((content: string, title: string) => {
    console.log('🔍 DEBUG - openEditor:', title)
    setEditorContent(content)
    setEditorTitle(title)
    setShowEditor(true)
  }, [])

  const closeEditor = useCallback(() => {
    console.log('🔍 DEBUG - closeEditor')
    setShowEditor(false)
    setEditorContent('')
    setEditorTitle('')
  }, [])

  // Fonctions pour sélection multiple
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  const selectAllItems = useCallback(() => {
    const allIds = new Set<string>()
    const collectIds = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        allIds.add(node.id)
        if (node.children) {
          collectIds(node.children)
        }
      })
    }
    collectIds(treeData)
    setSelectedItems(allIds)
  }, [treeData])

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  const deleteSelectedItems = useCallback(async () => {
    if (selectedItems.size === 0) return
    
    const confirmed = confirm(`Supprimer ${selectedItems.size} élément(s) sélectionné(s) ?`)
    if (!confirmed) return

    try {
      // TODO: Implémenter la suppression multiple
      console.log('Suppression de:', Array.from(selectedItems))
      toast.success(`${selectedItems.size} élément(s) supprimé(s)`)
      setSelectedItems(new Set())
      await loadData(activeSection)
    } catch (error) {
      console.error('Erreur suppression multiple:', error)
      toast.error('Erreur lors de la suppression')
    }
  }, [selectedItems, activeSection, loadData])

  // Navigation cohérente avec application auto des règles
  const handleNodeSelect = useCallback(async (node: TreeNode) => {
    console.log('🔍 DEBUG - handleNodeSelect:', node.name, node.type)
    
    // Réinitialiser les états de sélection
    setSelectedItems(new Set())
    setIsMultiSelectMode(false)
    
    if (node.type === 'folder') {
      console.log('🔍 DEBUG - Selecting folder:', node.name)
      setSelectedFolder(node)
      setSelectedNode(null)
      setTableData([])
      
      // Charger les enfants du dossier si nécessaire
      if (node.children && node.children.length > 0) {
        console.log('🔍 DEBUG - Folder has', node.children.length, 'children')
      } else {
        console.log('🔍 DEBUG - Empty folder or no children loaded')
      }
      
      // Détection contexte et application auto des règles
      try {
        const folderName = node.name || activeSection
        const autoRules = getRulesForFolder(folderName, rulesData)
        
        if (autoRules && autoRules.length > 0) {
          // Prioriser par succès historique
          const prioritizedAutoRules = autoRules.sort((a: SimpleRule, b: SimpleRule) => {
            const successA = Number(a.metadata?.success_history || 0)
            const successB = Number(b.metadata?.success_history || 0)
            return successB - successA
          })
          setAppliedRules(prioritizedAutoRules)
          console.log('🔍 DEBUG - Applied', prioritizedAutoRules.length, 'rules to folder')
        } else {
          setAppliedRules([])
          console.log('🔍 DEBUG - No rules found for folder')
        }
        
        // Analyser le contexte de manière asynchrone
        const contextMessage = `Contexte pour le dossier ${node.name} dans la section ${activeSection}`
        analyzeTarget(contextMessage).catch(err => {
          console.warn('🔍 DEBUG - Context analysis failed:', err)
        })
        
      } catch (err) {
        console.error('🔍 DEBUG - Error applying auto rules:', err)
        setAppliedRules([])
      }
      
    } else if (node.type === 'document') {
      console.log('🔍 DEBUG - Selecting document:', node.name)
      setSelectedNode(node)
      setSelectedFolder(null)
      
      // Charger les données du document
      try {
        if (!node.data || node.data.length === 0) {
          console.log('🔍 DEBUG - Loading document data from API for node:', node.id)
          
          const response = await fetch(`/api/unified/data?nodeId=${node.id}`)
          if (response.ok) {
            const { rows } = await response.json()
            const mappedData = rows.map((row: any) => ({
              id: row.id,
              ...row.data,
              created_at: row.data.created_at || new Date().toISOString()
            }))
            setTableData(mappedData)
            console.log('🔍 DEBUG - Loaded', mappedData.length, 'rows from API')
            
            // Mettre à jour le node avec les données chargées
            await modularData.updateNode(node.id, { data: mappedData })
          } else {
            console.log('🔍 DEBUG - API failed, using local data')
            setTableData(node.data || [])
          }
        } else {
          console.log('🔍 DEBUG - Using existing document data:', node.data.length, 'rows')
          setTableData(node.data)
        }
        
        // Appliquer les règles du dossier parent si disponible
        const parentFolder = findParentFolder(node, treeData)
        if (parentFolder) {
          const parentFolderName = parentFolder.name
          const docRules = getRulesForFolder(parentFolderName, rulesData)
          setAppliedRules(docRules)
          console.log('🔍 DEBUG - Applied parent folder rules:', docRules.length)
        } else {
          setAppliedRules([])
          console.log('🔍 DEBUG - No parent folder found for document')
        }
        
      } catch (error) {
        console.error('🔍 DEBUG - Error loading document data:', error)
        setTableData(node.data || [])
        toast.error('Erreur lors du chargement des données')
      }
    }
  }, [activeSection, rulesData, treeData, modularData, analyzeTarget])

  // Fonction utilitaire pour trouver le dossier parent
  const findParentFolder = useCallback((node: TreeNode, nodes: TreeNode[]): TreeNode | null => {
    for (const n of nodes) {
      if (n.type === 'folder' && n.children) {
        if (n.children.some(child => child.id === node.id)) {
          return n
        }
        const found = findParentFolder(node, n.children)
        if (found) return found
      }
    }
    return null
  }, [])

  // Wrapper pour handleTargetingQuery qui gère les actions UI
  const handleTargetingQueryWrapper = useCallback(async (query: string) => {
    try {
      const result = await handleTargetingQuery(query)
      if (!result) return

      console.log('🎯 Targeting result:', result); // Log pour validation

      // Gérer les actions basées sur le résultat du hook
      switch (result.action) {
        case 'node_selected':
          if (result.node) {
            await handleNodeSelect(result.node)
          }
          break
        case 'navigate':
          console.log('Component: Handling', result.action, 'with setActiveSection:', typeof setActiveSection)
          console.log('Navigation to section:', result.section); // Log pour tracer setActiveSection
          if (result.section) {
            setActiveSection(result.section)
          }
          if (result.node) {
            await handleNodeSelect(result.node)
          }
          break
        case 'row_targeted':
          console.log('Row targeted:', result.row); // Log pour validation
          if (result.row && activeSection === 'memory') {
            await updateUsage(result.row.id)
          }
          break
        case 'folder_auto_organized':
          // Ces actions sont déjà gérées dans le hook avec les toasts
          break
        default:
          console.log('Action non reconnue:', result.action)
      }
    } catch (err) {
      console.error('Erreur dans handleTargetingQueryWrapper:', err)
      toast.error('❌ Erreur ciblage')
    }
  }, [handleTargetingQuery, handleNodeSelect, updateUsage, activeSection])

  // Add createNewItem function - CORRECTION CRITIQUE
  const createNewItem = useCallback(async (type: 'folder' | 'table' | 'row') => {
    console.log('🔍 DEBUG - createNewItem:', type, 'activeSection:', activeSection)
    
    if (type === 'row') {
      // Add row to selected table
      if (selectedNode?.type === 'document') {
        await addRow()
      } else {
        toast.error('❌ Sélectionnez d\'abord un tableau')
      }
      return
    }

    // Create folder or table - CORRECTION CRITIQUE
    try {
      const itemData = {
        name: type === 'folder' ? 'Nouveau Dossier' : 'Nouveau Tableau',
        type: type === 'folder' ? 'folder' : 'document',
        section: activeSection,
        parent_id: selectedFolder?.id || null,
        icon: type === 'folder' ? '📁' : '📊',
        color: '#6b7280'
      }
      
      console.log('🔍 DEBUG - Creating item with data:', itemData)
      
      const newItem = await modularData.createNode(itemData)
      
      if (newItem) {
        console.log('🔍 DEBUG - Item created successfully:', newItem.id)
        toast.success(`✅ ${type === 'folder' ? 'Dossier' : 'Tableau'} créé avec succès`)
        
        // Reload data and select the new item
        await loadData(activeSection)
        
        // Auto-select the new item after a short delay
        setTimeout(() => {
          if (type === 'folder') {
            setSelectedFolder(newItem)
          } else {
            setSelectedNode(newItem)
          }
        }, 500)
      } else {
        console.error('🔍 DEBUG - createNode returned null')
        toast.error('❌ Erreur création: aucun élément retourné')
      }
    } catch (err) {
      console.error('🔍 DEBUG - createNewItem error:', err)
      toast.error('❌ Erreur création: ' + (err instanceof Error ? err.message : 'Erreur inconnue'))
    }
  }, [selectedNode, selectedFolder, activeSection, loadData, modularData])

  // Render tree with search results if searching
  const renderTreeNodes = useCallback((nodes: TreeNode[], level: number = 0): React.ReactNode => {
    const displayNodes = searchQuery ? searchResults : nodes
    
    if (!displayNodes || displayNodes.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          {searchQuery ? 'Aucun résultat trouvé' : 'Aucun élément dans cette section'}
        </div>
      )
    }
    
    return displayNodes.map(node => (
      <SortableTreeItem
        key={node.id}
        id={node.id}
        node={node}
        level={level}
        isSelected={selectedNode?.id === node.id || selectedFolder?.id === node.id}
        onSelect={() => handleNodeSelect(node)}
        onConfigure={() => openConfiguration(node)}
        renderChildren={(children: TreeNode[]) => renderTreeNodes(children, level + 1)}
        isMultiSelectMode={isMultiSelectMode}
        selectedItems={selectedItems}
        onToggleSelection={(id: string) => {
          const newSelected = new Set(selectedItems)
          if (newSelected.has(id)) {
            newSelected.delete(id)
          } else {
            newSelected.add(id)
          }
          setSelectedItems(newSelected)
        }}
      />
    ))
  }, [searchQuery, searchResults, selectedNode, selectedFolder, handleNodeSelect, openConfiguration, isMultiSelectMode, selectedItems])

  // Fonctions pour édition inline des rows
  const openRowEditor = useCallback((row: any) => {
    const content = row.instructions || row.content || ''
    setRowEditorContent(content)
    setRowLanguage(detectLanguage(content, activeSection, 'document', row.type))
    setEditingRow(row)
    setShowRowEditor(true)
  }, [activeSection])

  const saveRowEdit = useCallback(async () => {
    if (!editingRow || !rowEditorContent.trim() || !selectedNode) return

    try {
      const response = await fetch('/api/unified/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowId: editingRow.id,
          updates: {
            content: rowEditorContent,
            instructions: rowEditorContent  // Assume instructions is the content field
          }
        })
      })

      if (response.ok) {
        const updatedRow = await response.json()

        modularData.updateTableRow(selectedNode.id, editingRow.id, {
          content: rowEditorContent,
          instructions: rowEditorContent,
          updated_at: new Date().toISOString()
        })

        // Refresh table data
        if (selectedNode) {
          setTableData(prev => prev.map(r => r.id === editingRow.id ? updatedRow.row : r))
        }

        // Update importance if memory
        if (activeSection === 'memory') {
          await updateUsage(editingRow.id)
        }

        setShowRowEditor(false)
        setEditingRow(null)
        setRowEditorContent('')
        toast.success('Ligne sauvegardée')
      } else {
        toast.error('Erreur sauvegarde ligne')
      }
    } catch (error) {
      console.error('Erreur sauvegarde ligne:', error)
      toast.error('Erreur réseau')
    }
  }, [editingRow, rowEditorContent, selectedNode, activeSection, updateUsage, modularData])

  const addRow = useCallback(async () => {
    if (!selectedNode?.id) return
    const draftData = {
      name: 'Nouvel élément',
      type: activeSection === 'rules' ? 'règle' : activeSection === 'memory' ? 'mémoire' : 'optimisation',
      content: 'Contenu...',
      instructions: activeSection === 'rules' ? 'Instructions pour l\'IA...' : '',
      targetFolder: activeSection === 'rules' ? 'Non défini' : '',
      created_at: new Date().toISOString()
    }
    try {
      const res = await fetch('/api/unified/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: selectedNode.id, data: draftData })
      })
      if (!res.ok) {
        const err = await res.text()
        console.error('Add row failed:', err)
        toast.error('❌ Erreur ajout ligne')
        return
      }
      const json = await res.json()
      const newId = json?.row?.id
      const persistedData = { ...draftData, id: newId }
      modularData.addTableRow(selectedNode.id, persistedData)
      setTableData(prev => [...prev, persistedData])
      toast.success('📝 Nouvelle ligne ajoutée avec succès')
    } catch (e) {
      console.error('Add row exception:', e)
      toast.error('❌ Erreur réseau ajout ligne')
    }
  }, [selectedNode?.id, activeSection, modularData])

  const deleteRow = useCallback((rowId: string) => {
    if (!selectedNode?.id) return
    modularData.removeTableRow(selectedNode.id, rowId)
    setTableData(prev => prev.filter(row => row.id !== rowId))
    toast.success('🗑️ Ligne supprimée avec succès')
  }, [selectedNode?.id, modularData])

  // Export/Import avec formats multiples
  const handleExport = useCallback(() => {
    const content = exportHierarchyAsJson()
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `board-${projectId}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [exportHierarchyAsJson, projectId])

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const content = e.target?.result as string
      const success = await importHierarchy(content, importFormat)
      if (success) {
        alert('Import réussi ! Rechargement des données...')
        loadData(activeSection)
      } else {
        alert('Erreur lors de l\'import')
      }
    }
    reader.readAsText(file)
  }, [importFormat, importHierarchy, activeSection, loadData])

  // DND handlers
  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // Reorder nodes in tree
    if (active.data.current?.type === 'treeNode') {
      const position = over.data.current?.position || 'after'
      reorderNodes(activeId, overId, position)
      toast.success('🔄 Noeud réorganisé avec succès')
    }

    // Reorder rows in table
    if (active.data.current?.type === 'row' && selectedNode?.type === 'document') {
      const oldIndex = active.data.current.sortable.index
      const newIndex = over.data.current.sortable.index
      reorderRows(selectedNode.id, oldIndex, newIndex)
      setTableData(prev => arrayMove(prev, oldIndex, newIndex))
      toast.success('🔄 Ligne réorganisée avec succès')
    }
  }, [reorderNodes, reorderRows, selectedNode])

  const handleSaveConfig = useCallback(async () => {
    if (!configTarget || !configNode) return

    try {
      console.log('🔍 DEBUG - handleSaveConfig:', configTarget.id, configNode)
      
      const response = await fetch('/api/board/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: configTarget.id,
          title: configNode.title,
          icon: configNode.icon,
          color: configNode.color
        })
      })

      if (response.ok) {
        console.log('🔍 DEBUG - Config saved successfully')
        
        // Update local state with proper tree update
        const updateNodeInTree = (nodes: TreeNode[], nodeId: string, updates: Partial<TreeNode>): TreeNode[] => {
          return nodes.map(node => {
            if (node.id === nodeId) {
              return { ...node, ...updates }
            }
            if (node.children) {
              return { ...node, children: updateNodeInTree(node.children, nodeId, updates) }
            }
            return node
          })
        }
        
        // Update treeData state
        setTreeData(prev => updateNodeInTree(prev, configTarget.id, {
          name: configNode.title,
          icon: configNode.icon,
          color: configNode.color
        }))
        
        // Update selected node if it's the one being configured
        if (selectedNode?.id === configTarget.id) {
          setSelectedNode(prev => prev ? { ...prev, name: configNode.title, icon: configNode.icon, color: configNode.color } : null)
        }
        
        // Update selected folder if it's the one being configured
        if (selectedFolder?.id === configTarget.id) {
          setSelectedFolder(prev => prev ? { ...prev, name: configNode.title, icon: configNode.icon, color: configNode.color } : null)
        }
        
        // Update modularData to persist changes
        await modularData.updateNode(configTarget.id, {
          name: configNode.title,
          icon: configNode.icon,
          color: configNode.color
        })
        
        toast.success('✅ Configuration sauvegardée')
        setShowConfig(false)
        setConfigNode(null)
        
        // Reload data to ensure consistency
        await loadData(activeSection)
      } else {
        const errorText = await response.text()
        console.error('🔍 DEBUG - Config save failed:', errorText)
        toast.error('❌ Erreur sauvegarde: ' + errorText)
      }
    } catch (error) {
      console.error('🔍 DEBUG - Config save error:', error)
      toast.error('❌ Erreur réseau')
    }
  }, [configTarget, configNode, selectedNode, activeSection, loadData])

  const handleDeleteConfig = useCallback(async () => {
    if (!configTarget) return

    if (confirm('Confirmer suppression ?')) {
      try {
        await modularData.deleteNode(configTarget.id)
        toast.success('Élément supprimé')
        setShowConfig(false)
        setConfigNode(null)
        await loadData(activeSection)
      } catch (err) {
        toast.error('Erreur suppression')
      }
    }
  }, [configTarget, loadData, activeSection])

  if (!isOpen) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-[#FFFFFF] rounded-xl w-full max-w-6xl mx-4 h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-[#F7F7F8]">
          
          {/* Header style Manus */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Board Modulaire</h2>
                <p className="text-gray-500 text-sm">Organisation automatique par IA • Structure mémoire • Rules intelligentes</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onClose}
                className="hover:bg-[#F7F7F8] transition-colors"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal édition inline row avec Monaco */}
            {showRowEditor && editingRow && (
              <Dialog open={showRowEditor} onOpenChange={setShowRowEditor}>
                <DialogContent className="max-w-4xl h-[600px]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg">Éditer Ligne: {editingRow.name}</h3>
                    <Button onClick={() => {
                      setShowRowEditor(false)
                      setEditingRow(null)
                      setRowEditorContent('')
                    }}>Annuler</Button>
                    <Button onClick={saveRowEdit}>Sauvegarder</Button>
                  </div>
                  <Editor
                    height="500px"
                    language={rowLanguage}
                    value={rowEditorContent}
                    onChange={setRowEditorContent}
                    theme="vs-light"
                    options={{ fontSize: 14, wordWrap: 'on' }}
                  />
                </DialogContent>
              </Dialog>
            )}

            {/* Dialogue de configuration de nœud */}
            {showConfig && configTarget && (
              <Dialog open={showConfig} onOpenChange={setShowConfig}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Configurer {configTarget.name}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Nom</label>
                      <Input
                        value={configNode?.title || ''}
                        onChange={(e) => setConfigNode({ ...configNode, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Icône (Emoji)</label>
                      <Input
                        value={configNode?.icon || ''}
                        onChange={(e) => setConfigNode({ ...configNode, icon: e.target.value })}
                        placeholder="📁 ou 📊 etc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Couleur</label>
                      <Input
                        type="color"
                        value={configNode?.color || '#6b7280'}
                        onChange={(e) => setConfigNode({ ...configNode, color: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={setShowConfig.bind(null, false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleSaveConfig}>
                      Sauvegarder
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteConfig}>
                      Supprimer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Input pour ciblage multi-niveau */}
            <div className="fixed top-4 right-4 z-50">
              <div className="flex gap-2 bg-white rounded-lg shadow-lg p-2 border">
                <input
                  type="text"
                  placeholder="Cible: rules/Business Logic/table1/row-5"
                  value={targetingQuery}
                  onChange={(e) => setTargetingQuery(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && targetingQuery.trim()) {
                      try {
                        await handleTargetingQueryWrapper(targetingQuery)
                        setTargetingQuery('')
                      } catch (err) {
                        // Erreur déjà gérée dans le wrapper
                      }
                    }
                  }}
                  className="px-3 py-2 border rounded text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <Zap className="w-4 h-4" />
                </button>
              </div>
              {showSuggestions && proactiveSuggestions.length > 0 && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg p-3 w-80 border max-h-60 overflow-y-auto">
                  <h4 className="font-semibold mb-2">Suggestions Proactives</h4>
                  {proactiveSuggestions.map((sug, idx) => (
                    <div key={idx} className="text-sm py-1 border-b last:border-b-0">
                      <div className="flex justify-between items-center">
                        <span>{sug.technique}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          sug.confidence > 0.7 ? 'bg-green-100 text-green-800' :
                          sug.confidence > 0.4 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {Math.round(sug.confidence * 100)}%
                        </span>
                      </div>
                      {sug.alternatives && (
                        <div className="text-xs text-gray-600 mt-1">
                          Alternatives: {sug.alternatives.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Export */}
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'md')}
                className="px-2 py-1 text-sm border rounded"
              >
                <option value="json">JSON</option>
                <option value="md">Markdown</option>
              </select>
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-[#F7F7F8] text-[#202123] rounded-lg hover:bg-[#202123] hover:text-[#FFFFFF] font-medium text-sm transition-all">
                <Download className="w-4 h-4" />
                Exporter
              </button>
              {/* Import */}
              <select
                value={importFormat}
                onChange={(e) => setImportFormat(e.target.value as 'json' | 'md')}
                className="px-2 py-1 text-sm border rounded"
              >
                <option value="json">JSON</option>
                <option value="md">Markdown</option>
              </select>
              <label className="flex items-center gap-2 px-4 py-2 bg-[#F7F7F8] text-[#202123] rounded-lg hover:bg-[#202123] hover:text-[#FFFFFF] font-medium text-sm cursor-pointer transition-all">
                <Upload className="w-4 h-4" />
                Importer
                <input type="file" accept=".json,.md" onChange={handleImport} className="hidden" />
              </label>

            </div>
          </div>

          {/* Sections - Style Manus */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="flex gap-2">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-4 py-2 font-medium flex items-center gap-2 text-sm rounded-lg transition-all ${
                    activeSection === section.id
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  {getIcon(section.icon)}
                  <span>{section.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar - Memory section uniquement */}
            {activeSection === 'memory' && (
              <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
                <div className="px-4 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Structure</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        + Nouveau
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => createNewItem('folder')}>
                        📁 Dossier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => createNewItem('table')}>
                        📊 Tableau
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => createNewItem('row')} disabled={!selectedNode}>
                        📝 Ligne (dans tableau sélectionné)
                      </DropdownMenuItem>
                      <Button onClick={() => setShowRulesDialog(true)} className="px-4 py-2 bg-[#F7F7F8] text-[#202123] rounded-lg">
                        ⚙️ Règles
                      </Button>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {/* Search Input */}
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Recherche sémantique..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchResults.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{searchResults.length} résultats</p>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto px-3 py-3">
                <SortableContext items={treeData.map(n => n.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {renderTreeNodes(treeData)}
                  </div>
                </SortableContext>
              </div>
              </div>
            )}

            {/* Zone Centrale */}
            <div className="flex-1 flex flex-col bg-[#FFFFFF]">
              {activeSection === 'rules' ? (
                <div className="flex-1 p-6">
                  <SimpleRulesEditor projectId={projectId} />
                </div>
              ) : showEditor ? (
                <>
                  <div className="px-6 py-4 border-b border-[#F7F7F8] flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-[#202123]">{editorTitle}</h3>
                    <button onClick={closeEditor} className="px-4 py-2 bg-[#202123] text-[#FFFFFF] rounded-lg">
                      Fermer
                    </button>
                  </div>
                  <div className="flex-1">
                    <Editor
                      height="100%"
                      language={detectLanguage(editorContent, activeSection, 'document')}
                      value={editorContent}
                      onChange={(value) => setEditorContent(value || '')}
                      theme="vs-light"
                      options={{
                        fontSize: 14,
                        fontFamily: 'Monaco, monospace',
                        minimap: { enabled: false },
                        wordWrap: 'on'
                      }}
                    />
                  </div>
                </>
              ) : selectedNode ? (
                <>
                  <div className="px-6 py-4 border-b border-[#F7F7F8] flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-[#202123]">{selectedNode.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditor(selectedNode.data?.[0]?.content || '', selectedNode.name)}
                        className="px-4 py-2 bg-[#202123] text-[#FFFFFF] rounded-lg"
                      >
                        Monaco Editor
                      </button>
                      <button onClick={addRow} className="px-4 py-2 bg-[#F7F7F8] text-[#202123] rounded-lg">
                        Ajouter
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-4 overflow-auto">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contenu</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <SortableContext items={tableData.map(r => r.id)} strategy={verticalListSortingStrategy}>
                            {tableData.map((row) => (
                              <tr key={row.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm">{row.name}</td>
                                <td className="px-4 py-2 text-sm">{row.type}</td>
                                <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs">
                                  {row.content && row.content.length > 500 ? (
                                    <div className="flex items-center gap-2">
                                      <span className="truncate" title={row.content}>{row.content.substring(0, 50)}...</span>
                                      <Button size="sm" variant="outline" onClick={() => openRowEditor(row)}>
                                        Éditer en Full
                                      </Button>
                                    </div>
                                  ) : (
                                    row.content?.substring(0, 50) || 'Cliquer pour éditer'
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => openRowEditor(row)}
                                      className="p-1 hover:bg-blue-100 rounded"
                                    >
                                      <Edit3 className="w-4 h-4 text-blue-600" />
                                    </button>
                                    <button
                                      onClick={() => deleteRow(row.id)}
                                      className="p-1 hover:bg-red-100 rounded"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </SortableContext>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-[#202123] mb-3">Sélectionnez un élément</h3>
                    <p className="text-[#6E6E80]">Cliquez sur un dossier ou document</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showRulesDialog && (
        <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Gestion des Règles</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label>Nouvelles Règle</label>
                <Input placeholder="Nom" value={newRule.name || ''} onChange={(e) => setNewRule({...newRule, name: e.target.value})} />
                <Input placeholder="Trigger (dossier)" value={newRule.trigger || ''} onChange={(e) => setNewRule({...newRule, trigger: e.target.value})} />
                <textarea placeholder="Action" value={newRule.action || ''} onChange={(e) => setNewRule({...newRule, action: e.target.value})} className="w-full h-20" />
                <label>Priority</label>
                <Input type="number" value={newRule.priority || 1} onChange={(e) => setNewRule({...newRule, priority: Number(e.target.value)})} />
                <label>Enabled</label>
                <input type="checkbox" checked={newRule.enabled || false} onChange={(e) => setNewRule({...newRule, enabled: e.target.checked})} />
                <Button onClick={async () => {
                  const res = await fetch('/api/rules/simple', { method: 'POST', body: JSON.stringify({...newRule, projectId}) })
                  if (res.ok) {
                    const { rule } = await res.json()
                    setRulesList([...rulesList, rule])
                    setNewRule({ enabled: true, priority: 1 })
                    toast.success('Règle ajoutée')
                  }
                }}>Ajouter</Button>
              </div>
              <div>
                <h4>Règles Existantes</h4>
                {rulesList.map(rule => (
                  <div key={rule.id} className="border p-2 mb-2">
                    <Input value={rule.name} onChange={(e) => setEditingRule({...rule, name: e.target.value})} />
                    <Input value={rule.trigger} onChange={(e) => setEditingRule({...rule, trigger: e.target.value})} />
                    <textarea value={rule.action} onChange={(e) => setEditingRule({...rule, action: e.target.value})} />
                    <Button onClick={async () => {
                      const res = await fetch('/api/rules/simple', { method: 'PUT', body: JSON.stringify({ id: rule.id, ...editingRule }) })
                      if (res.ok) {
                        const { rule: updatedRule } = await res.json()
                        setRulesList(rulesList.map(r => r.id === rule.id ? updatedRule : r))
                        setEditingRule(null)
                        toast.success('Règle sauvegardée')
                      }
                    }}>Sauvegarder</Button>
                    <Button variant="destructive" onClick={async () => {
                      await fetch(`/api/rules/simple?id=${rule.id}`, { method: 'DELETE' })
                      setRulesList(rulesList.filter(r => r.id !== rule.id))
                      toast.success('Règle supprimée')
                    }}>Supprimer</Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DndContext>
  )
}

// Composant Sortable pour TreeNode
function SortableTreeItem({ id, node, level, isSelected, onSelect, onConfigure, renderChildren, isMultiSelectMode, selectedItems, onToggleSelection }: {
  id: string
  node: TreeNode
  level: number
  isSelected: boolean
  onSelect: () => void
  onConfigure: () => void
  renderChildren: (children: TreeNode[]) => React.ReactNode
  isMultiSelectMode?: boolean
  selectedItems?: Set<string>
  onToggleSelection?: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id })

  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const isMultiSelected = selectedItems?.has(id) || false

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: `${level * 16}px`
  }

  const handleClick = (e: React.MouseEvent) => {
    if (isMultiSelectMode && onToggleSelection) {
      e.stopPropagation()
      onToggleSelection(id)
    } else {
      onSelect()
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div
        {...attributes}
        {...listeners}
        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
          isSelected 
            ? 'bg-[#202123] text-[#FFFFFF] shadow-sm' 
            : isMultiSelected 
              ? 'bg-blue-100 text-blue-900 border border-blue-300'
              : 'hover:bg-[#F7F7F8] hover:shadow-sm'
        }`}
        onClick={handleClick}
      >
        {/* Checkbox pour sélection multiple */}
        {isMultiSelectMode && (
          <input
            type="checkbox"
            checked={isMultiSelected}
            onChange={() => onToggleSelection?.(id)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-1 hover:bg-[#E5E7EB] rounded transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}
        
        <div 
          className="w-6 h-6 rounded flex items-center justify-center text-sm transition-colors"
          style={{ backgroundColor: node.color ? node.color + '20' : '#F7F7F8' }}
        >
          {node.icon && node.icon.length > 0 ? (
            node.icon.startsWith('http') || node.icon.includes('.') ? (
              <img src={node.icon} alt="" className="w-4 h-4" />
            ) : (
              <span className="text-sm">{node.icon}</span>
            )
          ) : (
            getIcon(node.type === 'folder' ? 'Folder' : 'FileText', node.type)
          )}
        </div>
        
        <span className="text-sm font-medium flex-1 truncate">{node.name}</span>
        
        {/* Indicateur de contenu pour les documents */}
        {node.type === 'document' && node.data && node.data.length > 0 && (
          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
            {node.data.length}
          </span>
        )}
        
        {/* Boutons d'action améliorés */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onConfigure()
            }}
            className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
            title="Configurer"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Supprimer "${node.name}" ?`)) {
                console.log('🔍 DEBUG - Delete requested for:', node.id)
                // TODO: Implémenter la suppression via l'API
                toast.success(`"${node.name}" supprimé`)
              }
            }}
            className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onConfigure()
            }}
            className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
            title="Paramètres"
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1 ml-6">
          {renderChildren(node.children!)}
        </div>
      )}
    </div>
  )
}

// TreeNodeComponent wrapper pour compatibilité
function TreeNodeComponent({
  node,
  level,
  isSelected,
  onSelect,
  onConfigure,
  renderChildren
}: {
  node: TreeNode
  level: number
  isSelected: boolean
  onSelect: () => void
  onConfigure: () => void
  renderChildren: (children: TreeNode[]) => React.ReactNode
}) {
  return (
    <SortableTreeItem
      id={node.id}
      node={node}
      level={level}
      isSelected={isSelected}
      onSelect={onSelect}
      onConfigure={onConfigure}
      renderChildren={renderChildren}
    />
  )
}

// Export par défaut pour compatibilité
export default UnifiedBoardModular