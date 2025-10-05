'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Folder, File, Plus, Search, FileText, Shield,
  Database, Globe, Server, Terminal, Code, Bug,
  Key, Lock, AlertTriangle, CheckCircle, Eye,
  Trash2, Edit2, Save, X, FolderPlus, FilePlus,
  Palette, Smile, GripVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import MarkdownEditorPro from '@/components/editor/MarkdownEditorPro'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable
} from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'document'
  icon?: string
  color?: string
  content?: any
  children?: TreeNode[]
  parent_id?: string | null
  project_id?: string
  metadata?: any
}

interface MemoryProProps {
  projectId: string
}

// Icon mapping for memory items
const ICONS: { [key: string]: any } = {
  'folder': Folder,
  'file': File,
  'document': FileText,
  'shield': Shield,
  'bug': Bug,
  'lock': Lock,
  'key': Key,
  'alert': AlertTriangle,
  'success': CheckCircle,
  'database': Database,
  'server': Server,
  'terminal': Terminal,
  'code': Code,
  'eye': Eye,
  'globe': Globe
}

// Get icon component
const getIcon = (iconName?: string, type?: string) => {
  if (iconName && ICONS[iconName]) return ICONS[iconName]
  return type === 'folder' ? Folder : FileText
}

export default function MemoryPro({ projectId }: MemoryProProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [documentContent, setDocumentContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [editingIconNodeId, setEditingIconNodeId] = useState<string | null>(null)
  const [editingColorNodeId, setEditingColorNodeId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  useEffect(() => {
    loadMemoryStructure()
  }, [projectId])

  // Auto-save document content
  useEffect(() => {
    if (!isDirty || !selectedNode || selectedNode.type !== 'document') return

    const timer = setTimeout(() => {
      saveDocumentContent()
    }, 2000)

    return () => clearTimeout(timer)
  }, [documentContent, isDirty])

  const loadMemoryStructure = async () => {
    try {
      const { data: nodes } = await supabase
        .from('memory_nodes')
        .select('*')
        .eq('project_id', projectId)
        .order('name')

      if (nodes) {
        const nodeMap = new Map<string, TreeNode>()
        const rootNodes: TreeNode[] = []
        const allFolderIds = new Set<string>()

        // First pass: create all nodes + collect folder IDs
        nodes.forEach(node => {
          nodeMap.set(node.id, {
            ...node,
            children: []
          })
          // Collect folder IDs for auto-expand
          if (node.type === 'folder') {
            allFolderIds.add(node.id)
          }
        })

        // Second pass: build tree structure
        nodes.forEach(node => {
          const treeNode = nodeMap.get(node.id)!
          if (node.parent_id && nodeMap.has(node.parent_id)) {
            const parent = nodeMap.get(node.parent_id)!
            if (!parent.children) parent.children = []
            parent.children.push(treeNode)
          } else {
            rootNodes.push(treeNode)
          }
        })

        setTreeData(rootNodes)
        // Auto-expand ALL folders on load
        setExpandedFolders(allFolderIds)
      }
    } catch (error) {
      console.error('Error loading memory structure:', error)
      toast.error('Failed to load memory structure')
    }
  }

  const saveDocumentContent = async () => {
    if (!selectedNode || selectedNode.type !== 'document') return

    try {
      await supabase
        .from('memory_nodes')
        .update({ content: documentContent })
        .eq('id', selectedNode.id)

      setIsDirty(false)
      toast.success('Document saved')
    } catch (error) {
      console.error('Error saving document:', error)
      toast.error('Failed to save document')
    }
  }

  const handleNodeSelect = (node: TreeNode) => {
    // Save current document if dirty
    if (isDirty && selectedNode?.type === 'document') {
      saveDocumentContent()
    }

    setSelectedNode(node)
    if (node.type === 'document') {
      setDocumentContent(node.content || '')
      setIsDirty(false)
    }
  }

  const handleCreateNode = async (type: 'folder' | 'document', parentId?: string | null) => {
    const name = type === 'folder' ? 'New Folder' : 'New Document'

    try {
      const { data, error } = await supabase
        .from('memory_nodes')
        .insert([{
          name,
          type,
          parent_id: parentId || null,
          project_id: projectId,
          icon: type === 'folder' ? 'folder' : 'document',
          content: type === 'document' ? '' : null
        }])
        .select()
        .single()

      if (error) throw error

      toast.success(`Created ${name}`)
      loadMemoryStructure()

      // Auto-select new document for immediate editing
      if (type === 'document' && data) {
        handleNodeSelect(data)
      }
    } catch (error) {
      console.error('Error creating node:', error)
      toast.error('Failed to create item')
    }
  }

  const handleRename = async (nodeId: string, newName: string) => {
    if (!newName.trim()) return

    try {
      await supabase
        .from('memory_nodes')
        .update({ name: newName.trim() })
        .eq('id', nodeId)

      toast.success('Renamed successfully')
      loadMemoryStructure()
      setEditingNodeId(null)
      setEditingName('')
    } catch (error) {
      console.error('Error renaming:', error)
      toast.error('Failed to rename')
    }
  }

  const handleDelete = async (nodeId: string) => {
    if (!confirm('Delete this item and all its children?')) return

    try {
      await supabase
        .from('memory_nodes')
        .delete()
        .eq('id', nodeId)

      toast.success('Deleted successfully')
      loadMemoryStructure()

      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
        setDocumentContent('')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Failed to delete')
    }
  }

  const handleUpdateIcon = async (nodeId: string, iconName: string) => {
    try {
      await supabase
        .from('memory_nodes')
        .update({ icon: iconName })
        .eq('id', nodeId)

      toast.success('Icon updated')
      loadMemoryStructure()
      setEditingIconNodeId(null)
    } catch (error) {
      console.error('Error updating icon:', error)
      toast.error('Failed to update icon')
    }
  }

  const handleUpdateColor = async (nodeId: string, color: string) => {
    try {
      await supabase
        .from('memory_nodes')
        .update({ color })
        .eq('id', nodeId)

      toast.success('Color updated')
      loadMemoryStructure()
      setEditingColorNodeId(null)
    } catch (error) {
      console.error('Error updating color:', error)
      toast.error('Failed to update color')
    }
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  // Drag & Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const draggedId = active.id as string
    const targetId = over.id as string

    // Find nodes in flat list
    const flatNodes = flattenTree(treeData)
    const draggedNode = flatNodes.find(n => n.id === draggedId)
    const targetNode = flatNodes.find(n => n.id === targetId)

    if (!draggedNode || !targetNode) return

    // Prevent dropping folder into itself or its children
    if (draggedNode.type === 'folder' && isDescendant(draggedNode, targetNode, flatNodes)) {
      toast.error('Cannot move folder into itself')
      return
    }

    // Determine new parent
    const newParentId = targetNode.type === 'folder' ? targetId : targetNode.parent_id

    try {
      await supabase
        .from('memory_nodes')
        .update({ parent_id: newParentId })
        .eq('id', draggedId)

      toast.success('Moved successfully')
      loadMemoryStructure()

      // Expand target folder if dropped into one
      if (targetNode.type === 'folder') {
        setExpandedFolders(prev => new Set(prev).add(targetId))
      }
    } catch (error) {
      console.error('Error moving node:', error)
      toast.error('Failed to move')
    }
  }

  // Helper: Flatten tree to array
  const flattenTree = (nodes: TreeNode[]): TreeNode[] => {
    const result: TreeNode[] = []
    const traverse = (items: TreeNode[]) => {
      items.forEach(item => {
        result.push(item)
        if (item.children) traverse(item.children)
      })
    }
    traverse(nodes)
    return result
  }

  // Helper: Check if target is descendant of source
  const isDescendant = (parent: TreeNode, target: TreeNode, allNodes: TreeNode[]): boolean => {
    if (parent.id === target.id) return true
    const children = allNodes.filter(n => n.parent_id === parent.id)
    return children.some(child => isDescendant(child, target, allNodes))
  }

  // Filter nodes based on search
  const filterNodes = (nodes: TreeNode[], query: string): TreeNode[] => {
    if (!query) return nodes

    return nodes.filter(node => {
      const matchesSearch = node.name.toLowerCase().includes(query.toLowerCase())
      const childrenMatch = node.children
        ? filterNodes(node.children, query).length > 0
        : false
      return matchesSearch || childrenMatch
    }).map(node => ({
      ...node,
      children: node.children ? filterNodes(node.children, query) : []
    }))
  }

  // Sortable wrapper for drag & drop
  const SortableNode = ({ node, depth }: { node: TreeNode; depth: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ id: node.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1
    }

    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        {renderNodeContent(node, depth, listeners)}
      </div>
    )
  }

  // Render tree node content
  const renderNodeContent = (node: TreeNode, depth: number = 0, dragHandleListeners?: any) => {
    const Icon = getIcon(node.icon, node.type)
    const isSelected = selectedNode?.id === node.id
    const isEditing = editingNodeId === node.id
    const isExpanded = expandedFolders.has(node.id)
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id}>
        <div
          className={cn(
            "group flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-all",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            isSelected && "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-300 dark:ring-blue-700",
            activeId === node.id && "opacity-50"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => !isEditing && handleNodeSelect(node)}
        >
          {/* Drag Handle */}
          <div
            {...dragHandleListeners}
            className="opacity-0 group-hover:opacity-100 cursor-move p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} className="text-gray-400" />
          </div>

          {/* Folder expand/collapse */}
          {node.type === 'folder' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(node.id)
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <Icon size={16} className={cn(
                "text-gray-500 transition-transform",
                isExpanded && hasChildren && "rotate-90"
              )} style={{ color: node.color }} />
            </button>
          )}
          {node.type === 'document' && (
            <Icon size={16} className="text-gray-500" style={{ color: node.color }} />
          )}

          {/* Name (editable) */}
          {isEditing ? (
            <div className="flex-1 flex items-center gap-1">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(node.id, editingName)
                  if (e.key === 'Escape') {
                    setEditingNodeId(null)
                    setEditingName('')
                  }
                }}
                className="h-6 text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRename(node.id, editingName)
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <Save size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingNodeId(null)
                  setEditingName('')
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
              {node.name}
            </span>
          )}

          {/* Actions (always visible on hover) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.type === 'folder' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCreateNode('folder', node.id)
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  title="Add Folder"
                >
                  <FolderPlus size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCreateNode('document', node.id)
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  title="Add Document"
                >
                  <FilePlus size={12} />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingNodeId(node.id)
                setEditingName(node.name)
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Rename"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingIconNodeId(node.id)
              }}
              className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded text-purple-600"
              title="Change Icon"
            >
              <Smile size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingColorNodeId(node.id)
              }}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded text-blue-600"
              title="Change Color"
            >
              <Palette size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(node.id)
              }}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Render children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => <SortableNode key={child.id} node={child} depth={depth + 1} />)}
          </div>
        )}
      </div>
    )
  }

  const filteredData = filterNodes(treeData, searchQuery)

  return (
    <div className="h-full flex bg-white dark:bg-gray-900">
      {/* Left Panel - Tree Structure */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Header with actions */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Memory
            </h3>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCreateNode('folder', null)}
                title="New Folder"
              >
                <FolderPlus size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCreateNode('document', null)}
                title="New Document"
              >
                <FilePlus size={16} />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Tree List */}
        <div className="flex-1 overflow-auto p-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={flattenTree(filteredData).map(n => n.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredData.length > 0 ? (
                filteredData.map(node => <SortableNode key={node.id} node={node} depth={0} />)
              ) : (
                <div className="text-center text-gray-400 mt-8">
                  {searchQuery ? 'No results found' : 'No items yet'}
                </div>
              )}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Right Panel - Content Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNode ? (
          selectedNode.type === 'document' ? (
            <>
              {/* Document Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-gray-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {selectedNode.name}
                  </h3>
                  {isDirty && (
                    <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs">
                      Unsaved
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={saveDocumentContent}
                  disabled={!isDirty}
                  className={cn(
                    "bg-gray-800 hover:bg-gray-700 text-white",
                    !isDirty && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Save size={14} className="mr-1" />
                  Save
                </Button>
              </div>

              {/* Document Content */}
              <div className="flex-1 overflow-hidden">
                <MarkdownEditorPro
                  content={documentContent}
                  onChange={(markdown) => {
                    setDocumentContent(markdown)
                    setIsDirty(true)
                  }}
                  placeholder="Start writing your document..."
                  projectId={projectId}
                  showAIImprove={true}
                  showPreview={true}
                  minHeight="calc(100vh - 300px)"
                  improvementContext="This is a memory document for an AI assistant. The content will be used for RAG/similarity search, so keep it clear and well-structured."
                  onSave={saveDocumentContent}
                  onCancel={() => setSelectedNode(null)}
                />
              </div>
            </>
          ) : (
            // Folder view
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Folder size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {selectedNode.name}
                </h3>
                <p className="text-gray-500 mb-4">
                  {selectedNode.children?.length || 0} items
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => handleCreateNode('folder', selectedNode.id)}
                    variant="outline"
                  >
                    <FolderPlus size={16} className="mr-2" />
                    Add Folder
                  </Button>
                  <Button
                    onClick={() => handleCreateNode('document', selectedNode.id)}
                    className="bg-gray-800 hover:bg-gray-700 text-white"
                  >
                    <FilePlus size={16} className="mr-2" />
                    Add Document
                  </Button>
                </div>
              </div>
            </div>
          )
        ) : (
          // No selection
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Database size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                Select a document to edit or a folder to manage
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Icon Picker Modal */}
      {editingIconNodeId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingIconNodeId(null)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Choose Icon</h3>
            <div className="grid grid-cols-6 gap-2">
              {Object.keys(ICONS).map(iconKey => {
                const IconComponent = ICONS[iconKey]
                return (
                  <button
                    key={iconKey}
                    onClick={() => handleUpdateIcon(editingIconNodeId, iconKey)}
                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-center"
                    title={iconKey}
                  >
                    <IconComponent size={20} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Modal */}
      {editingColorNodeId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingColorNodeId(null)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Choose Color</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { name: 'Red', value: 'red', class: 'bg-red-500' },
                { name: 'Orange', value: 'orange', class: 'bg-orange-500' },
                { name: 'Yellow', value: 'yellow', class: 'bg-yellow-500' },
                { name: 'Green', value: 'green', class: 'bg-green-500' },
                { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
                { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
                { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
                { name: 'Gray', value: 'gray', class: 'bg-gray-500' }
              ].map(color => (
                <button
                  key={color.value}
                  onClick={() => handleUpdateColor(editingColorNodeId, color.value)}
                  className={`${color.class} w-16 h-16 rounded-lg hover:scale-110 transition-transform`}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}