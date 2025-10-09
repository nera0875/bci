'use client'

import { useState } from 'react'
import { X, Plus, Save, GripVertical, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DynamicIcon from '@/components/shared/DynamicIcon'
import IconPickerNotion from '@/components/shared/IconPickerNotion'

interface Category {
  id?: string  // UUID from database
  value: string
  label: string
  icon: string // icon_name (Phosphor) au lieu d'emoji
  color: string // hex color au lieu de 'blue'/'red'
}

interface CategoryManagerProps {
  categories: Category[]
  onSave: (categories: Category[]) => void
  onCancel: () => void
  projectId: string
}

// DEPRECATED: Plus d'emojis, utiliser IconPicker (9,000 icônes Phosphor)

function SortableCategory({ category, onEdit, onDelete }: {
  category: Category
  onEdit: (cat: Category) => void
  onDelete: (id: string) => void
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
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1"
      >
        <GripVertical size={16} className="text-gray-400" />
      </div>

      <DynamicIcon
        name={category.icon || 'Shield'}
        size={24}
        color={category.color || '#6b7280'}
      />

      <div className="flex-1">
        <div className="font-medium text-sm">{category.label}</div>
        <div className="text-xs text-gray-500">{category.value}</div>
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
          onClick={() => category.id && onDelete(category.id)}
          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export function CategoryManager({ categories: initialCategories, onSave, onCancel, projectId }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
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
      icon: 'Shield', // Icon Phosphor par défaut
      color: '#6b7280' // Hex color par défaut
    }
    setEditingCategory(newCategory)
  }

  const handleSaveEdit = async () => {
    if (!editingCategory) return

    if (!editingCategory.label.trim()) {
      toast.error('Label requis')
      return
    }

    try {
      const exists = categories.find(c => c.value === editingCategory.value)

      if (exists) {
        // Update via API - Use UUID, not key!
        const response = await fetch('/api/rules/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: exists.id, // ✅ Use UUID from database
            key: editingCategory.value,
            label: editingCategory.label,
            icon_name: editingCategory.icon, // ✅ Send as icon_name
            icon_color: editingCategory.color, // ✅ Send as icon_color
            description: editingCategory.label
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update category')
        }

        setCategories(categories.map(c =>
          c.value === editingCategory.value ? { ...editingCategory, id: exists.id } : c
        ))
      } else {
        // Add via API
        const response = await fetch('/api/rules/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            key: editingCategory.value,
            label: editingCategory.label,
            icon_name: editingCategory.icon, // ✅ Send as icon_name
            icon_color: editingCategory.color, // ✅ Send as icon_color
            description: editingCategory.label
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create category')
        }

        const { category: newCategory } = await response.json()

        // Add with UUID from database
        setCategories([...categories, {
          id: newCategory.id,
          value: newCategory.key,
          label: newCategory.label,
          icon: newCategory.icon_name || newCategory.icon || 'Shield',
          color: newCategory.icon_color || '#6b7280'
        }])
      }

      setEditingCategory(null)
      toast.success('Catégorie sauvegardée !')
    } catch (error) {
      console.error('Error saving category:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return

    try {
      // Delete via API using UUID
      await fetch(`/api/rules/categories?id=${categoryId}`, {
        method: 'DELETE'
      })

      setCategories(categories.filter(c => c.id !== categoryId))
      toast.success('Catégorie supprimée de Supabase !')
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Gérer les Catégories
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Éditer, ajouter, supprimer, réorganiser
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
            Ajouter une catégorie
          </Button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={() => onSave(categories)} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">
              {categories.find(c => c.value === editingCategory.value) ? 'Éditer' : 'Nouvelle'} Catégorie
            </h3>

            {/* Icon + Color Picker */}
            <div>
              <label className="block text-sm font-medium mb-2">Icône & Couleur</label>
              <IconPickerNotion
                value={editingCategory.icon}
                color={editingCategory.color}
                onChange={(icon) => setEditingCategory({ ...editingCategory, icon })}
                onColorChange={(color) => setEditingCategory({ ...editingCategory, color })}
              />
            </div>

            {/* Label */}
            <div>
              <label className="block text-sm font-medium mb-2">Nom</label>
              <Input
                value={editingCategory.label}
                onChange={(e) => setEditingCategory({ ...editingCategory, label: e.target.value })}
                placeholder="Ex: Authentication"
              />
            </div>

            {/* Value (ID) */}
            <div>
              <label className="block text-sm font-medium mb-2">ID technique (snake_case)</label>
              <Input
                value={editingCategory.value}
                onChange={(e) => setEditingCategory({ ...editingCategory, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="Ex: auth"
                disabled={!!categories.find(c => c.value === editingCategory.value)}
              />
            </div>

            {/* Couleur maintenant dans IconColorPicker ci-dessus */}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveEdit} className="flex-1 bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </Button>
              <Button onClick={() => setEditingCategory(null)} variant="outline">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
