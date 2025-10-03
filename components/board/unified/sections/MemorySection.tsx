'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, Plus, FolderPlus, FilePlus, MoreHorizontal,
  ChevronRight, ChevronDown, Edit2, Trash2, Download, Upload,
  Palette, Type, Hash, FileText, Folder, Star, Archive,
  Check, X, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import type { Database } from '@/lib/supabase/database.types'

type MemoryNode = Database['public']['Tables']['memory_nodes']['Row']

interface TreeNode extends MemoryNode {
  children: TreeNode[]
}

// Emoji categories for quick access
const EMOJI_CATEGORIES = {
  'Common': ['📁', '📂', '📄', '📝', '📊', '📈', '✅', '❌', '⭐', '🔥'],
  'Tech': ['💻', '🔧', '⚙️', '🔒', '🔓', '🔑', '🌐', '📡', '💾', '🖥️'],
  'Status': ['✨', '💡', '⚡', '🚀', '🎯', '🏆', '💎', '🔔', '⏰', '📌'],
  'Actions': ['👁️', '✏️', '🗑️', '📤', '📥', '🔄', '➕', '➖', '🔗', '📎']
}

// Color palette
const COLOR_PALETTE = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#14B8A6', '#84CC16', '#F97316', '#06B6D4'
]

interface MemorySectionProps {
  projectId: string
}

