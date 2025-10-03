'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Folder, File, Plus, ChevronRight, ChevronDown,
  Edit2, Trash2, Save, Search, GripVertical,
  FileText, FileCode, Lock, Shield, Database,
  Globe, Server, Terminal, Code, Bug,
  Key, Cloud, Cpu, HardDrive, Wifi,
  Zap, Package, GitBranch, Hash, AlertTriangle,
  Activity, Archive, Award, Battery, Bell,
  Bookmark, Box, Briefcase, Calendar, Camera,
  CheckCircle, Clock, Coffee, Command, Compass,
  Copy, CreditCard, Download, Eye, Feather,
  Film, Flag, Gift, Heart, Home,
  Image, Inbox, Info, Layers, Layout,
  Link, List, Mail, Map as MapIcon, MessageSquare,
  Mic, Monitor, Moon, Music, Palette,
  Paperclip, PenTool, Phone, PieChart, Play,
  Printer, Radio, RefreshCw, Repeat, Scissors,
  Send, Settings, Share2, ShoppingCart, Sidebar,
  Smile, Speaker, Star, Sun, Tag,
  Target, Thermometer, Tool, TrendingUp, Tv,
  Type, Umbrella, Upload, User, Users,
  Video, VolumeX, Watch, WifiOff, Wind,
  X, Youtube, Zap as ZapIcon, ZoomIn, Navigation
} from 'lucide-react'
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
  DragOverEvent,
  useDndMonitor,
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
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

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

interface MemoryUltraProps {
  projectId: string
}

// Extended icon collection organized by category
const ICON_CATEGORIES = [
  {
    name: 'Common',
    icons: [
      { name: 'Folder', icon: Folder },
      { name: 'File', icon: File },
      { name: 'FileText', icon: FileText },
      { name: 'FileCode', icon: FileCode },
      { name: 'Database', icon: Database },
      { name: 'Server', icon: Server },
      { name: 'Cloud', icon: Cloud },
      { name: 'Package', icon: Package },
      { name: 'Archive', icon: Archive },
      { name: 'Box', icon: Box },
    ]
  },
  {
    name: 'Security',
    icons: [
      { name: 'Shield', icon: Shield },
      { name: 'Lock', icon: Lock },
      { name: 'Key', icon: Key },
      { name: 'AlertTriangle', icon: AlertTriangle },
      { name: 'Eye', icon: Eye },
      { name: 'Bug', icon: Bug },
      { name: 'Terminal', icon: Terminal },
      { name: 'Code', icon: Code },
      { name: 'Cpu', icon: Cpu },
      { name: 'HardDrive', icon: HardDrive },
    ]
  },
  {
    name: 'Development',
    icons: [
      { name: 'GitBranch', icon: GitBranch },
      { name: 'Hash', icon: Hash },
      { name: 'Command', icon: Command },
      { name: 'Zap', icon: ZapIcon },
      { name: 'Activity', icon: Activity },
      { name: 'Download', icon: Download },
      { name: 'Upload', icon: Upload },
      { name: 'RefreshCw', icon: RefreshCw },
      { name: 'Settings', icon: Settings },
      { name: 'Tool', icon: Tool },
    ]
  },
  {
    name: 'Communication',
    icons: [
      { name: 'Globe', icon: Globe },
      { name: 'Wifi', icon: Wifi },
      { name: 'WifiOff', icon: WifiOff },
      { name: 'Mail', icon: Mail },
      { name: 'MessageSquare', icon: MessageSquare },
      { name: 'Phone', icon: Phone },
      { name: 'Send', icon: Send },
      { name: 'Share2', icon: Share2 },
      { name: 'Link', icon: Link },
      { name: 'Radio', icon: Radio },
    ]
  },
  {
    name: 'Interface',
    icons: [
      { name: 'Layout', icon: Layout },
      { name: 'Sidebar', icon: Sidebar },
      { name: 'Layers', icon: Layers },
      { name: 'List', icon: List },
      { name: 'Monitor', icon: Monitor },
      { name: 'Tv', icon: Tv },
      { name: 'Image', icon: Image },
      { name: 'Film', icon: Film },
      { name: 'Camera', icon: Camera },
      { name: 'Palette', icon: Palette },
    ]
  },
  {
    name: 'Business',
    icons: [
      { name: 'Briefcase', icon: Briefcase },
      { name: 'CreditCard', icon: CreditCard },
      { name: 'ShoppingCart', icon: ShoppingCart },
      { name: 'PieChart', icon: PieChart },
      { name: 'TrendingUp', icon: TrendingUp },
      { name: 'Award', icon: Award },
      { name: 'Target', icon: Target },
      { name: 'Flag', icon: Flag },
      { name: 'Calendar', icon: Calendar },
      { name: 'Clock', icon: Clock },
    ]
  },
  {
    name: 'Other',
    icons: [
      { name: 'Home', icon: Home },
      { name: 'User', icon: User },
      { name: 'Users', icon: Users },
      { name: 'Heart', icon: Heart },
      { name: 'Star', icon: Star },
      { name: 'Bell', icon: Bell },
      { name: 'Bookmark', icon: Bookmark },
      { name: 'CheckCircle', icon: CheckCircle },
      { name: 'Info', icon: Info },
      { name: 'Tag', icon: Tag },
    ]
  }
]

