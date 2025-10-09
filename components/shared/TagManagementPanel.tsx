'use client'

import { useState } from 'react'
import { X, Plus, Save, GripVertical, Trash2, Edit2, ChevronDown, ChevronRight, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CategoryPanel, type Category } from '@/components/shared'

export interface TagTemplate {
  id: string
  name: string
  color: string
  category?: string | null // Category for grouping (e.g., "security", "status")
  position?: number // Display order within category
  usageCount?: number // Nombre de facts utilisant ce tag
}

export interface TagManagementPanelProps {
  tags: TagTemplate[]
  onSave: (tags: TagTemplate[]) => void
  onCancel: () => void
  title?: string
}

const COLORS = [
  { name: 'blue', label: 'Bleu', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', hex: '#3b82f6' },
  { name: 'green', label: 'Vert', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', hex: '#10b981' },
  { name: 'purple', label: 'Gris', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', hex: '#6b7280' },
  { name: 'orange', label: 'Orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', hex: '#f97316' },
  { name: 'pink', label: 'Gris clair', bg: 'bg-gray-200', text: 'text-gray-800', border: 'border-gray-300', hex: '#9ca3af' },
  { name: 'yellow', label: 'Jaune', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', hex: '#eab308' },
  { name: 'red', label: 'Rouge', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', hex: '#ef4444' },
  { name: 'gray', label: 'Gris', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', hex: '#9ca3af' }
]

// Category droppable component
function TagCategory({
  category,
  label,
  tags,
  isExpanded,
  onToggle,
  onEdit,
  onDelete
}: {
  category: string
  label: string
  tags: TagTemplate[]
  isExpanded: boolean
  onToggle: () => void
  onEdit: (tag: TagTemplate) => void
  onDelete: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${category}`,
    data: { category }
  })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border transition-all ${
        isOver ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      {/* Category Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <Folder size={18} className="text-gray-500" />
          <span className="font-medium">{label}</span>
          <span className="text-xs text-gray-500">({tags.length})</span>
        </div>
      </button>

      {/* Tags List */}
      {isExpanded && (
        <div className="p-3 space-y-2 border-t border-gray-200 dark:border-gray-800">
          <SortableContext items={tags.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tags.map(tag => (
              <SortableTag
                key={tag.id}
                tag={tag}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  )
}

function SortableTag({
  tag,
  onEdit,
  onDelete
}: {
  tag: TagTemplate
  onEdit: (tag: TagTemplate) => void
  onDelete: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: tag.id,
    data: { category: tag.category }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const colorClasses = COLORS.find(c => c.name === tag.color) || COLORS[0]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 group"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
        <GripVertical size={16} className="text-gray-400" />
      </div>

      <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}>
        {tag.name}
      </div>

      <div className="flex-1">
        <div className="text-xs text-gray-500">
          {tag.usageCount !== undefined ? `Used in ${tag.usageCount} fact${tag.usageCount !== 1 ? 's' : ''}` : 'Not used'}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(tag)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title="Edit"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onDelete(tag.id)}
          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export function TagManagementPanel({
  tags: initialTags,
  onSave,
  onCancel,
  title = 'Manage Tags'
}: TagManagementPanelProps) {
  const [tags, setTags] = useState<TagTemplate[]>(initialTags)
  const [editingTag, setEditingTag] = useState<TagTemplate | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['general']))
  const [isManagingCategories, setIsManagingCategories] = useState(false)
  const [tagCategories, setTagCategories] = useState<Array<{key: string, label: string, icon: string}>>([
    { key: 'general', label: 'General', icon: '📁' }
  ])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  )

  // Group tags by category
  const groupedTags = () => {
    const groups: Record<string, TagTemplate[]> = {}

    tags.forEach(tag => {
      const category = tag.category || 'general'
      if (!groups[category]) groups[category] = []
      groups[category].push(tag)
    })

    // Sort tags within each category by position
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => {
        const posA = a.position ?? 999999
        const posB = b.position ?? 999999
        return posA - posB
      })
    })

    return groups
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeTag = tags.find(t => t.id === active.id)
    if (!activeTag) return

    // Determine target category
    let targetCategory = activeTag.category
    if (over.data?.current?.category) {
      targetCategory = over.data.current.category
    } else if (typeof over.id === 'string' && over.id.startsWith('droppable-')) {
      targetCategory = over.id.replace('droppable-', '')
    } else {
      const overTag = tags.find(t => t.id === over.id)
      targetCategory = overTag?.category
    }

    // Move between categories
    if (activeTag.category !== targetCategory) {
      const updatedTag = { ...activeTag, category: targetCategory, position: 0 }
      setTags(tags.map(t => t.id === activeTag.id ? updatedTag : t))
      toast.success('Tag moved to ' + targetCategory)
    } else {
      // Reorder within category
      const categoryTags = tags.filter(t => (t.category || 'general') === (activeTag.category || 'general'))
      const oldIndex = categoryTags.findIndex(t => t.id === active.id)
      const newIndex = categoryTags.findIndex(t => t.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(categoryTags, oldIndex, newIndex)
      const updatedTags = reordered.map((t, idx) => ({ ...t, position: idx }))

      setTags(tags.map(t => {
        const updated = updatedTags.find(ut => ut.id === t.id)
        return updated || t
      }))
    }
  }

  const handleAddTag = () => {
    const newTag: TagTemplate = {
      id: `tag_${Date.now()}`,
      name: 'New Tag',
      color: 'blue',
      category: 'general',
      position: 0,
      usageCount: 0
    }
    setEditingTag(newTag)
  }

  const handleSaveEdit = () => {
    if (!editingTag || !editingTag.name.trim()) {
      toast.error('Name is required')
      return
    }

    const exists = tags.find(t => t.id === editingTag.id)
    if (exists) {
      setTags(tags.map(t =>
        t.id === editingTag.id ? editingTag : t
      ))
    } else {
      setTags([...tags, editingTag])
    }

    setEditingTag(null)
    toast.success('Tag saved')
  }

  const handleDelete = (id: string) => {
    const tag = tags.find(t => t.id === id)
    if (!tag) return

    if (tag.usageCount && tag.usageCount > 0) {
      if (!confirm(`This tag is used in ${tag.usageCount} fact(s). Delete anyway?`)) return
    } else {
      if (!confirm('Delete this tag?')) return
    }

    setTags(tags.filter(t => t.id !== id))
    toast.success('Tag deleted')
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Drag to reorder, edit names and colors, delete tags
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Manage Categories Button */}
          <Button onClick={() => setIsManagingCategories(true)} variant="outline" size="sm">
            <Folder className="w-4 h-4 mr-2" />
            Manage Tag Categories
          </Button>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="space-y-3">
              {Object.entries(groupedTags()).map(([category, categoryTags]) => {
                const categoryInfo = tagCategories.find(c => c.key === category) || { key: category, label: category, icon: '📁' }
                return (
                  <TagCategory
                    key={category}
                    category={category}
                    label={categoryInfo.label}
                    tags={categoryTags}
                    isExpanded={expandedCategories.has(category)}
                    onToggle={() => toggleCategory(category)}
                    onEdit={setEditingTag}
                    onDelete={handleDelete}
                  />
                )
              })}
            </div>
          </DndContext>

          {tags.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No tags yet. Create your first tag!
            </div>
          )}

          <Button onClick={handleAddTag} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Tag
          </Button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(tags)} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTag && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">
              {tags.find(t => t.id === editingTag.id) ? 'Edit' : 'New'} Tag
            </h3>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                value={editingTag.name}
                onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                placeholder="e.g., tested, idor, critical"
                autoFocus
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(color => (
                  <button
                    key={color.name}
                    onClick={() => setEditingTag({ ...editingTag, color: color.name })}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-transform ${
                      editingTag.color === color.name ? 'border-blue-500 scale-110 shadow-lg' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.label}
                  >
                    {editingTag.color === color.name && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={editingTag.category || 'general'}
                onChange={(e) => setEditingTag({ ...editingTag, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                {tagCategories.map(cat => (
                  <option key={cat.key} value={cat.key}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveEdit} className="flex-1 bg-green-600 hover:bg-green-700">
                Save
              </Button>
              <Button onClick={() => setEditingTag(null)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category Management with CategoryPanel */}
      {isManagingCategories && (
        <CategoryPanel
          categories={tagCategories.map(c => ({
            id: c.key,
            value: c.key,
            label: c.label,
            icon: c.icon,
            color: 'gray' as const
          }))}
          onSave={async (newCategories) => {
            const formatted = newCategories.map(c => ({
              key: c.value,
              label: c.label,
              icon: c.icon
            }))

            setTagCategories(formatted)
            setIsManagingCategories(false)
            toast.success('Tag categories saved!')
          }}
          onCancel={() => setIsManagingCategories(false)}
          title="Manage Tag Categories"
        />
      )}
    </div>
  )
}
