'use client'

import { useState } from 'react'
import { X, Plus, Save, GripVertical, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface TagTemplate {
  id: string
  name: string
  color: string
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
  { name: 'purple', label: 'Violet', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', hex: '#a855f7' },
  { name: 'orange', label: 'Orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', hex: '#f97316' },
  { name: 'pink', label: 'Rose', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', hex: '#ec4899' },
  { name: 'yellow', label: 'Jaune', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', hex: '#eab308' },
  { name: 'red', label: 'Rouge', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', hex: '#ef4444' },
  { name: 'gray', label: 'Gris', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', hex: '#9ca3af' }
]

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
  } = useSortable({ id: tag.id })

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
      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 group"
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tags.findIndex(t => t.id === active.id)
    const newIndex = tags.findIndex(t => t.id === over.id)

    setTags(arrayMove(tags, oldIndex, newIndex))
  }

  const handleAddTag = () => {
    const newTag: TagTemplate = {
      id: `tag_${Date.now()}`,
      name: 'New Tag',
      color: 'blue',
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tags.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {tags.map(tag => (
                <SortableTag
                  key={tag.id}
                  tag={tag}
                  onEdit={setEditingTag}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
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
    </div>
  )
}
