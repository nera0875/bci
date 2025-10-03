'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, Plus, FolderPlus, FilePlus, ChevronRight, ChevronDown,
  MoreHorizontal, Trash2, Edit2, Download, Upload,
  Search, Hash, FileText, Folder
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/supabase/database.types'
import { exportImportService } from '@/lib/services/exportImportService'

type MemoryNode = Database['public']['Tables']['memory_nodes']['Row']

interface TreeNode extends MemoryNode {
  children: TreeNode[]
}

// Emoji palette
const EMOJI_OPTIONS = [
  '📁', '📂', '📄', '📝', '📊', '📈', '📉', '📋',
  '✅', '❌', '⚡', '🔥', '💡', '🎯', '🔒', '🔓',
  '🚀', '⭐', '💎', '🏆', '🎨', '🔧', '⚙️', '📌'
]

// Color palette
const COLOR_OPTIONS = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#14B8A6', '#84CC16', '#F97316', '#06B6D4'
]

// TreeItem Component with better drag handling
function TreeItem({
  node,
  depth = 0,
  isExpanded,
  onToggle,
  onSelect,
  isSelected,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
  dragOverId
}: {
  node: TreeNode
  depth?: number
  isExpanded: boolean
  onToggle: () => void
  onSelect: () => void
  isSelected: boolean
  onUpdate: (updates: Partial<MemoryNode>) => void
  onDelete: () => void
  onDragStart: (e: React.DragEvent, node: TreeNode) => void
  onDragEnd: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent, nodeId: string) => void
  onDrop: (e: React.DragEvent, targetNode: TreeNode) => void
  isDragging: boolean
  dragOverId: string | null
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(node.name)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleRename = () => {
    if (editName.trim() && editName !== node.name) {
      onUpdate({ name: editName.trim() })
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleRename()
    } else if (e.key === 'Escape') {
      setEditName(node.name)
      setIsEditing(false)
    }
  }

  return (
    <div>
      <div
        draggable={!isEditing}
        onDragStart={(e) => !isEditing && onDragStart(e, node)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDrop={(e) => onDrop(e, node)}
        className={cn(
          "group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          isSelected && "bg-blue-50 dark:bg-blue-900/20",
          isDragging && "opacity-50",
          dragOverId === node.id && "bg-blue-100 dark:bg-blue-900/30"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={(e) => {
          if (!isEditing && e.target === e.currentTarget) {
            onSelect()
          }
        }}
      >
        {/* Expand/Collapse for folders */}
        {node.type === 'folder' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-gray-500" />
            ) : (
              <ChevronRight size={14} className="text-gray-500" />
            )}
          </button>
        )}

        {/* Icon */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowEmojiPicker(!showEmojiPicker)
              setShowColorPicker(false)
              setShowMenu(false)
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <span className="text-base" style={{ color: node.color || '#6B7280' }}>
              {node.icon || (node.type === 'folder' ? '📁' : '📄')}
            </span>
          </button>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute top-7 left-0 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-lg border p-2">
              <div className="grid grid-cols-6 gap-1">
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdate({ icon: emoji })
                      setShowEmojiPicker(false)
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-lg"
                  >
                    {emoji}
                  </button>
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
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-1 py-0.5 text-sm bg-white dark:bg-gray-800 border rounded"
          />
        ) : (
          <span
            className="flex-1 text-sm select-none truncate"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
          >
            {node.name}
          </span>
        )}

        {/* Actions Menu */}
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
              setShowEmojiPicker(false)
              setShowColorPicker(false)
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <MoreHorizontal size={14} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-6 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-lg border py-1 min-w-[140px]">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                  setShowMenu(false)
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <Edit2 size={12} /> Rename
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowColorPicker(true)
                  setShowMenu(false)
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: node.color || '#6B7280' }} />
                Color
              </button>

              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                  setShowMenu(false)
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}

          {/* Color Picker */}
          {showColorPicker && (
            <div className="absolute right-0 top-6 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-lg border p-2">
              <div className="grid grid-cols-4 gap-1">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdate({ color })
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
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              isExpanded={false}
              onToggle={() => {}}
              onSelect={() => {}}
              isSelected={false}
              onUpdate={() => {}}
              onDelete={() => {}}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
              isDragging={isDragging}
              dragOverId={dragOverId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function NotionLikeBoard({
  projectId,
  projectName = 'Project',
  isOpen,
  onClose
}: {
  projectId: string
  projectName?: string
  isOpen: boolean
  onClose: () => void
}) {
  const [nodes, setNodes] = useState<MemoryNode[]>([])
  const [tree, setTree] = useState<TreeNode[]>([])
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [editingContent, setEditingContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Drag state
  const [draggedNode, setDraggedNode] = useState<TreeNode | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadNodes()
    }
  }, [isOpen, projectId])

  useEffect(() => {
    if (selectedNode?.content) {
      setEditingContent(selectedNode.content)
    }
  }, [selectedNode])

  const loadNodes = async () => {
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
  }

  const buildTree = (nodes: MemoryNode[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] })
    })

    nodes.forEach(node => {
      const treeNode = nodeMap.get(node.id)!
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        const parent = nodeMap.get(node.parent_id)!
        parent.children.push(treeNode)
      } else {
        roots.push(treeNode)
      }
    })

    // Sort children by position then name
    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position
        return a.name.localeCompare(b.name)
      })
      node.children.forEach(sortChildren)
    }
    roots.forEach(sortChildren)

    return roots
  }

  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node
      const found = findNodeById(node.children, id)
      if (found) return found
    }
    return null
  }

  const handleDragStart = (e: React.DragEvent, node: TreeNode) => {
    setDraggedNode(node)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedNode(null)
    setDragOverId(null)
  }

  const handleDragOver = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (draggedNode && draggedNode.id !== nodeId) {
      setDragOverId(nodeId)
      e.dataTransfer.dropEffect = 'move'
    }
  }

  const handleDrop = async (e: React.DragEvent, targetNode: TreeNode) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedNode || draggedNode.id === targetNode.id) {
      setDragOverId(null)
      return
    }

    // Prevent dropping a parent into its own child
    const isDescendant = (parent: TreeNode, child: TreeNode): boolean => {
      if (parent.id === child.id) return true
      for (const c of parent.children) {
        if (isDescendant(c, child)) return true
      }
      return false
    }

    if (isDescendant(draggedNode, targetNode)) {
      toast.error("Cannot move a folder into its own child")
      setDragOverId(null)
      return
    }

    // Update in database
    const newParentId = targetNode.type === 'folder' ? targetNode.id : targetNode.parent_id

    const { error } = await supabase
      .from('memory_nodes')
      .update({ parent_id: newParentId })
      .eq('id', draggedNode.id)

    if (!error) {
      toast.success('Moved successfully')
      loadNodes()

      // Auto-expand target folder
      if (targetNode.type === 'folder') {
        setExpandedNodes(prev => new Set([...prev, targetNode.id]))
      }
    } else {
      toast.error('Failed to move item')
    }

    setDragOverId(null)
  }

  const handleUpdate = async (nodeId: string, updates: Partial<MemoryNode>) => {
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

  const handleDelete = async (nodeId: string) => {
    if (!confirm('Delete this item and all its children?')) return

    const { error } = await supabase
      .from('memory_nodes')
      .delete()
      .eq('id', nodeId)

    if (!error) {
      toast.success('Deleted')
      loadNodes()
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
      }
    } else {
      toast.error('Failed to delete')
    }
  }

  const handleSaveContent = async () => {
    if (!selectedNode) return

    const { error } = await supabase
      .from('memory_nodes')
      .update({ content: editingContent })
      .eq('id', selectedNode.id)

    if (!error) {
      toast.success('Saved')
    } else {
      toast.error('Failed to save')
    }
  }

  const createNode = async (type: 'folder' | 'document', parentId: string | null = null) => {
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
        setEditingContent(data.content || '')
      }

      // Auto-expand parent folder
      if (parentId) {
        setExpandedNodes(prev => new Set([...prev, parentId]))
      }
    } else {
      toast.error('Failed to create')
    }
  }

  const renderTree = (nodes: TreeNode[]) => {
    return nodes.map(node => {
      const isExpanded = expandedNodes.has(node.id)

      return (
        <TreeItem
          key={node.id}
          node={node}
          isExpanded={isExpanded}
          onToggle={() => {
            const newExpanded = new Set(expandedNodes)
            if (isExpanded) {
              newExpanded.delete(node.id)
            } else {
              newExpanded.add(node.id)
            }
            setExpandedNodes(newExpanded)
          }}
          onSelect={() => {
            if (node.type === 'document') {
              setSelectedNode(node)
              setEditingContent(node.content || '')
            }
          }}
          isSelected={selectedNode?.id === node.id}
          onUpdate={(updates) => handleUpdate(node.id, updates)}
          onDelete={() => handleDelete(node.id)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          isDragging={draggedNode?.id === node.id}
          dragOverId={dragOverId}
        />
      )
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Knowledge Board</h2>
            <span className="text-sm text-gray-500">Organize your documentation</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.bci'
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    const result = await exportImportService.importProject(file, projectId)
                    if (result.success) {
                      toast.success(`Imported: ${result.imported?.nodes} nodes, ${result.imported?.rules} rules`)
                      loadNodes()
                    } else {
                      toast.error(result.error || 'Import failed')
                    }
                  }
                }
                input.click()
              }}
            >
              <Upload size={16} className="mr-1" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const result = await exportImportService.exportProject(projectId, projectName)
                if (result.success) {
                  toast.success(`Exported to ${result.fileName}`)
                } else {
                  toast.error('Export failed')
                }
              }}
            >
              <Download size={16} className="mr-1" />
              Export
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-r flex flex-col">
            {/* Toolbar */}
            <div className="p-3 border-b space-y-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => createNode('folder', selectedNode?.type === 'folder' ? selectedNode.id : selectedNode?.parent_id)}
                >
                  <FolderPlus size={14} className="mr-1" />
                  Folder
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => createNode('document', selectedNode?.type === 'folder' ? selectedNode.id : selectedNode?.parent_id)}
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
              {renderTree(tree)}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col">
            {selectedNode ? (
              <>
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{selectedNode.icon}</span>
                    <h3 className="font-semibold">{selectedNode.name}</h3>
                  </div>
                  <Button size="sm" onClick={handleSaveContent} variant="default">
                    Save
                  </Button>
                </div>
                <div className="flex-1 p-4">
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full h-full p-4 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      </div>
    </div>
  )
}