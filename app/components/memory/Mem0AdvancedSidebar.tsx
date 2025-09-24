'use client'

import React, { useState, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
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
import {
  Search,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  GripVertical,
  Filter,
  X,
  Check,
  AlertCircle,
  Shield,
  Target,
  Lightbulb,
  Zap,
  Star,
  Heart,
  Lock,
  Key,
  Database,
  Cloud,
  Code,
  Terminal,
  Cpu,
  HardDrive,
  Wifi,
  Globe,
  ChevronRight,
  RefreshCw,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { compartmentsConfig } from '@/lib/config/compartments.config'
import { motion, AnimatePresence } from 'framer-motion'

// Types
interface Memory {
  id: string
  content: string
  compartmentId: string
  created_at: string
  metadata?: Record<string, any>
  tags?: string[]
  status?: 'active' | 'archived' | 'processing'
}

interface Compartment {
  id: string
  name: string
  icon: string
  color: string
  description: string
  memories: Memory[]
}

interface Mem0AdvancedSidebarProps {
  memories?: Memory[]
  onMemoryAdd?: (compartmentId: string, content: string) => void
  onMemoryEdit?: (id: string, content: string) => void
  onMemoryDelete?: (id: string) => void
  onMemoryReorder?: (compartmentId: string, oldIndex: number, newIndex: number) => void
  onMemorySelect?: (memory: Memory) => void
  selectedMemoryId?: string
  className?: string
  searchable?: boolean
  filterable?: boolean
  editable?: boolean
  collapsible?: boolean
}

// Icon mapping
const iconMap = {
  Shield,
  AlertCircle,
  Target,
  Lightbulb,
  Zap,
  Star,
  Heart,
  Lock,
  Key,
  Database,
  Cloud,
  Code,
  Terminal,
  Cpu,
  HardDrive,
  Wifi,
  Globe
} as const

// Sortable Memory Item Component
const SortableMemoryItem: React.FC<{
  memory: Memory
  isSelected: boolean
  isEditing: boolean
  editContent: string
  onSelect: () => void
  onEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onEditContentChange: (content: string) => void
  editable: boolean
}> = ({
  memory,
  isSelected,
  isEditing,
  editContent,
  onSelect,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditContentChange,
  editable
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: memory.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'processing':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
      case 'archived':
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />
      default:
        return <div className="w-2 h-2 bg-green-500 rounded-full" />
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative p-3 rounded-lg border transition-all duration-200",
        "hover:shadow-md cursor-pointer",
        isDragging && "shadow-lg opacity-50 z-50",
        isSelected
          ? "bg-gray-100 border-gray-900 shadow-sm"
          : "bg-white border-gray-200 hover:bg-gray-50"
      )}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      {editable && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>
      )}

      <div className="pl-4">
        {/* Status & Actions */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon(memory.status)}
            <span className="text-xs text-gray-500">
              {new Date(memory.created_at).toLocaleDateString()}
            </span>
          </div>

          {editable && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isEditing ? (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onSaveEdit(); }}
                    className="p-1 hover:bg-green-100 rounded text-green-600"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
                    className="p-1 hover:bg-red-100 rounded text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="p-1 hover:bg-blue-100 rounded text-blue-600"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1 hover:bg-red-100 rounded text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full p-2 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            rows={3}
            autoFocus
          />
        ) : (
          <p className="text-sm text-gray-900 line-clamp-3 leading-relaxed">
            {memory.content}
          </p>
        )}

        {/* Tags */}
        {memory.tags && memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {memory.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-900/10 text-gray-700 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Compartment Component
const CompartmentSection: React.FC<{
  compartment: Compartment
  isCollapsed: boolean
  onToggleCollapse: () => void
  selectedMemoryId?: string
  onMemorySelect: (memory: Memory) => void
  onMemoryAdd: () => void
  onMemoryEdit: (id: string, content: string) => void
  onMemoryDelete: (id: string) => void
  onMemoryReorder: (oldIndex: number, newIndex: number) => void
  searchTerm: string
  filterStatus: string
  editable: boolean
  collapsible: boolean
}> = ({
  compartment,
  isCollapsed,
  onToggleCollapse,
  selectedMemoryId,
  onMemorySelect,
  onMemoryAdd,
  onMemoryEdit,
  onMemoryDelete,
  onMemoryReorder,
  searchTerm,
  filterStatus,
  editable,
  collapsible
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const IconComponent = iconMap[compartment.icon as keyof typeof iconMap] || Shield

  // Filter memories based on search and status
  const filteredMemories = useMemo(() => {
    return compartment.memories.filter(memory => {
      const matchesSearch = !searchTerm ||
        memory.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesFilter = filterStatus === 'all' || memory.status === filterStatus

      return matchesSearch && matchesFilter
    })
  }, [compartment.memories, searchTerm, filterStatus])

  const handleEdit = (memory: Memory) => {
    setEditingId(memory.id)
    setEditContent(memory.content)
  }

  const handleSaveEdit = (id: string) => {
    onMemoryEdit(id, editContent)
    setEditingId(null)
    setEditContent('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = filteredMemories.findIndex(m => m.id === active.id)
      const newIndex = filteredMemories.findIndex(m => m.id === over.id)

      onMemoryReorder(oldIndex, newIndex)
    }
  }

  return (
    <div className="mb-6">
      {/* Compartment Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={collapsible ? onToggleCollapse : undefined}
          className={cn(
            "flex items-center gap-2 text-sm font-medium group",
            collapsible && "hover:bg-gray-50 p-2 -m-2 rounded-lg transition-colors"
          )}
        >
          <IconComponent className={cn("w-4 h-4", compartment.color)} />
          <span className="text-gray-900">{compartment.name}</span>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
            {filteredMemories.length}
          </span>
          {collapsible && (
            <ChevronRight className={cn(
              "w-4 h-4 text-gray-400 transition-transform duration-200",
              isCollapsed && "rotate-90"
            )} />
          )}
        </button>

        {editable && !isCollapsed && (
          <button
            onClick={onMemoryAdd}
            className="p-1 hover:bg-gray-900/10 rounded text-gray-900 transition-colors"
            title="Add memory"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Memories List */}
      {!isCollapsed && (
        <div className="space-y-2">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {searchTerm || filterStatus !== 'all'
                ? 'No memories match your filters'
                : 'No memories yet'}
            </div>
          ) : (
            <DndContext
              sensors={useSensors(
                useSensor(PointerSensor),
                useSensor(KeyboardSensor, {
                  coordinateGetter: sortableKeyboardCoordinates,
                })
              )}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredMemories.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredMemories.map(memory => (
                  <SortableMemoryItem
                    key={memory.id}
                    memory={memory}
                    isSelected={selectedMemoryId === memory.id}
                    isEditing={editingId === memory.id}
                    editContent={editContent}
                    onSelect={() => onMemorySelect(memory)}
                    onEdit={() => handleEdit(memory)}
                    onSaveEdit={() => handleSaveEdit(memory.id)}
                    onCancelEdit={handleCancelEdit}
                    onDelete={() => onMemoryDelete(memory.id)}
                    onEditContentChange={setEditContent}
                    editable={editable}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  )
}

// Main Component
export default function Mem0AdvancedSidebar({
  memories = [],
  onMemoryAdd,
  onMemoryEdit,
  onMemoryDelete,
  onMemoryReorder,
  onMemorySelect,
  selectedMemoryId,
  className,
  searchable = true,
  filterable = true,
  editable = true,
  collapsible = true
}: Mem0AdvancedSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [collapsedCompartments, setCollapsedCompartments] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)

  // Organize memories by compartments
  const compartments: Compartment[] = useMemo(() => {
    return compartmentsConfig.map(config => ({
      ...config,
      memories: memories.filter(memory => memory.compartmentId === config.id)
    }))
  }, [memories])

  const toggleCompartmentCollapse = (compartmentId: string) => {
    setCollapsedCompartments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(compartmentId)) {
        newSet.delete(compartmentId)
      } else {
        newSet.add(compartmentId)
      }
      return newSet
    })
  }

  const handleMemoryReorder = (compartmentId: string, oldIndex: number, newIndex: number) => {
    onMemoryReorder?.(compartmentId, oldIndex, newIndex)
  }

  return (
    <div className={cn(
      "w-80 h-full bg-gray-50 border-r border-gray-200 flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Memory Compartments
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Add memory"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Search */}
        {searchable && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Filter */}
        {filterable && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-3 py-1 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="processing">Processing</option>
            </select>
          </div>
        )}
      </div>

      {/* Compartments */}
      <div className="flex-1 overflow-y-auto p-4">
        {compartments.map(compartment => (
          <CompartmentSection
            key={compartment.id}
            compartment={compartment}
            isCollapsed={collapsedCompartments.has(compartment.id)}
            onToggleCollapse={() => toggleCompartmentCollapse(compartment.id)}
            selectedMemoryId={selectedMemoryId}
            onMemorySelect={onMemorySelect || (() => {})}
            onMemoryAdd={() => onMemoryAdd?.(compartment.id, '')}
            onMemoryEdit={onMemoryEdit || (() => {})}
            onMemoryDelete={onMemoryDelete || (() => {})}
            onMemoryReorder={(oldIndex, newIndex) =>
              handleMemoryReorder(compartment.id, oldIndex, newIndex)
            }
            searchTerm={searchTerm}
            filterStatus={filterStatus}
            editable={editable}
            collapsible={collapsible}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Mem0 Advanced</span>
          <div className="flex items-center gap-2">
            <button
              className="p-1 hover:bg-gray-100 rounded"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1 hover:bg-gray-100 rounded"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Memory Modal */}
      <AnimatePresence>
        {showAddModal && (
          <MemoryAddModal
            compartments={compartments}
            onClose={() => setShowAddModal(false)}
            onAdd={(compartmentId: string, content: string) => {
              onMemoryAdd?.(compartmentId, content)
              setShowAddModal(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Add Memory Modal Component
const MemoryAddModal: React.FC<{
  compartments: Compartment[]
  onClose: () => void
  onAdd: (compartmentId: string, content: string) => void
}> = ({ compartments, onClose, onAdd }) => {
  const [selectedCompartment, setSelectedCompartment] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')

  const handleSubmit = () => {
    if (selectedCompartment && content.trim()) {
      onAdd(selectedCompartment, content.trim())
    }
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      setTags([...tags, tag.trim()])
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Add Memory</h2>

          {/* Compartment Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compartment</label>
            <select
              value={selectedCompartment}
              onChange={(e) => setSelectedCompartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
            >
              <option value="">Select compartment</option>
              {compartments.map(comp => (
                <option key={comp.id} value={comp.id}>{comp.name}</option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
              rows={4}
              placeholder="Enter memory content..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <input
              type="text"
              placeholder="Press Enter to add tags"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag(e.currentTarget.value)
                  e.currentTarget.value = ''
                }
              }}
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => setTags(tags.filter(t => t !== tag))}
                    className="hover:bg-gray-200 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "px-3 py-1 text-sm rounded-lg transition-colors capitalize",
                    priority === p
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedCompartment || !content.trim()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Memory
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}