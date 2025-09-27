'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Plus, ChevronRight, Search, MoreHorizontal, Folder, FileText, 
  Edit2, Trash2, FolderPlus, Star, Clock, Filter, Command,
  X, Check, ArrowRight, Grip
} from 'lucide-react'
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

export default function MemorySidebarProfessional({ projectId }: MemorySidebarProps) {
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [recentNodes, setRecentNodes] = useState<string[]>([])
  
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadNodes()
    const cleanup = subscribeToChanges()

    const interval = setInterval(() => {
      loadNodes()
    }, 2000)

    // Raccourcis clavier
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault()
            setShowSearch(true)
            setTimeout(() => searchInputRef.current?.focus(), 100)
            break
          case 'n':
            e.preventDefault()
            setIsCreating(true)
            break
        }
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
        setContextMenu(null)
        setIsCreating(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('click', () => setContextMenu(null))

    return () => {
      cleanup()
      clearInterval(interval)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', () => setContextMenu(null))
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
      color: '#202123',
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

  const toggleFavorite = (nodeId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(nodeId)) {
      newFavorites.delete(nodeId)
    } else {
      newFavorites.add(nodeId)
    }
    setFavorites(newFavorites)
  }

  const addToRecent = (nodeId: string) => {
    setRecentNodes(prev => {
      const filtered = prev.filter(id => id !== nodeId)
      return [nodeId, ...filtered].slice(0, 5)
    })
  }

  const handleContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId })
  }

  const filteredNodes = nodes.filter(node => 
    searchQuery === '' || 
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.content && typeof node.content === 'string' && node.content.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const favoriteNodes = nodes.filter(node => favorites.has(node.id))
  const recentNodesData = recentNodes.map(id => nodes.find(n => n.id === id)).filter(Boolean) as MemoryNode[]

  const renderNode = (node: MemoryNode, level: number = 0, isInSection: boolean = false) => {
    const children = filteredNodes.filter(n => n.parent_id === node.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNode === node.id
    const isRenaming = renamingNode === node.id
    const isDragOver = dragOverNode === node.id
    const isHovered = hoveredNode === node.id
    const isFavorite = favorites.has(node.id)

    const Icon = NODE_ICONS[node.type] || Folder

    return (
      <motion.div
        key={`${node.id}-${isInSection ? 'section' : 'tree'}`}
        initial={{ opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -2 }}
        transition={{ duration: 0.15 }}
      >
        <div
          className={`
            relative flex items-center gap-2 py-2 mx-1 rounded-md cursor-pointer 
            transition-all duration-150 ease-out group
            ${isSelected 
              ? 'bg-blue-50 border border-blue-200 text-blue-900 shadow-sm' 
              : isHovered 
                ? 'bg-[#F7F7F8]' 
                : 'hover:bg-[#F7F7F8]'
            }
            ${isDragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}
          `}
          style={{ paddingLeft: `${level * 12 + (isInSection ? 8 : 16)}px`, paddingRight: '12px' }}
          draggable={!isInSection}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
          onContextMenu={(e) => handleContextMenu(e, node.id)}
          onDragStart={(e) => {
            if (!isInSection) {
              setDraggedNode(node)
              e.dataTransfer.effectAllowed = 'move'
            }
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
            addToRecent(node.id)
            if (hasChildren && !isInSection) toggleExpand(node.id)
          }}
          onDoubleClick={() => {
            if (node.type === 'document') {
              setFullEditNode(node)
            }
          }}
        >
          {/* Drag Handle */}
          {!isInSection && (isHovered || isSelected) && (
            <div className={`absolute -left-1 top-1/2 -translate-y-1/2 opacity-40 ${
              isSelected ? 'z-10' : ''
            }`}>
              <Grip className={`w-3 h-3 ${isSelected ? 'text-blue-600' : 'text-[#6E6E80]'}`} />
            </div>
          )}

          {/* Expand/Collapse Button */}
          {hasChildren && !isInSection ? (
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.id)
              }}
              className="p-0.5 rounded hover:bg-black/5 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.15 }}
              >
                <ChevronRight className={`w-3 h-3 ${isSelected ? 'text-blue-700' : 'text-[#6E6E80]'}`} />
              </motion.div>
            </motion.button>
          ) : (
            <div className="w-4 h-4" />
          )}

          {/* Icon */}
          <div className={`w-5 h-5 flex items-center justify-center flex-shrink-0 rounded ${
            isSelected ? 'text-blue-700' : 'text-[#202123]'
          }`}>
            {node.icon && !isInSection ? (
              <span className="text-xs">{node.icon}</span>
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
              className="flex-1 px-2 py-1 text-sm bg-white border border-[#E5E5E7] rounded focus:outline-none focus:border-[#202123]"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={`text-sm font-medium truncate flex-1 ${
              isSelected ? 'text-blue-900' : 'text-[#202123]'
            }`}>
              {node.name}
            </span>
          )}

          {/* Favorite Star */}
          {isFavorite && (
            <Star className={`w-3 h-3 fill-current ${
              isSelected ? 'text-yellow-300' : 'text-yellow-500'
            }`} />
          )}

          {/* Action Buttons */}
          <AnimatePresence>
            {(isHovered || isSelected) && !isRenaming && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-0.5"
              >
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleContextMenu(e, node.id)
                  }}
                  className={`p-1 rounded transition-colors ${
                    isSelected 
                      ? 'hover:bg-blue-100 text-blue-700' 
                      : 'hover:bg-black/5 text-[#6E6E80]'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MoreHorizontal className="w-3 h-3" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Children */}
        <AnimatePresence>
          {isExpanded && hasChildren && !isInSection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
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
              className="mx-4 my-2 p-3 bg-[#F7F7F8] border border-[#E5E5E7] rounded-lg"
              style={{ marginLeft: `${level * 12 + 24}px` }}
            >
              <input
                type="text"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder="Nom de l'élément..."
                className="w-full px-3 py-2 text-sm bg-white border border-[#E5E5E7] rounded focus:outline-none focus:border-[#202123]"
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
                  className="flex-1 px-3 py-2 text-sm bg-white border border-[#E5E5E7] rounded focus:outline-none focus:border-[#202123]"
                >
                  <option value="folder">📁 Dossier</option>
                  <option value="document">📄 Document</option>
                </select>
                <motion.button
                  onClick={createNode}
                  className="px-4 py-2 text-sm bg-[#202123] text-white rounded hover:bg-[#202123]/90 transition-colors"
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
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[#E5E5E7]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#202123] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <div>
              <h3 className="font-semibold text-[#202123] text-sm">Mémoire</h3>
              <p className="text-xs text-[#6E6E80]">{nodes.length} éléments</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <motion.button
              onClick={() => {
                setShowSearch(!showSearch)
                if (!showSearch) {
                  setTimeout(() => searchInputRef.current?.focus(), 100)
                }
              }}
              className="p-2 hover:bg-[#F7F7F8] rounded-md transition-colors"
              title="Rechercher (Ctrl+K)"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Search className="w-4 h-4 text-[#6E6E80]" />
            </motion.button>
            <motion.button
              onClick={() => setIsCreating(true)}
              className="p-2 bg-[#202123] hover:bg-[#202123]/90 text-white rounded-md transition-colors"
              title="Nouveau (Ctrl+N)"
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
              className="mb-4"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E80]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher dans la mémoire..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-[#F7F7F8] border border-[#E5E5E7] rounded-lg focus:outline-none focus:border-[#202123] focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-[#E5E5E7] rounded"
                  >
                    <X className="w-3 h-3 text-[#6E6E80]" />
                  </button>
                )}
              </div>
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
              className="space-y-3 p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E5E7]"
            >
              <input
                type="text"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder="Nom de l'élément..."
                className="w-full px-3 py-2 text-sm bg-white border border-[#E5E5E7] rounded focus:outline-none focus:border-[#202123]"
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
                  className="flex-1 px-3 py-2 text-sm bg-white border border-[#E5E5E7] rounded focus:outline-none focus:border-[#202123]"
                >
                  <option value="folder">📁 Dossier</option>
                  <option value="document">📄 Document</option>
                </select>
                <motion.button
                  onClick={createNode}
                  className="px-4 py-2 text-sm bg-[#202123] text-white rounded hover:bg-[#202123]/90 transition-colors"
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

      {/* Quick Access - Favoris uniquement */}
      {favoriteNodes.length > 0 && (
        <div className="flex-shrink-0 px-2 py-3 border-b border-[#E5E5E7] bg-[#F7F7F8]/50">
          <div className="flex items-center gap-2 px-3 py-1 mb-2">
            <Star className="w-3 h-3 text-[#6E6E80]" />
            <span className="text-xs font-medium text-[#6E6E80] uppercase tracking-wide">Favoris</span>
          </div>
          {favoriteNodes.slice(0, 3).map(node => renderNode(node, 0, true))}
        </div>
      )}

      {/* Nodes Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        <AnimatePresence>
          {rootNodes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[#6E6E80] text-sm p-8"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-[#F7F7F8] rounded-full flex items-center justify-center">
                <Folder className="w-8 h-8 text-[#6E6E80]" />
              </div>
              <p className="mb-2 font-medium">Aucun élément de mémoire</p>
              <p className="text-xs">Utilisez <kbd className="px-1.5 py-0.5 bg-[#E5E5E7] rounded text-xs">Ctrl+N</kbd> pour créer</p>
            </motion.div>
          ) : (
            rootNodes.map(node => renderNode(node))
          )}
        </AnimatePresence>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 bg-white border border-[#E5E5E7] rounded-lg shadow-lg py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                const node = nodes.find(n => n.id === contextMenu.nodeId)
                if (node?.type === 'document') {
                  setFullEditNode(node)
                } else {
                  setRenamingNode(contextMenu.nodeId)
                  setRenameValue(node?.name || '')
                }
                setContextMenu(null)
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[#F7F7F8] flex items-center gap-2"
            >
              <Edit2 className="w-3 h-3" />
              {nodes.find(n => n.id === contextMenu.nodeId)?.type === 'document' ? 'Éditer' : 'Renommer'}
            </button>
            <button
              onClick={() => {
                toggleFavorite(contextMenu.nodeId)
                setContextMenu(null)
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[#F7F7F8] flex items-center gap-2"
            >
              <Star className="w-3 h-3" />
              {favorites.has(contextMenu.nodeId) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </button>
            <div className="border-t border-[#E5E5E7] my-1" />
            <button
              onClick={() => {
                const node = nodes.find(n => n.id === contextMenu.nodeId)
                if (node?.type === 'folder') {
                  setCreatingInFolder(contextMenu.nodeId)
                  setIsCreating(true)
                  setExpandedNodes(prev => new Set([...prev, contextMenu.nodeId]))
                }
                setContextMenu(null)
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[#F7F7F8] flex items-center gap-2"
              disabled={nodes.find(n => n.id === contextMenu.nodeId)?.type !== 'folder'}
            >
              <FolderPlus className="w-3 h-3" />
              Ajouter dans le dossier
            </button>
            <button
              onClick={() => {
                deleteNode(contextMenu.nodeId)
                setContextMenu(null)
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-3 h-3" />
              Supprimer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
