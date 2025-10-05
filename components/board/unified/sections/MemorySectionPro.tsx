'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Folder, File, Plus, ChevronRight, ChevronDown,
  Edit2, Trash2, Save, Search, GripVertical, Eye,
  FileText, FileCode, Lock, Shield, Database,
  Globe, Server, Terminal, Code, Bug,
  Key, Cloud, Cpu, HardDrive, Wifi,
  Zap, Package, GitBranch, Hash, AlertTriangle
} from 'lucide-react'
import MarkdownPreview from '@/components/memory/MarkdownPreview'
import MarkdownEditorPro from '@/components/editor/MarkdownEditorPro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
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
}

interface MemorySectionProps {
  projectId: string
}

// Professional icon sets
const FOLDER_ICONS = [
  { name: 'Folder', icon: Folder },
  { name: 'Database', icon: Database },
  { name: 'Server', icon: Server },
  { name: 'Cloud', icon: Cloud },
  { name: 'Package', icon: Package },
  { name: 'GitBranch', icon: GitBranch },
  { name: 'Shield', icon: Shield },
  { name: 'Lock', icon: Lock },
  { name: 'Globe', icon: Globe },
  { name: 'HardDrive', icon: HardDrive },
]

const FILE_ICONS = [
  { name: 'File', icon: File },
  { name: 'FileText', icon: FileText },
  { name: 'FileCode', icon: FileCode },
  { name: 'Code', icon: Code },
  { name: 'Terminal', icon: Terminal },
  { name: 'Bug', icon: Bug },
  { name: 'Key', icon: Key },
  { name: 'Zap', icon: Zap },
  { name: 'Hash', icon: Hash },
  { name: 'AlertTriangle', icon: AlertTriangle },
]

// Color palette
const COLORS = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'
]

