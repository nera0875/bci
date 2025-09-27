'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronRight, ChevronDown, Folder, FileText, Edit2, Trash2, FolderPlus, Search, Filter, MoreHorizontal } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import CentralEditorOptimized from './CentralEditorOptimized'
import { motion, AnimatePresence } from 'framer-motion'

type MemoryNode = Database['public']['Tables']['memory_nodes']['Row']
type MemoryNodeInsert = Database['public']['Tables']['memory_nodes']['Insert']
type MemoryNodeUpdate = Database['public']['Tables']['memory_nodes']['Update']

interface MemorySidebarProps {
  projectId: string
}

const NODE_ICONS = {
  folder: Folder,
  document: FileText
}

export default function MemorySidebarOptimized({ projectId }: MemorySidebarProps) {
  const [nodes, setNodes] = useState<MemoryNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newNodeName, setNewNodeName] = useState('')
  const [newNodeType, setNewNodeType] = useState<MemoryNode['type']>('folder')
  const [refreshKey, setRefreshKey] = useState(0)
  const [creatingInFolder, setCreatingInFolder] = useState<string | null>(null)
  const [fullEditNode, setFullEditNode] = useState<MemoryNode | null>(null)
  const [renamingNode, setRenamingNode] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [draggedNode, setDraggedNode] = useState<MemoryNode | null>(null)
  const [dragOverNode, setDragOverNode] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  useEffect(() => {
    loadNodes()
    const cleanup = subscribeToChanges()

    const interval = setInterval(() => {
      loadNodes()
    }, 2000)

    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [projectId, refreshKey])

  const loadNodes = async () => {
    const { data, error } = await supabase
      .from('memory_nodes')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true })

    if (data && !error) {
      setNodes(data)
    }
  }

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(`memory_${projectId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memory_nodes',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Memory change detected:', payload)
          loadNodes()
          setRefreshKey(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const createNode = async () => {
    if (!newNodeName.trim()) return

    const insertData: MemoryNodeInsert = {
      project_id: projectId,
      parent_id: creatingInFolder || null,
      name: newNodeName,
      type: newNodeType,
      icon: newNodeType === 'folder' ? '📁' : '📄',
      color: '#6366f1',
      content: newNodeType === 'document' ? `# ${newNodeName}\n\nContenu ici...` : null,
      position: 0
    }

    const { error } = await supabase
      .from('memory_nodes')
      .insert(insertData)

    if (!error) {
      setNewNodeName('')
      setIsCreating(false)
      setCreatingInFolder(null)
      setTimeout(() => loadNodes(), 100)
    }
  }

  const deleteNode = async (nodeId: string) => {
    if (confirm('Supprimer cet élément et tous ses enfants ?')) {
      const { error } = await supabase
        .from('memory_nodes')
        .delete()
        .eq('id', nodeId)

      if (!error) {
        setTimeout(() => loadNodes(), 100)
      }
    }
  }

  const renameNode = async (nodeId: string, newName: string) => {
    const updateData: MemoryNodeUpdate = { 
      name: newName, 
      updated_at: new Date().toISOString() 
    }

    const { error } = await supabase
      .from('memory_nodes')
      .update(updateData)
      .eq('id', nodeId)

    if (!error) {
      setRenamingNode(null)
      setRenameValue('')
      setTimeout(() => loadNodes(), 100)
    }
  }

  const moveNode = async (nodeId: string, newParentId: string | null) => {
    const updateData: MemoryNodeUpdate = { 
      parent_id: newParentId, 
      updated_at: new Date().toISOString() 
    }

    const { error } = await supabase
      .from('memory_nodes')
      .update(updateData)
      .eq('id', nodeId)

    if (!error) {
      setTimeout(() => loadNodes(), 100)
    }
  }

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const filteredNodes = nodes.filter(node => 
    searchQuery === '' || 
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.content && typeof node.content === 'string' && node.content.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const renderNode = (node: MemoryNode, level: number = 0) => {
    const children = filteredNodes.filter(n => n.parent_id === node.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNode === node.id
    const isRenaming = renamingNode === node.id
    const isDragOver = dragOverNode === node.id
    const isHovered = hoveredNode === node.id

    const Icon = NODE_ICONS[node.type] || Folder

    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className={`
            relative flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg cursor-pointer 
            transition-all duration-200 ease-in-out group
            ${isSelected 
              ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 shadow-sm' 
              : isHovered 
                ? 'bg-slate-100/80 dark:bg-slate-800/80' 
                : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
            }
            ${isDragOver ? 'bg-indigo-100/50 dark:bg-indigo-900/30 border-2 border-dashed border-indigo-400/50' : ''}
          `}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          draggable
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
          onDragStart={(e) => {
            setDraggedNode(node)
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (draggedNode && node.type === 'folder' && draggedNode.id !== node.id) {
              setDragOverNode(node.id)
            }
          }}
          onDragLeave={() => setDragOverNode(null)}
          onDrop={(e) => {
            e.preventDefault()
            if (draggedNode && node.type === 'folder' && draggedNode.id !== node.id) {
              moveNode(draggedNode.id, node.id)
            }
            setDraggedNode(null)
            setDragOverNode(null)
          }}
          onClick={() => {
            setSelectedNode(node.id)
            if (hasChildren) toggleExpand(node.id)
          }}
          onDoubleClick={() => setFullEditNode(node)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.id)
              }}
              className="p-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </motion.div>
            </motion.button>
          ) : (
            <div className="w-4 h-4" />
          )}

          {/* Icon */}
          <div
            className="w-6 h-6 flex items-center justify-center flex-shrink-0 rounded-md"
            style={{ 
              backgroundColor: `${node.color || '#6366f1'}15`,
              color: node.color || '#6366f1'
            }}
          >
            {node.icon ? (
              <span className="text-sm">{node.icon}</span>
            ) : (
              <Icon className="w-4 h-4" />
            )}
          </div>

          {/* Name/Rename Input */}
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameNode(node.id, renameValue)
                if (e.key === 'Escape') {
                  setRenamingNode(null)
                  setRenameValue('')
                }
              }}
              onBlur={() => renameNode(node.id, renameValue)}
              className="flex-1 px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex-1">
              {node.name}
            </span>
          )}

          {/* Action Buttons */}
          <AnimatePresence>
            {(isHovered || isSelected) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1"
              >
                {node.type === 'folder' && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation()
                      setCreatingInFolder(node.id)
                      setIsCreating(true)
                      setExpandedNodes(prev => new Set([...prev, node.id]))
                    }}
                    className="p-1.5 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 rounded-md transition-colors"
                    title="Ajouter dans le dossier"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
                  </motion.button>
                )}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (node.type === 'folder') {
                      setRenamingNode(node.id)
                      setRenameValue(node.name)
                    } else {
                      setFullEditNode(node)
                    }
                  }}
                  className="p-1.5 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 rounded-md transition-colors"
                  title={node.type === 'folder' ? 'Renommer' : 'Éditer'}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                </motion.button>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNode(node.id)
                  }}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
                  title="Supprimer"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Children */}
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children.map(child => renderNode(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create new item in folder */}
        <AnimatePresence>
          {isCreating && creatingInFolder === node.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 my-2 p-3 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg"
              style={{ marginLeft: `${level * 16 + 32}px` }}
            >
              <input
                type="text"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder="Nom de l'élément..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createNode()
                  if (e.key === 'Escape') {
                    setIsCreating(false)
                    setCreatingInFolder(null)
                  }
                }}
              />
              <div className="flex gap-2 mt-3">
                <select
                  value={newNodeType}
                  onChange={(e) => setNewNodeType(e.target.value as MemoryNode['type'])}
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="folder">📁 Dossier</option>
                  <option value="document">📄 Document</option>
                </select>
                <motion.button
                  onClick={createNode}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Créer
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  const rootNodes = filteredNodes.filter(n => !n.parent_id)

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Mémoire</h3>
          </div>
          <div className="flex items-center gap-1">
            <motion.button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 rounded-lg transition-colors"
              title="Rechercher"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Search className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </motion.button>
            <motion.button
              onClick={() => setIsCreating(true)}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              title="Ajouter un élément"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans la mémoire..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create New Node */}
        <AnimatePresence>
          {isCreating && !creatingInFolder && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <input
                type="text"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder="Nom de l'élément..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createNode()
                  if (e.key === 'Escape') setIsCreating(false)
                }}
              />
              <div className="flex gap-2">
                <select
                  value={newNodeType}
                  onChange={(e) => setNewNodeType(e.target.value as MemoryNode['type'])}
                  className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="folder">📁 Dossier</option>
                  <option value="document">📄 Document</option>
                </select>
                <motion.button
                  onClick={createNode}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Créer
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nodes Tree */}
      <div className="flex-1 overflow-y-auto py-2" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <AnimatePresence>
          {rootNodes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-slate-500 dark:text-slate-400 text-sm p-8"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <Folder className="w-8 h-8 text-slate-400" />
              </div>
              <p className="mb-2">Aucun élément de mémoire</p>
              <p className="text-xs">Cliquez sur + pour créer des dossiers et documents</p>
            </motion.div>
          ) : (
            rootNodes.map(node => renderNode(node))
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{nodes.length} éléments</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Système IA</span>
          </div>
        </div>
      </div>

      {/* Full Memory Editor Modal */}
      <AnimatePresence>
        {fullEditNode && (
          <CentralEditorOptimized
            node={fullEditNode}
            onClose={() => setFullEditNode(null)}
            onSave={() => {
              loadNodes()
              setRefreshKey(prev => prev + 1)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
