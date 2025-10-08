'use client'

import { useState } from 'react'
import { X, Plus, Save, GripVertical, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import IconColorPicker from './IconColorPicker'
import DynamicIcon from './DynamicIcon'

export interface Category {
  id?: string // ID stable pour détecter renames
  value: string
  label: string
  icon: string // icon_name (Phosphor) au lieu d'emoji
  color: string // hex color (#6b7280) au lieu de 'gray'/'blue'
  description?: string
}

export interface CategoryPanelProps {
  categories: Category[]
  onSave: (categories: Category[]) => void
  onCancel: () => void
  title?: string
  // DEPRECATED: emojis/colors - now using IconColorPicker (Phosphor 9,000 icons)
}

function SortableCategory({
  category,
  onEdit,
  onDelete
}: {
  category: Category
  onEdit: (cat: Category) => void
  onDelete: (value: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.value })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 group"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
        <GripVertical size={16} className="text-gray-400" />
      </div>

      <DynamicIcon
        name={category.icon || 'Folder'}
        size={24}
        color={category.color || '#6b7280'}
      />

      <div className="flex-1">
        <div className="font-medium text-sm">{category.label}</div>
        {category.description && (
          <div className="text-xs text-gray-500 italic mt-0.5">{category.description}</div>
        )}
        <div className="text-xs text-gray-400">{category.value}</div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(category)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title="Edit"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onDelete(category.value)}
          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export function CategoryPanel({
  categories: initialCategories,
  onSave,
  onCancel,
  title = 'Manage Categories'
}: CategoryPanelProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex(c => c.value === active.id)
    const newIndex = categories.findIndex(c => c.value === over.id)

    setCategories(arrayMove(categories, oldIndex, newIndex))
  }

  const handleAddCategory = () => {
    const newCategory: Category = {
      value: `category_${Date.now()}`,
      label: 'New Category',
      icon: 'Folder', // Phosphor icon par défaut
      color: '#6b7280', // Hex color par défaut
      description: ''
    }
    setEditingCategory(newCategory)
  }

  const handleSaveEdit = () => {
    if (!editingCategory || !editingCategory.label.trim()) {
      toast.error('Label is required')
      return
    }

    const exists = categories.find(c => c.value === editingCategory.value)
    if (exists) {
      setCategories(categories.map(c =>
        c.value === editingCategory.value ? editingCategory : c
      ))
    } else {
      setCategories([...categories, editingCategory])
    }

    setEditingCategory(null)
    toast.success('Category saved')
  }

  const handleDelete = (value: string) => {
    if (!confirm('Delete this category?')) return
    setCategories(categories.filter(c => c.value !== value))
    toast.success('Category deleted')
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
              Drag to reorder, edit icons and labels
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
            <SortableContext items={categories.map(c => c.value)} strategy={verticalListSortingStrategy}>
              {categories.map(cat => (
                <SortableCategory
                  key={cat.value}
                  category={cat}
                  onEdit={setEditingCategory}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button onClick={handleAddCategory} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(categories)} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">
              {categories.find(c => c.value === editingCategory.value) ? 'Edit' : 'New'} Category
            </h3>

            {/* Icon + Color Picker */}
            <div>
              <label className="block text-sm font-medium mb-2">Icône & Couleur</label>
              <IconColorPicker
                icon={editingCategory.icon}
                color={editingCategory.color}
                onIconChange={(icon) => setEditingCategory({ ...editingCategory, icon })}
                onColorChange={(color) => setEditingCategory({ ...editingCategory, color })}
                size="md"
              />
            </div>

            {/* Label */}
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                value={editingCategory.label}
                onChange={(e) => setEditingCategory({ ...editingCategory, label: e.target.value })}
                placeholder="e.g., Authentication"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description (Optional)</label>
              <Input
                value={editingCategory.description || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                placeholder="e.g., Tests related to authentication vulnerabilities"
              />
            </div>

            {/* Value (ID) - Toujours éditable */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Category Key {categories.find(c => c.value === editingCategory.value) && '(will update all facts)'}
              </label>
              <Input
                value={editingCategory.value}
                onChange={(e) =>
                  setEditingCategory({
                    ...editingCategory,
                    value: e.target.value.toLowerCase().replace(/\s+/g, '_')
                  })
                }
                placeholder="e.g., success"
              />
            </div>

            {/* Color picker now integrated in IconColorPicker above */}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveEdit} className="flex-1 bg-green-600 hover:bg-green-700">
                Save
              </Button>
              <Button onClick={() => setEditingCategory(null)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