// Sortable Tree Item Component
const SortableTreeItem = ({
  node,
  depth = 0,
  expandedNodes,
  selectedNode,
  onToggleExpand,
  onSelect,
  onUpdate,
  onDelete
}: {
  node: TreeNode
  depth?: number
  expandedNodes: Set<string>
  selectedNode: TreeNode | null
  onToggleExpand: (id: string) => void
  onSelect: (node: TreeNode) => void
  onUpdate: (id: string, updates: Partial<TreeNode>) => void
  onDelete: (id: string) => void
}) => {
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

  const isExpanded = expandedNodes.has(node.id)
  const isSelected = selectedNode?.id === node.id

  const IconComponent = [...FOLDER_ICONS, ...FILE_ICONS].find(
    i => i.name === node.icon
  )?.icon || (node.type === 'folder' ? Folder : File)

  const handleRename = () => {
    if (editName.trim() && editName !== node.name) {
      onUpdate(node.id, { name: editName.trim() })
    }
    setIsEditing(false)
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-all",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          isSelected && "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500",
          isDragging && "shadow-lg"
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => node.type === 'document' && onSelect(node)}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 cursor-move p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        >
          <GripVertical size={14} className="text-gray-400" />
        </div>

        {/* Expand/Collapse */}
        {node.type === 'folder' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(node.id)
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        {/* Icon with color */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowIconPicker(!showIconPicker)
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
            style={{ color: node.color || '#6B7280' }}
          >
            <IconComponent size={18} />
          </button>

          {/* Icon Picker */}
          {showIconPicker && (
            <div className="absolute top-full left-0 z-50 mt-1 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border w-64">
              <div className="mb-2">
                <h4 className="text-xs font-medium text-gray-500 mb-2">Choose Icon</h4>
                <div className="grid grid-cols-5 gap-1">
                  {(node.type === 'folder' ? FOLDER_ICONS : FILE_ICONS).map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdate(node.id, { icon: name })
                        setShowIconPicker(false)
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-center"
                      style={{ color: node.color || '#6B7280' }}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">Color</h4>
                <div className="grid grid-cols-5 gap-1">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdate(node.id, { color })
                        setShowIconPicker(false)
                      }}
                      className="w-8 h-8 rounded hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Name */}
        {isEditing ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') setIsEditing(false)
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-0.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            {node.name}
          </span>
        )}

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
          {node.type === 'document' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelect(node) // Set as preview
              }}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
              title="Preview"
            >
              <Eye size={14} className="text-blue-500" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Edit"
          >
            <Edit2 size={14} className="text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(node.id)
            }}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
            title="Delete"
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        </div>
      </div>

      {/* Children */}
      {isExpanded && node.children && node.children.length > 0 && (
        <SortableContext
          items={node.children.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div>
            {node.children.map(child => (
              <SortableTreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                expandedNodes={expandedNodes}
                selectedNode={selectedNode}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  )
}

export default function MemorySectionPro({ projectId }: MemorySectionProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [previewNode, setPreviewNode] = useState<TreeNode | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadNodes()
  }, [projectId])

  useEffect(() => {
    if (selectedNode) {
      const content = selectedNode.content
      setEditingContent(
        typeof content === 'string'
          ? content
          : content?.text || ''
      )
    }
  }, [selectedNode])

  const loadNodes = async () => {
    const { data, error } = await supabase
      .from('memory_nodes')
      .select('*')
      .eq('project_id', projectId)
      .order('position')

    if (data && !error) {
      const tree = buildTree(data)
      setNodes(tree)

      // Auto-expand root folders
      const rootFolders = tree.filter(n => n.type === 'folder')
      setExpandedNodes(new Set(rootFolders.map(f => f.id)))
    }
  }

  const buildTree = (flatNodes: any[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>()
    const rootNodes: TreeNode[] = []

    flatNodes.forEach(node => {
      nodeMap.set(node.id, {
        ...node,
        children: []
      })
    })

    flatNodes.forEach(node => {
      const treeNode = nodeMap.get(node.id)!
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        const parent = nodeMap.get(node.parent_id)!
        if (!parent.children) parent.children = []
        parent.children.push(treeNode)
      } else {
        rootNodes.push(treeNode)
      }
    })

    return rootNodes
  }

  const createNode = async (type: 'folder' | 'document', parentId?: string) => {
    const name = type === 'folder' ? 'New Folder' : 'New Document'
    const icon = type === 'folder' ? 'Folder' : 'File'
    const color = '#6B7280'

    const { data, error } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: projectId,
        name,
        type,
        icon,
        color,
        parent_id: parentId || null,
        content: type === 'document' ? { text: '# New Document\n\nStart writing here...' } : null,
        position: nodes.length
      })
      .select()
      .single()

    if (!error && data) {
      toast.success(`${type === 'folder' ? 'Folder' : 'Document'} created`)
      loadNodes()

      if (type === 'document') {
        setSelectedNode(data)
      }
    } else {
      toast.error('Failed to create')
    }
  }

  const updateNode = async (nodeId: string, updates: Partial<TreeNode>) => {
    const { error } = await supabase
      .from('memory_nodes')
      .update(updates)
      .eq('id', nodeId)

    if (!error) {
      loadNodes()
      if (selectedNode?.id === nodeId) {
        setSelectedNode({ ...selectedNode, ...updates })
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

    try {
      const content = editingContent.startsWith('{') || editingContent.startsWith('[')
        ? JSON.parse(editingContent)
        : { text: editingContent }

      const { error } = await supabase
        .from('memory_nodes')
        .update({ content })
        .eq('id', selectedNode.id)

      if (!error) {
        toast.success('Content saved')
        setSelectedNode({ ...selectedNode, content })
      } else {
        toast.error('Failed to save')
      }
    } catch (e) {
      toast.error('Invalid JSON format')
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      // Handle reordering logic here
      // This would involve updating parent_id or position in the database
      loadNodes()
    }

    setActiveId(null)
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

  const filteredNodes = searchTerm
    ? nodes.filter(node =>
        node.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : nodes

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Memory Bank
            </h3>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => createNode('folder')}
                className="h-8 w-8 p-0"
              >
                <Plus size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => createNode('document')}
                className="h-8 w-8 p-0"
              >
                <FileText size={16} />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-auto p-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredNodes.map(n => n.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredNodes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Database size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No memory nodes yet</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createNode('folder')}
                    className="mt-3"
                  >
                    <Plus size={14} className="mr-1" />
                    Create First Folder
                  </Button>
                </div>
              ) : (
                filteredNodes.map(node => (
                  <SortableTreeItem
                    key={node.id}
                    node={node}
                    expandedNodes={expandedNodes}
                    selectedNode={selectedNode}
                    onToggleExpand={toggleExpand}
                    onSelect={setSelectedNode}
                    onUpdate={updateNode}
                    onDelete={deleteNode}
                  />
                ))
              )}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Content Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNode ? (
          <>
            {/* Editor Header */}
            <div className="h-14 px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const IconComp = [...FOLDER_ICONS, ...FILE_ICONS].find(
                    i => i.name === selectedNode.icon
                  )?.icon || File
                  return <IconComp size={20} style={{ color: selectedNode.color }} />
                })()}
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedNode.name}
                </h2>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
              <MarkdownEditorPro
                content={editingContent}
                onChange={(markdown) => setEditingContent(markdown)}
                placeholder="Start writing your document..."
                projectId={projectId}
                showAIImprove={true}
                showPreview={true}
                minHeight="calc(100vh - 300px)"
                improvementContext="This is a memory document for an AI assistant. The content will be used for RAG/similarity search, so keep it clear and well-structured."
                onSave={saveContent}
                onCancel={() => setSelectedNode(null)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <FileText size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Select a document to edit</p>
              <p className="text-sm mt-1">Or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Markdown Preview Modal */}
      {previewNode && (
        <MarkdownPreview
          content={typeof previewNode.content === 'string' ? previewNode.content : JSON.stringify(previewNode.content || '', null, 2)}
          title={previewNode.name}
          onClose={() => setPreviewNode(null)}
        />
      )}
    </div>
  )
}