export default function MemorySection({ projectId }: MemorySectionProps) {
  const [nodes, setNodes] = useState<MemoryNode[]>([])
  const [tree, setTree] = useState<TreeNode[]>([])
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [loading, setLoading] = useState(true)

  // Drag state
  const [draggedNode, setDraggedNode] = useState<TreeNode | null>(null)
  const [dragOverNode, setDragOverNode] = useState<string | null>(null)

  useEffect(() => {
    loadNodes()
  }, [projectId])

  useEffect(() => {
    if (selectedNode?.content) {
      setEditingContent(selectedNode.content)
    }
  }, [selectedNode])

  const loadNodes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('memory_nodes')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true })

      if (data && !error) {
        setNodes(data)
        const treeData = buildTree(data)
        setTree(treeData)

        // Auto-expand root folders
        const rootFolders = data.filter(n => !n.parent_id && n.type === 'folder')
        setExpandedNodes(new Set(rootFolders.map(f => f.id)))
      }
    } catch (error) {
      console.error('Error loading nodes:', error)
      toast.error('Failed to load memory nodes')
    } finally {
      setLoading(false)
    }
  }

  const buildTree = (nodes: MemoryNode[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    // Create node map
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] })
    })

    // Build tree structure
    nodes.forEach(node => {
      const treeNode = nodeMap.get(node.id)!
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        const parent = nodeMap.get(node.parent_id)!
        parent.children.push(treeNode)
      } else {
        roots.push(treeNode)
      }
    })

    // Sort children
    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => {
        // Folders first, then by position, then by name
        if (a.type === 'folder' && b.type !== 'folder') return -1
        if (a.type !== 'folder' && b.type === 'folder') return 1
        if (a.position !== b.position) return a.position - b.position
        return a.name.localeCompare(b.name)
      })
      node.children.forEach(sortChildren)
    }
    roots.forEach(sortChildren)

    return roots
  }

  const handleDragStart = (e: React.DragEvent, node: TreeNode) => {
    setDraggedNode(node)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault()
    if (draggedNode && draggedNode.id !== nodeId) {
      setDragOverNode(nodeId)
    }
  }

  const handleDragLeave = () => {
    setDragOverNode(null)
  }

  const handleDrop = async (e: React.DragEvent, targetNode: TreeNode) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedNode || draggedNode.id === targetNode.id) {
      setDragOverNode(null)
      setDraggedNode(null)
      return
    }

    // Check if target is a folder or get its parent
    const newParentId = targetNode.type === 'folder' ? targetNode.id : targetNode.parent_id

    // Prevent moving a folder into its own child
    if (isDescendant(draggedNode, targetNode)) {
      toast.error('Cannot move a folder into its own child')
      setDragOverNode(null)
      setDraggedNode(null)
      return
    }

    // Update in database
    const { error } = await supabase
      .from('memory_nodes')
      .update({ parent_id: newParentId })
      .eq('id', draggedNode.id)

    if (!error) {
      toast.success('Item moved successfully')
      loadNodes()

      // Auto-expand target folder
      if (targetNode.type === 'folder' && newParentId) {
        setExpandedNodes(prev => new Set([...prev, newParentId]))
      }
    } else {
      toast.error('Failed to move item')
    }

    setDragOverNode(null)
    setDraggedNode(null)
  }

  const isDescendant = (parent: TreeNode, potentialChild: TreeNode): boolean => {
    if (parent.id === potentialChild.id) return true
    for (const child of parent.children) {
      if (isDescendant(child, potentialChild)) return true
    }
    return false
  }

  const createNode = async (type: 'folder' | 'document') => {
    const parentId = selectedNode?.type === 'folder' ? selectedNode.id : selectedNode?.parent_id

    const { data, error } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: projectId,
        parent_id: parentId,
        name: type === 'folder' ? 'New Folder' : 'New Document',
        type,
        icon: type === 'folder' ? '📁' : '📄',
        color: '#6B7280',
        content: type === 'document' ? '# New Document\n\nStart writing...' : null,
        position: 0
      })
      .select()
      .single()

    if (data && !error) {
      toast.success(`${type === 'folder' ? 'Folder' : 'Document'} created`)
      loadNodes()

      if (type === 'document') {
        setSelectedNode(data)
      }

      // Auto-expand parent
      if (parentId) {
        setExpandedNodes(prev => new Set([...prev, parentId]))
      }
    } else {
      toast.error('Failed to create item')
    }
  }

  const updateNode = async (nodeId: string, updates: Partial<MemoryNode>) => {
    const { error } = await supabase
      .from('memory_nodes')
      .update(updates)
      .eq('id', nodeId)

    if (!error) {
      loadNodes()
      if (selectedNode?.id === nodeId) {
        setSelectedNode(prev => prev ? { ...prev, ...updates } : null)
      }
    } else {
      toast.error('Failed to update')
    }
  }

  const deleteNode = async (nodeId: string) => {
    if (!confirm('Delete this item and all its children?')) return

    const { error } = await supabase
      .from('memory_nodes')
      .delete()
      .eq('id', nodeId)

    if (!error) {
      toast.success('Deleted successfully')
      loadNodes()
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
      }
    } else {
      toast.error('Failed to delete')
    }
  }

  const saveContent = async () => {
    if (!selectedNode) return

    const { error } = await supabase
      .from('memory_nodes')
      .update({ content: editingContent })
      .eq('id', selectedNode.id)

    if (!error) {
      toast.success('Content saved')
      setSelectedNode(prev => prev ? { ...prev, content: editingContent } : null)
    } else {
      toast.error('Failed to save')
    }
  }

  // Render tree item
  const TreeItem = ({ node, depth = 0 }: { node: TreeNode; depth?: number }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(node.name)
    const [showIconPicker, setShowIconPicker] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNode?.id === node.id
    const isDragOver = dragOverNode === node.id

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    }, [isEditing])

    const handleRename = () => {
      if (editName.trim() && editName !== node.name) {
        updateNode(node.id, { name: editName.trim() })
      }
      setIsEditing(false)
    }

    return (
      <div>
        <div
          draggable={!isEditing}
          onDragStart={(e) => !isEditing && handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node)}
          className={cn(
            "group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-all",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            isSelected && "bg-blue-50 dark:bg-blue-900/20",
            isDragOver && "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400",
            draggedNode?.id === node.id && "opacity-50"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => node.type === 'document' && setSelectedNode(node)}
        >
          {/* Expand/Collapse */}
          {node.type === 'folder' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const newExpanded = new Set(expandedNodes)
                if (isExpanded) {
                  newExpanded.delete(node.id)
                } else {
                  newExpanded.add(node.id)
                }
                setExpandedNodes(newExpanded)
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}

          {/* Icon */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowIconPicker(!showIconPicker)
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              style={{ color: node.color || '#6B7280' }}
            >
              <span className="text-base">{node.icon || '📄'}</span>
            </button>

            {/* Icon Picker Popup */}
            {showIconPicker && (
              <div className="absolute top-8 left-0 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border p-3 w-64">
                <div className="space-y-2">
                  {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                    <div key={category}>
                      <div className="text-xs font-medium text-gray-500 mb-1">{category}</div>
                      <div className="grid grid-cols-10 gap-1">
                        {emojis.map(emoji => (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              e.stopPropagation()
                              updateNode(node.id, { icon: emoji })
                              setShowIconPicker(false)
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          {isEditing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') {
                  setEditName(node.name)
                  setIsEditing(false)
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-1 py-0.5 text-sm bg-white dark:bg-gray-800 border rounded"
            />
          ) : (
            <span
              className="flex-1 text-sm truncate"
              onDoubleClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
            >
              {node.name}
            </span>
          )}

          {/* Actions */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowColorPicker(!showColorPicker)
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <Palette size={12} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteNode(node.id)
              }}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
            >
              <Trash2 size={12} />
            </button>

            {/* Color Picker */}
            {showColorPicker && (
              <div className="absolute top-8 right-0 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border p-2">
                <div className="grid grid-cols-4 gap-1">
                  {COLOR_PALETTE.map(color => (
                    <button
                      key={color}
                      onClick={(e) => {
                        e.stopPropagation()
                        updateNode(node.id, { color })
                        setShowColorPicker(false)
                      }}
                      className="w-7 h-7 rounded border-2 border-transparent hover:border-gray-400"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {isExpanded && node.children.length > 0 && (
          <div>
            {node.children.map(child => (
              <TreeItem key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Tree View */}
      <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Toolbar */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => createNode('folder')}
              className="flex-1"
            >
              <FolderPlus size={14} className="mr-1" />
              Folder
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => createNode('document')}
              className="flex-1"
            >
              <FilePlus size={14} className="mr-1" />
              Document
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={20} className="animate-spin text-gray-400" />
            </div>
          ) : (
            tree.map(node => <TreeItem key={node.id} node={node} />)
          )}
        </div>
      </div>

      {/* Right - Editor */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        {selectedNode ? (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <span className="text-lg" style={{ color: selectedNode.color }}>
                  {selectedNode.icon}
                </span>
                <h3 className="font-semibold">{selectedNode.name}</h3>
              </div>
              <Button size="sm" onClick={saveContent}>
                Save
              </Button>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className="w-full h-full p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Start writing..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a document to edit</p>
              <p className="text-sm mt-2">or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}