// Enhanced color palette with names
const COLOR_PALETTE = [
  { name: 'Gray', color: '#6B7280' },
  { name: 'Red', color: '#EF4444' },
  { name: 'Orange', color: '#F97316' },
  { name: 'Amber', color: '#F59E0B' },
  { name: 'Yellow', color: '#EAB308' },
  { name: 'Lime', color: '#84CC16' },
  { name: 'Green', color: '#10B981' },
  { name: 'Emerald', color: '#059669' },
  { name: 'Teal', color: '#14B8A6' },
  { name: 'Cyan', color: '#06B6D4' },
  { name: 'Sky', color: '#0EA5E9' },
  { name: 'Blue', color: '#3B82F6' },
  { name: 'Indigo', color: '#6366F1' },
  { name: 'Violet', color: '#8B5CF6' },
  { name: 'Purple', color: '#A855F7' },
  { name: 'Fuchsia', color: '#D946EF' },
  { name: 'Pink', color: '#EC4899' },
  { name: 'Rose', color: '#F43F5E' },
]

// Enhanced Icon Picker with categories and search
const IconPicker = ({
  isOpen,
  onClose,
  onSelect,
  currentIcon,
  currentColor,
  nodeType
}: {
  isOpen: boolean
  onClose: () => void
  onSelect: (icon: string, color: string) => void
  currentIcon?: string
  currentColor?: string
  nodeType: 'folder' | 'document'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Common')
  const [selectedIcon, setSelectedIcon] = useState(currentIcon || 'Folder')
  const [selectedColor, setSelectedColor] = useState(currentColor || '#6B7280')
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const filteredIcons = ICON_CATEGORIES
    .find(cat => cat.name === selectedCategory)
    ?.icons.filter(icon =>
      icon.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 z-[100] flex items-center justify-center"
      >
        <motion.div
          ref={pickerRef}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-96 max-h-[500px] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Choose Icon & Color
              </h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search icons..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
            </div>
          </div>

          {/* Body */}
          <div className="p-4 max-h-[350px] overflow-y-auto">
            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-4">
              {ICON_CATEGORIES.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-full transition-colors",
                    selectedCategory === cat.name
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Icons */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 mb-2">Icons</h4>
              <div className="grid grid-cols-8 gap-1">
                {filteredIcons.map(({ name, icon: Icon }) => (
                  <motion.button
                    key={name}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedIcon(name)}
                    className={cn(
                      "p-2 rounded flex items-center justify-center transition-all",
                      selectedIcon === name
                        ? "bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                    style={{ color: selectedColor }}
                  >
                    <Icon size={18} />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2">Color</h4>
              <div className="grid grid-cols-9 gap-1">
                {COLOR_PALETTE.map(({ name, color }) => (
                  <motion.button
                    key={color}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "w-8 h-8 rounded transition-all",
                      selectedColor === color && "ring-2 ring-offset-2 ring-gray-400"
                    )}
                    style={{ backgroundColor: color }}
                    title={name}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="mb-2" style={{ color: selectedColor }}>
                    {(() => {
                      const IconComp = ICON_CATEGORIES
                        .flatMap(cat => cat.icons)
                        .find(i => i.name === selectedIcon)?.icon || Folder
                      return <IconComp size={32} />
                    })()}
                  </div>
                  <p className="text-xs text-gray-500">Preview</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onSelect(selectedIcon, selectedColor)
                onClose()
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Apply
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

// Enhanced Sortable Tree Item with drag preview
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
    opacity: isDragging ? 0.3 : 1,
  }

  const isExpanded = expandedNodes.has(node.id)
  const isSelected = selectedNode?.id === node.id

  const IconComponent = ICON_CATEGORIES
    .flatMap(cat => cat.icons)
    .find(i => i.name === node.icon)?.icon || (node.type === 'folder' ? Folder : File)

  const handleRename = () => {
    if (editName.trim() && editName !== node.name) {
      onUpdate(node.id, { name: editName.trim() })
    }
    setIsEditing(false)
  }

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-all",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          isSelected && "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500",
          isDragging && "shadow-2xl bg-white dark:bg-gray-800"
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => node.type === 'document' && onSelect(node)}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 cursor-move p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
        >
          <GripVertical size={14} className="text-gray-400" />
        </div>

        {/* Expand/Collapse */}
        {node.type === 'folder' && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(node.id)
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight size={14} />
            </motion.div>
          </motion.button>
        )}

        {/* Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowIconPicker(true)
          }}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
          style={{ color: node.color || '#6B7280' }}
        >
          <IconComponent size={18} />
        </button>

        {/* Icon Picker Modal */}
        <IconPicker
          isOpen={showIconPicker}
          onClose={() => setShowIconPicker(false)}
          onSelect={(icon, color) => {
            onUpdate(node.id, { icon, color })
          }}
          currentIcon={node.icon}
          currentColor={node.color}
          nodeType={node.type}
        />

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
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <Edit2 size={14} className="text-gray-500" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(node.id)
            }}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
          >
            <Trash2 size={14} className="text-red-500" />
          </motion.button>
        </div>
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && node.children && node.children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SortableContext
              items={node.children.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
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
            </SortableContext>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Drag preview component
const DragPreview = ({ node }: { node: TreeNode | null }) => {
  if (!node) return null

  const IconComponent = ICON_CATEGORIES
    .flatMap(cat => cat.icons)
    .find(i => i.name === node.icon)?.icon || (node.type === 'folder' ? Folder : File)

  return (
    <div className="pointer-events-none">
      <motion.div
        initial={{ scale: 1.05, rotate: 2 }}
        animate={{ scale: 1.05, rotate: 2 }}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-purple-500"
      >
        <IconComponent size={18} style={{ color: node.color || '#6B7280' }} />
        <span className="text-sm font-medium">{node.name}</span>
      </motion.div>
    </div>
  )
}

export default function MemoryUltra({ projectId }: MemoryUltraProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showNewItemModal, setShowNewItemModal] = useState<{
    type: 'folder' | 'document'
    parentId?: string
  } | null>(null)
  const [newItemName, setNewItemName] = useState('')

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

  useEffect(() => {
    loadMemoryStructure()
  }, [projectId])

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

        // First pass: create all nodes
        nodes.forEach(node => {
          nodeMap.set(node.id, {
            ...node,
            children: []
          })
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

        // Auto-expand important folders
        const importantFolders = rootNodes
          .filter(n => n.type === 'folder' && ['Success', 'Failed', 'Templates'].includes(n.name))
          .map(n => n.id)
        setExpandedNodes(new Set(importantFolders))
      }
    } catch (error) {
      console.error('Error loading memory structure:', error)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    // Handle reordering
    const activeNode = findNode(active.id as string, treeData)
    const overNode = findNode(over.id as string, treeData)

    if (activeNode && overNode) {
      // Update parent if dropping on a folder
      if (overNode.type === 'folder' && activeNode.parent_id !== overNode.id) {
        try {
          await supabase
            .from('memory_nodes')
            .update({ parent_id: overNode.id })
            .eq('id', activeNode.id)

          toast.success(`Moved ${activeNode.name} to ${overNode.name}`)
          loadMemoryStructure()
        } catch (error) {
          toast.error('Failed to move item')
        }
      }
    }
  }

  const findNode = (id: string, nodes: TreeNode[]): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children) {
        const found = findNode(id, node.children)
        if (found) return found
      }
    }
    return null
  }

  const findActiveNode = (): TreeNode | null => {
    if (!activeId) return null
    return findNode(activeId, treeData)
  }

  const handleToggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const handleUpdateNode = async (nodeId: string, updates: Partial<TreeNode>) => {
    try {
      await supabase
        .from('memory_nodes')
        .update(updates)
        .eq('id', nodeId)

      loadMemoryStructure()
      toast.success('Updated successfully')
    } catch (error) {
      toast.error('Failed to update')
    }
  }

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm('Delete this item and all its children?')) return

    try {
      await supabase
        .from('memory_nodes')
        .delete()
        .eq('id', nodeId)

      loadMemoryStructure()
      toast.success('Deleted successfully')
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
      }
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const handleAddNode = async (type: 'folder' | 'document', parentId?: string) => {
    setNewItemName('')
    setShowNewItemModal({ type, parentId })
  }

  const handleCreateNode = async () => {
    if (!showNewItemModal || !newItemName.trim()) return

    try {
      await supabase
        .from('memory_nodes')
        .insert({
          name: newItemName.trim(),
          type: showNewItemModal.type,
          project_id: projectId,
          parent_id: showNewItemModal.parentId || null,
          icon: showNewItemModal.type === 'folder' ? 'Folder' : 'File',
          color: '#6B7280'
        })

      loadMemoryStructure()
      toast.success(`${showNewItemModal.type === 'folder' ? 'Folder' : 'Document'} created`)
      setShowNewItemModal(null)
      setNewItemName('')
    } catch (error) {
      toast.error('Failed to create')
    }
  }

  return (
    <>
      {/* New Item Modal */}
      <AnimatePresence>
        {showNewItemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-[200] flex items-center justify-center"
            onClick={() => setShowNewItemModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                {showNewItemModal.type === 'folder' ? (
                  <Folder className="text-purple-600" size={24} />
                ) : (
                  <File className="text-blue-600" size={24} />
                )}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  New {showNewItemModal.type === 'folder' ? 'Folder' : 'Document'}
                </h3>
              </div>

              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNode()
                  if (e.key === 'Escape') setShowNewItemModal(null)
                }}
                placeholder={`Enter ${showNewItemModal.type} name...`}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewItemModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateNode}
                  disabled={!newItemName.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Create
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-full flex bg-gray-50 dark:bg-gray-950">
        {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Memory Structure
            </h3>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAddNode('folder')}
                title="New Folder"
              >
                <Plus size={16} />
                <Folder size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAddNode('document')}
                title="New Document"
              >
                <Plus size={16} />
                <File size={16} />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              items={treeData.map(n => n.id)}
              strategy={verticalListSortingStrategy}
            >
              {treeData.map(node => (
                <SortableTreeItem
                  key={node.id}
                  node={node}
                  expandedNodes={expandedNodes}
                  selectedNode={selectedNode}
                  onToggleExpand={handleToggleExpand}
                  onSelect={setSelectedNode}
                  onUpdate={handleUpdateNode}
                  onDelete={handleDeleteNode}
                />
              ))}
            </SortableContext>

            <DragOverlay>
              <DragPreview node={findActiveNode()} />
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {selectedNode ? (
          <div className="h-full bg-white dark:bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              {(() => {
                const IconComp = ICON_CATEGORIES
                  .flatMap(cat => cat.icons)
                  .find(i => i.name === selectedNode.icon)?.icon || File
                return <IconComp size={24} style={{ color: selectedNode.color }} />
              })()}
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {selectedNode.name}
              </h2>
            </div>

            <textarea
              className="w-full h-[calc(100%-60px)] p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter content..."
              value={selectedNode.content || ''}
              onChange={(e) => handleUpdateNode(selectedNode.id, { content: e.target.value })}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Database size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Select a document to view its content</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}