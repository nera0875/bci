'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Plus, FolderPlus, FilePlus, ChevronRight, ChevronDown,
  Folder, File, FileText, Hash, Settings, Palette,
  Search, Filter, Download, Upload, Edit2, Trash2,
  Check, AlertCircle, Clock, Archive, Star
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/supabase/database.types'

// Types
type MemoryNode = Database['public']['Tables']['memory_nodes']['Row']

interface TreeNode extends MemoryNode {
  children?: TreeNode[]
}

// Palette de couleurs prédéfinies
const COLORS = [
  { name: 'Default', value: '#6E6E80' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
]

// Icons disponibles
const ICONS = {
  folders: [
    { icon: Folder, name: 'folder' },
    { icon: Archive, name: 'archive' },
    { icon: Settings, name: 'settings' },
  ],
  files: [
    { icon: FileText, name: 'document' },
    { icon: File, name: 'file' },
    { icon: Hash, name: 'data' },
  ],
  status: [
    { icon: Check, name: 'success' },
    { icon: AlertCircle, name: 'warning' },
    { icon: Clock, name: 'pending' },
    { icon: Star, name: 'favorite' },
  ]
}

// Composant Node draggable
function SortableNode({
  node,
  depth = 0,
  isExpanded,
  onToggle,
  onSelect,
  isSelected,
  onRename,
  onChangeIcon,
  onChangeColor,
  onDelete
}: {
  node: TreeNode
  depth?: number
  isExpanded: boolean
  onToggle: () => void
  onSelect: () => void
  isSelected: boolean
  onRename: (name: string) => void
  onChangeIcon: (icon: string) => void
  onChangeColor: (color: string) => void
  onDelete: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(node.name)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleRename = () => {
    if (editName.trim() && editName !== node.name) {
      onRename(editName.trim())
    }
    setIsEditing(false)
  }

  const getIcon = () => {
    // Si emoji custom
    if (node.icon && node.icon.length <= 2) {
      return <span className="text-lg">{node.icon}</span>
    }
    // Sinon icon par défaut selon type
    return node.type === 'folder' ? (
      <Folder size={18} style={{ color: node.color || '#6E6E80' }} />
    ) : (
      <FileText size={18} style={{ color: node.color || '#6E6E80' }} />
    )
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer",
          isSelected && "bg-blue-50 dark:bg-blue-900/20"
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={onSelect}
        {...attributes}
        {...listeners}
      >
        {/* Chevron pour folders */}
        {node.type === 'folder' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}

        {/* Icon */}
        <div
          className="relative"
          onDoubleClick={(e) => {
            e.stopPropagation()
            setShowIconPicker(!showIconPicker)
          }}
        >
          {getIcon()}

          {/* Icon Picker Popup */}
          {showIconPicker && (
            <div className="absolute top-8 left-0 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-3 border">
              <div className="grid grid-cols-4 gap-2">
                {['📁', '📂', '📄', '📝', '✅', '❌', '⚡', '🔥', '💡', '🎯', '🔒', '🔓'].map(emoji => (
                  <button
                    key={emoji}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    onClick={(e) => {
                      e.stopPropagation()
                      onChangeIcon(emoji)
                      setShowIconPicker(false)
                    }}
                  >
                    <span className="text-lg">{emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Name */}
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') setIsEditing(false)
            }}
            className="h-6 px-1 text-sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-sm select-none"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
          >
            {node.name}
          </span>
        )}

        {/* Actions on hover */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
          {/* Color picker */}
          <button
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            onClick={(e) => {
              e.stopPropagation()
              setShowColorPicker(!showColorPicker)
            }}
          >
            <Palette size={14} />
          </button>

          {/* Delete */}
          <button
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Color Picker Popup */}
        {showColorPicker && (
          <div className="absolute top-8 right-0 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-3 border">
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map(({ name, value }) => (
                <button
                  key={value}
                  title={name}
                  className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:scale-110 transition"
                  style={{ backgroundColor: value }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onChangeColor(value)
                    setShowColorPicker(false)
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && node.children && (
        <div className="ml-2">
          {node.children.map(child => (
            <SortableNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isExpanded={false}
              onToggle={() => {}}
              onSelect={() => {}}
              isSelected={false}
              onRename={() => {}}
              onChangeIcon={() => {}}
              onChangeColor={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Composant principal
export default function ModernBoard({
  projectId,
  isOpen,
  onClose
}: {
  projectId: string
  isOpen: boolean
  onClose: () => void
}) {
  const [nodes, setNodes] = useState<MemoryNode[]>([])
  const [tree, setTree] = useState<TreeNode[]>([])
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [editingContent, setEditingContent] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (isOpen) {
      loadNodes()
    }
  }, [isOpen, projectId])

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

    // Create map
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] })
    })

    // Build tree
    nodes.forEach(node => {
      const treeNode = nodeMap.get(node.id)!
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        const parent = nodeMap.get(node.parent_id)!
        parent.children = parent.children || []
        parent.children.push(treeNode)
      } else {
        roots.push(treeNode)
      }
    })

    return roots
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    // Update parent_id in DB
    const { error } = await supabase
      .from('memory_nodes')
      .update({ parent_id: over.id as string })
      .eq('id', active.id)

    if (!error) {
      toast.success('Element moved')
      loadNodes()
    }

    setActiveId(null)
  }

  const handleRename = async (nodeId: string, newName: string) => {
    const { error } = await supabase
      .from('memory_nodes')
      .update({ name: newName })
      .eq('id', nodeId)

    if (!error) {
      toast.success('Renamed')
      loadNodes()
    }
  }

  const handleChangeIcon = async (nodeId: string, icon: string) => {
    const { error } = await supabase
      .from('memory_nodes')
      .update({ icon })
      .eq('id', nodeId)

    if (!error) {
      loadNodes()
    }
  }

  const handleChangeColor = async (nodeId: string, color: string) => {
    const { error } = await supabase
      .from('memory_nodes')
      .update({ color })
      .eq('id', nodeId)

    if (!error) {
      loadNodes()
    }
  }

  const handleDelete = async (nodeId: string) => {
    if (confirm('Delete this item and all its children?')) {
      const { error } = await supabase
        .from('memory_nodes')
        .delete()
        .eq('id', nodeId)

      if (!error) {
        toast.success('Deleted')
        loadNodes()
      }
    }
  }

  const handleSaveContent = async () => {
    if (!selectedNode) return

    const { error } = await supabase
      .from('memory_nodes')
      .update({ content: editingContent })
      .eq('id', selectedNode.id)

    if (!error) {
      toast.success('Content saved')
    }
  }

  const createNewFolder = async (parentId: string | null = null) => {
    const { data, error } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: projectId,
        parent_id: parentId,
        name: 'New Folder',
        type: 'folder',
        icon: '📁',
        color: '#6366F1',
        position: 0
      })
      .select()
      .single()

    if (data && !error) {
      toast.success('Folder created')
      loadNodes()
    }
  }

  const createNewDocument = async (parentId: string | null = null) => {
    const { data, error } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: projectId,
        parent_id: parentId,
        name: 'New Document',
        type: 'document',
        icon: '📄',
        color: '#6E6E80',
        content: '# New Document\n\nStart writing...',
        position: 0
      })
      .select()
      .single()

    if (data && !error) {
      toast.success('Document created')
      loadNodes()
      setSelectedNode(data)
    }
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
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
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
                  onClick={() => createNewFolder()}
                >
                  <FolderPlus size={16} className="mr-1" />
                  New Folder
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => createNewDocument()}
                >
                  <FilePlus size={16} className="mr-1" />
                  New Doc
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto p-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={nodes.map(n => n.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {tree.map(node => (
                    <SortableNode
                      key={node.id}
                      node={node}
                      isExpanded={expandedNodes.has(node.id)}
                      onToggle={() => {
                        const newExpanded = new Set(expandedNodes)
                        if (newExpanded.has(node.id)) {
                          newExpanded.delete(node.id)
                        } else {
                          newExpanded.add(node.id)
                        }
                        setExpandedNodes(newExpanded)
                      }}
                      onSelect={() => setSelectedNode(node)}
                      isSelected={selectedNode?.id === node.id}
                      onRename={(name) => handleRename(node.id, name)}
                      onChangeIcon={(icon) => handleChangeIcon(node.id, icon)}
                      onChangeColor={(color) => handleChangeColor(node.id, color)}
                      onDelete={() => handleDelete(node.id)}
                    />
                  ))}
                </SortableContext>

                <DragOverlay>
                  {activeId ? <div className="opacity-50">Dragging...</div> : null}
                </DragOverlay>
              </DndContext>
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
                  <Button size="sm" onClick={handleSaveContent}>
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
                Select a document to edit
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}