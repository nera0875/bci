'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles, Plus, Trash2, Edit2, Copy, Download, Upload,
  ChevronRight, ChevronDown, FolderOpen, FileText, GripVertical,
  Check, X, Eye, FileCode
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import MarkdownEditorPro from '@/components/editor/MarkdownEditorPro'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { htmlToMarkdown } from '@/lib/utils/htmlToMarkdown'

interface SystemPromptsProps {
  projectId: string
}

interface SystemPrompt {
  id: string
  name: string
  content: string
  category: string
  enabled: boolean
  priority: number
  createdAt: string
  // Supabase fields (aligned with DB schema)
  is_active?: boolean
  sort_order?: number
  icon?: string
  description?: string
}

// Composant droppable pour une catégorie
function DroppableCategory({ category, children }: { category: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `category-${category}`
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all",
        isOver && "bg-gray-50 dark:bg-gray-900/20 ring-2 ring-gray-400 dark:ring-gray-500 rounded"
      )}
    >
      {children}
    </div>
  )
}

// Composant draggable pour un prompt
function SortablePrompt({ prompt, onToggle, onEdit, onDelete, onDuplicate }: {
  prompt: SystemPrompt
  onToggle: (id: string) => void
  onEdit: (prompt: SystemPrompt) => void
  onDelete: (id: string) => void
  onDuplicate: (prompt: SystemPrompt) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: prompt.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
        "hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all duration-200",
        prompt.enabled && "border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-950/20 shadow-sm"
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
      >
        <GripVertical size={16} className="text-gray-400" />
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(prompt.id)}
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
          prompt.enabled
            ? "bg-gray-900 border-gray-900 dark:bg-gray-100 dark:border-gray-100"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
        )}
      >
        {prompt.enabled && <Check size={14} className={cn(prompt.enabled && "text-white dark:text-gray-900")} />}
      </button>

      {/* Priority badge */}
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400">
        {prompt.priority}
      </div>

      {/* Name & preview */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-gray-400 flex-shrink-0" />
          <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {prompt.name}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
          {prompt.content.substring(0, 80)}...
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(prompt)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title="Edit"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onDuplicate(prompt)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title="Duplicate"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={() => onDelete(prompt.id)}
          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function SystemPromptsSection({ projectId }: SystemPromptsProps) {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([])
  const [categories, setCategories] = useState<Record<string, boolean>>({})
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [exportCategory, setExportCategory] = useState<string | null>(null)
  const [importCategory, setImportCategory] = useState<string>('Custom')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  useEffect(() => {
    loadPrompts()
  }, [projectId])

  const loadPrompts = async () => {
    try {
      // ✅ Load from Supabase API instead of localStorage
      const response = await fetch(`/api/system-prompts?projectId=${projectId}`)
      const { prompts: data } = await response.json()

      if (data && data.length > 0) {
        // Map Supabase schema to component interface
        const mapped: SystemPrompt[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          content: p.content,
          category: p.category || 'Uncategorized',
          enabled: p.is_active ?? false,
          priority: p.sort_order ?? 0,
          createdAt: p.created_at,
          icon: p.icon,
          description: p.description
        }))

        setPrompts(mapped)

        // Extract categories
        const cats = mapped.reduce((acc: Record<string, boolean>, p: SystemPrompt) => {
          acc[p.category] = true
          return acc
        }, {})
        setExpandedCategories(cats)
      } else {
        // If no prompts in Supabase, start with empty list
        setPrompts([])
      }
    } catch (error) {
      console.error('Failed to load prompts from Supabase:', error)
      toast.error('Failed to load prompts')
    }
  }

  const savePrompts = (newPrompts: SystemPrompt[]) => {
    // ✅ Update local state immediately (optimistic update)
    setPrompts(newPrompts)
    // Note: Individual CRUD operations will handle Supabase sync
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event

    if (!over) return

    // Check if dropping on a category
    if (over.id.toString().startsWith('category-')) {
      const targetCategory = over.id.toString().replace('category-', '')
      const draggedPrompt = prompts.find(p => p.id === active.id)

      if (draggedPrompt && draggedPrompt.category !== targetCategory) {
        try {
          // ✅ Update category in Supabase
          const response = await fetch('/api/system-prompts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: active.id,
              category: targetCategory
            })
          })

          if (!response.ok) throw new Error('Update failed')

          // Update local state
          const updated = prompts.map(p =>
            p.id === active.id ? { ...p, category: targetCategory } : p
          )
          setPrompts(updated)
          toast.success(`Moved to "${targetCategory}"!`)
        } catch (error) {
          console.error('Failed to move prompt:', error)
          toast.error('Failed to move prompt')
        }
      }
      return
    }

    // Reordering within same list
    if (active.id !== over.id) {
      const oldIndex = prompts.findIndex(i => i.id === active.id)
      const newIndex = prompts.findIndex(i => i.id === over.id)

      const reordered = arrayMove(prompts, oldIndex, newIndex)

      // Update priorities
      const updated = reordered.map((item, index) => ({
        ...item,
        priority: index + 1
      }))

      // Update local state immediately
      setPrompts(updated)

      // ✅ Batch update sort_order in Supabase
      try {
        await Promise.all(
          updated.map(item =>
            fetch('/api/system-prompts', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: item.id,
                sort_order: item.priority
              })
            })
          )
        )

        toast.success('Order updated!')
      } catch (error) {
        console.error('Failed to update order:', error)
        toast.error('Failed to update order')
        // Reload to revert optimistic update
        loadPrompts()
      }
    }
  }

  const handleToggle = async (id: string) => {
    const prompt = prompts.find(p => p.id === id)
    if (!prompt) return

    const newStatus = !prompt.enabled

    try {
      // ✅ Update in Supabase
      const response = await fetch('/api/system-prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          is_active: newStatus
        })
      })

      if (!response.ok) throw new Error('Update failed')

      // Update local state
      const updated = prompts.map(p =>
        p.id === id ? { ...p, enabled: newStatus } : p
      )
      setPrompts(updated)
      toast.success(newStatus ? 'Activated' : 'Deactivated')
    } catch (error) {
      console.error('Failed to toggle prompt:', error)
      toast.error('Failed to update prompt')
    }
  }

  const handleCreate = () => {
    setEditingPrompt({
      id: `prompt_${Date.now()}`,
      name: 'New Prompt',
      content: '',
      category: 'Custom',
      enabled: false,
      priority: prompts.length + 1,
      createdAt: new Date().toISOString()
    })
    setShowEditor(true)
  }

  const handleSave = async () => {
    if (!editingPrompt) return

    const exists = prompts.find(p => p.id === editingPrompt.id)

    try {
      if (exists) {
        // ✅ UPDATE existing prompt
        const response = await fetch('/api/system-prompts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPrompt.id,
            name: editingPrompt.name,
            content: editingPrompt.content,
            category: editingPrompt.category,
            icon: editingPrompt.icon || '✨',
            is_active: editingPrompt.enabled,
            sort_order: editingPrompt.priority
          })
        })

        if (!response.ok) throw new Error('Update failed')

        const { prompt: updated } = await response.json()

        // Update local state
        setPrompts(prompts.map(p => p.id === editingPrompt.id ? {
          ...editingPrompt,
          id: updated.id,
          createdAt: updated.created_at
        } : p))
      } else {
        // ✅ CREATE new prompt
        const response = await fetch('/api/system-prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            name: editingPrompt.name,
            content: editingPrompt.content,
            category: editingPrompt.category,
            icon: editingPrompt.icon || '✨',
            is_active: editingPrompt.enabled,
            sort_order: editingPrompt.priority
          })
        })

        if (!response.ok) throw new Error('Create failed')

        const { prompt: created } = await response.json()

        // Add to local state with Supabase ID
        setPrompts([...prompts, {
          ...editingPrompt,
          id: created.id,
          createdAt: created.created_at
        }])
      }

      setShowEditor(false)
      setEditingPrompt(null)
      toast.success('Prompt saved!')
    } catch (error) {
      console.error('Failed to save prompt:', error)
      toast.error('Failed to save prompt')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prompt?')) return

    try {
      // ✅ Delete from Supabase
      const response = await fetch(`/api/system-prompts?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Delete failed')

      // Update local state
      const updated = prompts.filter(p => p.id !== id)
      setPrompts(updated)
      toast.success('Prompt deleted!')
    } catch (error) {
      console.error('Failed to delete prompt:', error)
      toast.error('Failed to delete prompt')
    }
  }

  const handleDuplicate = async (prompt: SystemPrompt) => {
    try {
      // ✅ Create duplicate in Supabase
      const response = await fetch('/api/system-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: `${prompt.name} (Copy)`,
          content: prompt.content,
          category: prompt.category,
          icon: prompt.icon || '✨',
          is_active: false,
          sort_order: prompts.length + 1
        })
      })

      if (!response.ok) throw new Error('Duplicate failed')

      const { prompt: created } = await response.json()

      // Add to local state
      setPrompts([...prompts, {
        id: created.id,
        name: created.name,
        content: created.content,
        category: created.category,
        enabled: created.is_active,
        priority: created.sort_order,
        createdAt: created.created_at,
        icon: created.icon
      }])

      toast.success('Prompt duplicated!')
    } catch (error) {
      console.error('Failed to duplicate prompt:', error)
      toast.error('Failed to duplicate prompt')
    }
  }

  const handleRenameCategory = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) {
      // Reset editing state even if invalid
      setEditingCategory(null)
      setNewCategoryName('')
      return
    }

    const updated = prompts.map(p =>
      p.category === oldName ? { ...p, category: newName.trim() } : p
    )
    savePrompts(updated)

    if (selectedCategory === oldName) {
      setSelectedCategory(newName.trim())
    }

    setEditingCategory(null)
    setNewCategoryName('')
    toast.success('Category renamed!')
  }

  const handleDeleteCategory = (category: string) => {
    const promptsInCategory = prompts.filter(p => p.category === category)
    if (promptsInCategory.length > 0) {
      if (!confirm(`Delete category "${category}" and move ${promptsInCategory.length} prompts to "Uncategorized"?`)) return

      const updated = prompts.map(p =>
        p.category === category ? { ...p, category: 'Uncategorized' } : p
      )
      savePrompts(updated)
    }

    if (selectedCategory === category) {
      setSelectedCategory(null)
    }

    toast.success('Category deleted!')
  }

  const handleCreateCategory = () => {
    const name = prompt('New category name:')
    if (!name || !name.trim()) return

    // Create a placeholder prompt in this category
    const newPrompt: SystemPrompt = {
      id: `prompt_${Date.now()}`,
      name: 'New Prompt',
      content: '',
      category: name.trim(),
      enabled: false,
      priority: prompts.length + 1,
      createdAt: new Date().toISOString()
    }

    savePrompts([...prompts, newPrompt])
    setExpandedCategories(prev => ({ ...prev, [name.trim()]: true }))
    setSelectedCategory(name.trim())
    toast.success('Category created!')
  }

  const handleExport = (category?: string | null) => {
    const promptsToExport = category
      ? prompts.filter(p => p.category === category)
      : prompts

    const data = JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      category: category || 'all',
      prompts: promptsToExport
    }, null, 2)

    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const filename = category
      ? `prompts_${category}_${Date.now()}.json`
      : `prompts_all_${Date.now()}.json`
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    setShowExportModal(false)
    toast.success(`${promptsToExport.length} prompts exported!`)
  }

  const handleImport = (targetCategory?: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return

      const text = await file.text()
      try {
        const data = JSON.parse(text)

        // Support both old format (array) and new format (object with metadata)
        const importedPrompts = Array.isArray(data) ? data : data.prompts

        const category = targetCategory || importCategory

        const withNewIds = importedPrompts.map((p: SystemPrompt, idx: number) => ({
          ...p,
          id: `prompt_${Date.now()}_${idx}`,
          category: category, // Force target category
          priority: prompts.length + idx + 1
        }))

        savePrompts([...prompts, ...withNewIds])
        setShowImportModal(false)
        toast.success(`${withNewIds.length} prompts imported to "${category}"!`)
      } catch (error) {
        toast.error('Invalid JSON file')
      }
    }
    input.click()
  }

  // Group by category
  const promptsByCategory = prompts.reduce((acc, prompt) => {
    if (!acc[prompt.category]) acc[prompt.category] = []
    acc[prompt.category].push(prompt)
    return acc
  }, {} as Record<string, SystemPrompt[]>)

  const enabledCount = prompts.filter(p => p.enabled).length

  // Filter prompts by selected category
  const filteredPrompts = selectedCategory
    ? prompts.filter(p => p.category === selectedCategory)
    : prompts

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-950">
      {/* Sidebar - Categories */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-2 mb-3">
            <FileCode className="text-gray-700 dark:text-gray-400" size={20} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Prompts
            </h3>
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{enabledCount}</span> of {prompts.length} active
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {/* All Prompts option */}
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left mb-2",
              !selectedCategory
                ? "bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <FileCode size={14} className="text-gray-500" />
            <span className="text-sm font-medium">All Prompts</span>
            <span className="ml-auto text-xs text-gray-400">
              {enabledCount}/{prompts.length}
            </span>
          </button>

          {/* Categories */}
          {Object.entries(promptsByCategory).map(([category, categoryPrompts]) => (
            <DroppableCategory key={category} category={category}>
              <div className="mb-1">
                <div className="group flex items-center gap-1">
                  {editingCategory === category ? (
                  <div className="flex-1 flex items-center gap-1 px-2 py-1">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameCategory(category, newCategoryName)
                        if (e.key === 'Escape') {
                          setEditingCategory(null)
                          setNewCategoryName('')
                        }
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRenameCategory(category, newCategoryName)}
                      className="p-1 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
                    >
                      <Check size={14} className="text-green-600" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategory(null)
                        setNewCategoryName('')
                      }}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                    >
                      <X size={14} className="text-red-600" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-left",
                        selectedCategory === category
                          ? "bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                    >
                      <FolderOpen size={14} className="text-gray-500" />
                      <span className="text-sm font-medium truncate flex-1">
                        {category}
                      </span>
                      <span className="text-xs text-gray-400">
                        {categoryPrompts.filter(p => p.enabled).length}/{categoryPrompts.length}
                      </span>
                    </button>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                      <button
                        onClick={() => {
                          setEditingCategory(category)
                          setNewCategoryName(category)
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        title="Rename"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
              </div>
            </DroppableCategory>
          ))}

          {/* Add Category Button */}
          <button
            onClick={handleCreateCategory}
            className="w-full flex items-center gap-2 px-2 py-1.5 mt-2 text-sm text-gray-500 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/10 rounded"
          >
            <Plus size={14} />
            New Category
          </button>
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2 bg-gray-50 dark:bg-gray-900">
          <Button onClick={handleCreate} className="w-full bg-gray-900 hover:bg-gray-700 text-white dark:bg-gray-100 dark:hover:bg-gray-300 dark:text-gray-900 shadow-sm" size="sm">
            <Plus size={14} className="mr-1" /> New Prompt
          </Button>
          <div className="flex gap-2">
            <Button onClick={() => setShowImportModal(true)} variant="outline" size="sm" className="flex-1 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Upload size={14} />
            </Button>
            <Button onClick={() => setShowExportModal(true)} variant="outline" size="sm" className="flex-1 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Download size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedCategory ? `${selectedCategory} Prompts` : 'All System Prompts'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Drag to reorder • Click checkbox to activate</p>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredPrompts.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {filteredPrompts.map((prompt) => (
                  <SortablePrompt
                    key={prompt.id}
                    prompt={prompt}
                    onToggle={handleToggle}
                    onEdit={(p) => {
                      setEditingPrompt(p)
                      setShowEditor(true)
                    }}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {prompts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No prompts yet. Click "New Prompt" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal - Unified */}
      <AnimatePresence>
        {showEditor && editingPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold">Edit System Prompt</h3>
                  <button
                    onClick={() => setShowEditor(false)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1">Name</label>
                    <Input
                      value={editingPrompt.name}
                      onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                      className="h-9"
                    />
                  </div>

                  <div className="w-48">
                    <label className="block text-xs font-medium mb-1">Category</label>
                    <Input
                      value={editingPrompt.category}
                      onChange={(e) => setEditingPrompt({ ...editingPrompt, category: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Unified Editor */}
              <div className="flex-1 overflow-hidden">
                <MarkdownEditorPro
                  content={editingPrompt.content}
                  onChange={(markdown) => {
                    setEditingPrompt({ ...editingPrompt, content: markdown })
                  }}
                  placeholder="Write your system prompt here..."
                  projectId={projectId}
                  showAIImprove={true}
                  showPreview={true}
                  onSave={handleSave}
                  onCancel={() => setShowEditor(false)}
                  improvementContext="This is a system prompt for an AI assistant specializing in bug bounty and penetration testing."
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800"
            >
              <h3 className="text-xl font-semibold mb-4">Export Prompts</h3>
              <p className="text-sm text-gray-500 mb-4">
                Select which prompts to export
              </p>

              <div className="space-y-2 max-h-64 overflow-auto mb-4">
                {/* Export All */}
                <button
                  onClick={() => handleExport(null)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2">
                    <FileCode size={16} className="text-gray-500" />
                    <span className="font-medium">All Prompts</span>
                  </div>
                  <span className="text-sm text-gray-500">{prompts.length} prompts</span>
                </button>

                {/* Export by Category */}
                {Object.entries(promptsByCategory).map(([category, categoryPrompts]) => (
                  <button
                    key={category}
                    onClick={() => handleExport(category)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen size={16} className="text-gray-500" />
                      <span className="font-medium">{category}</span>
                    </div>
                    <span className="text-sm text-gray-500">{categoryPrompts.length} prompts</span>
                  </button>
                ))}
              </div>

              <Button onClick={() => setShowExportModal(false)} variant="outline" className="w-full">
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowImportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800"
            >
              <h3 className="text-xl font-semibold mb-4">Import Prompts</h3>
              <p className="text-sm text-gray-500 mb-4">
                Select target category for imported prompts
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Import to category:</label>
                <select
                  value={importCategory}
                  onChange={(e) => setImportCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  {Object.keys(promptsByCategory).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                  <option value="Custom">Custom</option>
                  <option value="Imported">Imported</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setShowImportModal(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={() => handleImport()} className="flex-1 bg-gray-900 hover:bg-gray-700 text-white dark:bg-gray-100 dark:hover:bg-gray-300 dark:text-gray-900 shadow-sm">
                  <Upload size={14} className="mr-2" />
                  Choose File
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
