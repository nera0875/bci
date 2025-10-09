'use client'

import { useState, useEffect } from 'react'
import {
  Shield, Plus, Trash2, Edit2, Copy, ChevronRight, ChevronDown,
  FileText, GripVertical, Check, X, Search, Settings,
  CheckSquare, Square
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { PlaybookBuilderV2 } from '@/components/rules/PlaybookBuilderV2'
import { CategoryManager } from '@/components/rules/CategoryManager'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DynamicIcon from '@/components/shared/DynamicIcon'

interface Rule {
  id: string
  name: string
  description?: string
  enabled: boolean
  icon?: string
  color?: string
  category?: string
  category_id?: string
  trigger_type?: string
  trigger_config?: any
  target_categories?: string[]
  target_tags?: string[]
  action_type?: string
  action_config?: any
  action_instructions?: string
  priority?: number
  created_at: string
}

interface RulesCompactV3Props {
  projectId: string
}

// Droppable category
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

// Sortable rule item
function SortableRule({ rule, isChecked, onToggle, onCheck, onEdit, onDelete, onDuplicate, editingInline, inlineEditValue, onStartInlineEdit, onCancelInlineEdit, onSaveInlineEdit, onInlineEditChange, onInlineKeyDown }: {
  rule: Rule
  isChecked: boolean
  onToggle: (id: string) => void
  onCheck: (e: React.MouseEvent) => void
  onEdit: (rule: Rule) => void
  onDelete: (id: string) => void
  onDuplicate: (rule: Rule) => void
  editingInline: { ruleId: string; field: 'name' | 'instructions' } | null
  inlineEditValue: string
  onStartInlineEdit: (ruleId: string, field: 'name' | 'instructions', currentValue: string) => void
  onCancelInlineEdit: () => void
  onSaveInlineEdit: () => void
  onInlineEditChange: (value: string) => void
  onInlineKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: rule.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  // Amélioration de la logique de preview
  const getPreviewText = () => {
    const rawText = rule.action_instructions || rule.description || 'No instructions configured'

    // Nettoyer le markdown
    const cleanText = rawText
      .replace(/^#+\s*/gm, '') // Enlever headers
      .replace(/\*\*/g, '')     // Enlever bold
      .replace(/\*/g, '')       // Enlever italique
      .replace(/`/g, '')        // Enlever code
      .trim()

    // Si le texte est très court (< 20 chars), l'afficher tel quel
    if (cleanText.length < 20) {
      return cleanText
    }

    // Sinon, prendre les premières lignes significatives
    const lines = cleanText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 5) // Lignes avec au moins 5 caractères

    if (lines.length === 0) {
      return cleanText.substring(0, 100)
    }

    const preview = lines.slice(0, 2).join(' ')
    return preview.length > 150 ? preview.substring(0, 150) + '...' : preview
  }

  const isEditingName = editingInline?.ruleId === rule.id && editingInline?.field === 'name'
  const isEditingInstructions = editingInline?.ruleId === rule.id && editingInline?.field === 'instructions'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
        "hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all duration-200",
        rule.enabled && "border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-950/20 shadow-sm",
        isChecked && "bg-gray-100 dark:bg-gray-800"
      )}
    >
      {/* Selection Checkbox */}
      <div
        onClick={onCheck}
        className="cursor-pointer p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all flex-shrink-0"
      >
        {isChecked ? (
          <CheckSquare size={18} className="text-gray-700 dark:text-gray-400" />
        ) : (
          <Square size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
        )}
      </div>

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
      >
        <GripVertical size={16} className="text-gray-400" />
      </div>

      {/* Enabled Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle(rule.id)
        }}
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
          rule.enabled
            ? "bg-gray-900 border-gray-900 dark:bg-gray-100 dark:border-gray-100"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
        )}
      >
        {rule.enabled && <Check size={14} className={cn(rule.enabled && "text-white dark:text-gray-900")} />}
      </button>

      {/* Priority badge */}
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400">
        {rule.priority || 0}
      </div>

      {/* Icon + Name & Instructions preview */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <DynamicIcon name={rule.icon || 'Target'} size={18} color={rule.color || '#6b7280'} />

          {/* Inline edit NAME */}
          {isEditingName ? (
            <Input
              autoFocus
              value={inlineEditValue}
              onChange={(e) => onInlineEditChange(e.target.value)}
              onKeyDown={onInlineKeyDown}
              onBlur={onSaveInlineEdit}
              className="h-6 text-sm font-medium flex-1"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation()
                onStartInlineEdit(rule.id, 'name', rule.name)
              }}
              className="font-medium text-sm text-gray-900 dark:text-white truncate cursor-text hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded"
              title="Double-clic pour éditer"
            >
              {rule.name}
            </span>
          )}
        </div>

        {/* Inline edit INSTRUCTIONS */}
        {isEditingInstructions ? (
          <textarea
            autoFocus
            value={inlineEditValue}
            onChange={(e) => onInlineEditChange(e.target.value)}
            onKeyDown={onInlineKeyDown}
            onBlur={onSaveInlineEdit}
            className="w-full text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded p-1 resize-none"
            rows={3}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation()
              const value = rule.action_instructions || rule.description || ''
              onStartInlineEdit(rule.id, 'instructions', value)
            }}
            className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 cursor-text hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded"
            title="Double-clic pour éditer"
          >
            {getPreviewText()}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(rule)
          }}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title="Full edit (icon, triggers, category...)"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate(rule)
          }}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title="Duplicate"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(rule.id)
          }}
          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
export default function RulesCompactV3({ projectId }: RulesCompactV3Props) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [categories, setCategories] = useState<Array<{ value: string; label: string; icon: string; color: string }>>([])
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set())
  const [showUncategorized, setShowUncategorized] = useState(true)

  // Quick add states
  const [quickAddCategory, setQuickAddCategory] = useState<string | null>(null)
  const [quickAddName, setQuickAddName] = useState('')
  const [quickAddInstructions, setQuickAddInstructions] = useState('')
  const [quickAddStep, setQuickAddStep] = useState<'name' | 'instructions'>('name')
  const [isCreatingQuick, setIsCreatingQuick] = useState(false)

  // Inline editing states
  const [editingInline, setEditingInline] = useState<{ ruleId: string; field: 'name' | 'instructions' } | null>(null)
  const [inlineEditValue, setInlineEditValue] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Inline editing handlers
  const startInlineEdit = (ruleId: string, field: 'name' | 'instructions', currentValue: string) => {
    setEditingInline({ ruleId, field })
    setInlineEditValue(currentValue)
  }

  const cancelInlineEdit = () => {
    setEditingInline(null)
    setInlineEditValue('')
  }

  const saveInlineEdit = async () => {
    if (!editingInline) return
    if (!inlineEditValue.trim()) {
      toast.error('La valeur ne peut pas être vide')
      return
    }

    try {
      const updateData: any = {}
      if (editingInline.field === 'name') {
        updateData.name = inlineEditValue.trim()
      } else {
        updateData.action_instructions = inlineEditValue.trim()
        updateData.description = inlineEditValue.trim()
      }

      const { error } = await supabase
        .from('rules')
        .update(updateData)
        .eq('id', editingInline.ruleId)

      if (error) throw error

      // Optimistic UI update
      setRules(rules.map(r =>
        r.id === editingInline.ruleId
          ? { ...r, ...updateData }
          : r
      ))

      toast.success('Rule mise à jour !')
      cancelInlineEdit()
    } catch (error) {
      console.error('Error updating rule:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleInlineKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      cancelInlineEdit()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveInlineEdit()
    }
    // Shift+Enter pour nouvelle ligne dans textarea
  }

  // Quick add handlers
  const handleStartQuickAdd = (categoryId: string) => {
    setQuickAddCategory(categoryId)
    setQuickAddStep('name')
    setQuickAddName('')
    setQuickAddInstructions('')
    // Auto-expand category if collapsed
    if (!expandedCategories.has(categoryId)) {
      setExpandedCategories(new Set([...expandedCategories, categoryId]))
    }
  }

  const handleQuickAddCancel = () => {
    setQuickAddCategory(null)
    setQuickAddName('')
    setQuickAddInstructions('')
    setQuickAddStep('name')
  }

  const handleQuickAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleQuickAddCancel()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleQuickAddSubmit()
    }
  }

  const handleQuickAddSubmit = async () => {
    if (quickAddStep === 'name') {
      if (!quickAddName.trim()) {
        toast.error('Le nom est requis')
        return
      }
      setQuickAddStep('instructions')
    } else {
      // Step instructions - create the rule
      if (!quickAddInstructions.trim()) {
        toast.error('Les instructions sont requises')
        return
      }

      setIsCreatingQuick(true)
      try {
        // Determine category_id (null for uncategorized)
        const categoryId = quickAddCategory === 'uncategorized' ? null : quickAddCategory

        // Find max priority for this category
        const categoryRules = categoryId === null
          ? rules.filter(r => !r.category_id)
          : rules.filter(r => r.category_id === categoryId)

        const maxPriority = categoryRules.length > 0
          ? Math.max(...categoryRules.map(r => r.priority || 0))
          : rules.length

        const { error } = await supabase
          .from('rules')
          .insert({
            project_id: projectId,
            name: quickAddName.trim(),
            description: quickAddInstructions.trim(),
            icon: 'Target',
            color: '#3b82f6',
            category_id: categoryId,
            trigger: 'always',
            action: quickAddInstructions.trim(),
            action_instructions: quickAddInstructions.trim(),
            enabled: false,
            priority: maxPriority + 1,
            trigger_type: 'always'
          })

        if (error) throw error

        toast.success('Rule créée !')
        handleQuickAddCancel()
        await loadRules()
      } catch (error) {
        console.error('Error creating rule:', error)
        toast.error('Erreur création rule')
      } finally {
        setIsCreatingQuick(false)
      }
    }
  }

  // Load categories + rules in parallel for faster loading
  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Execute both requests in parallel
      const [categoriesRes, rulesRes] = await Promise.all([
        fetch(`/api/rules/categories?projectId=${projectId}`),
        supabase
          .from('rules')
          .select(`
            *,
            rule_category:rule_categories!category_id(id, key, label, icon_name, icon_color, description)
          `)
          .eq('project_id', projectId)
          .order('priority', { ascending: true })
      ])

      // Process categories
      const { categories: supabaseCategories } = await categoriesRes.json()
      if (supabaseCategories && supabaseCategories.length > 0) {
        const formatted = supabaseCategories.map((cat: any) => ({
          id: cat.id,
          value: cat.key,
          label: cat.label,
          icon: cat.icon_name || cat.icon || 'Shield',
          color: cat.icon_color || '#6b7280'
        }))
        setCategories(formatted)
      }

      // Process rules
      if (rulesRes.error) throw rulesRes.error
      setRules((rulesRes.data as any) || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Erreur chargement rules')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch(`/api/rules/categories?projectId=${projectId}`)
      const { categories: supabaseCategories } = await response.json()

      if (supabaseCategories && supabaseCategories.length > 0) {
        const formatted = supabaseCategories.map((cat: any) => ({
          id: cat.id,
          value: cat.key,
          label: cat.label,
          icon: cat.icon_name || cat.icon || 'Shield',
          color: cat.icon_color || '#6b7280'
        }))
        setCategories(formatted)
      }
    } catch (error) {
      console.error('Error loading rule categories:', error)
    }
  }

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('rules')
        .select(`
          *,
          rule_category:rule_categories!category_id(id, key, label, icon_name, icon_color, description)
        `)
        .eq('project_id', projectId)
        .order('priority', { ascending: true })

      if (error) throw error
      setRules((data as any) || [])
    } catch (error) {
      console.error('Error loading rules:', error)
    }
  }

  const handleSaveCategories = async (newCategories: typeof categories) => {
    try {
      setShowCategoryManager(false)
      await loadCategories()
      toast.success('Catégories sauvegardées !')
    } catch (error) {
      console.error('Error reloading categories:', error)
      toast.error('Erreur lors du rechargement')
    }
  }

  const handleToggleEnabled = async (id: string) => {
    const rule = rules.find(r => r.id === id)
    if (!rule) return

    try {
      const { error } = await supabase
        .from('rules')
        .update({ enabled: !rule.enabled })
        .eq('id', id)

      if (error) throw error
      toast.success(rule.enabled ? 'Rule désactivée' : 'Rule activée')
      await loadRules()
    } catch (error) {
      console.error('Error toggling rule:', error)
      toast.error('Erreur toggle rule')
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Supprimer cette rule ?')) return

    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Rule supprimée')
      await loadRules()
    } catch (error) {
      console.error('Error deleting rule:', error)
      toast.error('Erreur suppression rule')
    }
  }

  const handleDuplicateRule = async (rule: Rule) => {
    try {
      const { error } = await supabase
        .from('rules')
        .insert({
          project_id: projectId,
          name: `${rule.name} (copy)`,
          description: rule.description,
          icon: rule.icon,
          color: rule.color,
          category: rule.category,
          category_id: (rule as any).category_id,
          trigger_type: rule.trigger_type,
          trigger_config: rule.trigger_config,
          target_categories: rule.target_categories,
          target_tags: rule.target_tags,
          action_type: rule.action_type,
          action_config: rule.action_config,
          action_instructions: rule.action_instructions,
          enabled: false,
          priority: (rule.priority || 0) + 1
        } as any)

      if (error) throw error
      toast.success('Rule dupliquée !')
      await loadRules()
    } catch (error) {
      console.error('Error duplicating rule:', error)
      toast.error('Erreur duplication')
    }
  }

  // Multi-selection functions
  const toggleRuleSelection = (ruleId: string) => {
    const newSelection = new Set(selectedRuleIds)
    if (newSelection.has(ruleId)) {
      newSelection.delete(ruleId)
    } else {
      newSelection.add(ruleId)
    }
    setSelectedRuleIds(newSelection)
  }

  const selectAllInCategory = (categoryKey: string, categoryRules: Rule[]) => {
    const newSelection = new Set(selectedRuleIds)
    const allSelected = categoryRules.every(r => newSelection.has(r.id))

    if (allSelected) {
      categoryRules.forEach(r => newSelection.delete(r.id))
    } else {
      categoryRules.forEach(r => newSelection.add(r.id))
    }
    setSelectedRuleIds(newSelection)
  }

  const clearSelection = () => {
    setSelectedRuleIds(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedRuleIds.size === 0) return
    if (!confirm(`Supprimer ${selectedRuleIds.size} rule(s) sélectionnée(s) ?`)) return

    try {
      const idsToDelete = Array.from(selectedRuleIds)

      const { error } = await supabase
        .from('rules')
        .delete()
        .in('id', idsToDelete)

      if (error) throw error

      setRules(rules.filter(r => !selectedRuleIds.has(r.id)))
      setSelectedRuleIds(new Set())
      toast.success(`${idsToDelete.length} rule(s) supprimée(s)`)
    } catch (error: any) {
      console.error('Error deleting rules:', error)
      toast.error('Erreur suppression rules')
    }
  }

  const handleSaveRule = async (ruleData: any) => {
    try {
      if (editingRule?.id) {
        const { error } = await supabase
          .from('rules')
          .update({
            name: ruleData.name,
            description: ruleData.description,
            icon: ruleData.icon,
            color: ruleData.color,
            category_id: ruleData.category_id,
            trigger: ruleData.trigger_config?.keywords?.join(', ') || 'manual',
            action: ruleData.action_instructions || ruleData.action_config?.instructions || ruleData.description || 'Execute rule',
            trigger_type: ruleData.trigger_type,
            trigger_config: ruleData.trigger_config,
            target_categories: ruleData.target_categories,
            target_tags: ruleData.target_tags,
            action_type: ruleData.action_type,
            action_config: ruleData.action_config,
            action_instructions: ruleData.action_instructions,
            enabled: ruleData.enabled
          })
          .eq('id', editingRule.id)

        if (error) throw error
        toast.success('Rule mise à jour !')
      } else {
        const { error } = await supabase
          .from('rules')
          .insert({
            project_id: projectId,
            name: ruleData.name,
            description: ruleData.description,
            icon: ruleData.icon || 'Target',
            color: ruleData.color || '#3b82f6',
            category_id: ruleData.category_id,
            trigger: ruleData.trigger_config?.keywords?.join(', ') || 'manual',
            action: ruleData.action_instructions || ruleData.action_config?.instructions || ruleData.description || 'Execute rule',
            trigger_type: ruleData.trigger_type,
            trigger_config: ruleData.trigger_config,
            target_categories: ruleData.target_categories,
            target_tags: ruleData.target_tags,
            action_type: ruleData.action_type,
            action_config: ruleData.action_config,
            action_instructions: ruleData.action_instructions,
            enabled: false,
            priority: rules.length + 1
          })

        if (error) throw error
        toast.success('Rule créée !')
      }

      setShowBuilder(false)
      setEditingRule(null)
      await loadRules()
    } catch (error: any) {
      console.error('Error saving rule:', error)
      console.error('Error details:', error.message, error.details, error.hint)
      toast.error(`Erreur sauvegarde: ${error.message || 'Unknown'}`)
    }
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (!over) return

    // Si drop sur une catégorie
    if (over.id.startsWith('category-')) {
      const targetCategoryKey = over.id.replace('category-', '')
      const rule = rules.find(r => r.id === active.id)
      const targetCategory = categories.find(c => c.value === targetCategoryKey)

      if (rule && targetCategory) {
        const targetCategoryId = (targetCategory as any).id
        if (rule.category_id !== targetCategoryId) {
          supabase
            .from('rules')
            .update({ category_id: targetCategoryId } as any)
            .eq('id', rule.id)
            .then(() => {
              toast.success(`Rule déplacée vers ${targetCategory.label}`)
              loadRules()
            })
        }
      }
      return
    }

    // Sinon, réordonnancement
    if (active.id !== over.id) {
      const oldIndex = rules.findIndex(r => r.id === active.id)
      const newIndex = rules.findIndex(r => r.id === over.id)

      const reordered = arrayMove(rules, oldIndex, newIndex)
      const updates = reordered.map((rule, index) => ({
        id: rule.id,
        priority: index + 1
      }))

      Promise.all(
        updates.map(update =>
          supabase.from('rules').update({ priority: update.priority }).eq('id', update.id)
        )
      ).then(() => {
        toast.success('Ordre mis à jour')
        loadRules()
      })
    }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const filteredRules = rules.filter(rule =>
    rule.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const rulesByCategory = categories.reduce((acc, cat) => {
    // Match by category_id (UUID) now, fallback to old category (string) for backward compat
    acc[cat.value] = filteredRules.filter(r => {
      const catId = (categories.find(c => c.value === cat.value) as any)?.id
      return r.category_id === catId || r.category === cat.value
    })
    return acc
  }, {} as Record<string, Rule[]>)

  // Rules sans catégorie
  const uncategorizedRules = filteredRules.filter(r => !r.category_id && !r.category)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="text-gray-700 dark:text-gray-400" size={24} />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Rules & Playbooks
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {filteredRules.length} rules • {filteredRules.filter(r => r.enabled).length} active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {uncategorizedRules.length > 0 && (
                <label className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors shadow-sm">
                  <input
                    type="checkbox"
                    checked={showUncategorized}
                    onChange={(e) => setShowUncategorized(e.target.checked)}
                    className="w-4 h-4 text-orange-600 bg-white dark:bg-gray-800 border-orange-300 rounded focus:ring-orange-500 cursor-pointer"
                  />
                  <FileText size={14} className="text-orange-700 dark:text-orange-400" />
                  <span className="text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    Uncategorized ({uncategorizedRules.length})
                  </span>
                </label>
              )}
              <Button
                onClick={() => setShowCategoryManager(true)}
                variant="outline"
                title="Gérer les catégories"
              >
                <Settings size={16} />
              </Button>
              <Button
                onClick={() => { setEditingRule(null); setShowBuilder(true); }}
                className="bg-gray-900 hover:bg-gray-700 text-white dark:bg-gray-100 dark:hover:bg-gray-300 dark:text-gray-900 shadow-sm"
              >
                <Plus size={16} className="mr-2" />
                New Rule
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedRuleIds.size > 0 && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-gray-700 text-white">
                  {selectedRuleIds.size} selected
                </Badge>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedRuleIds.size} rule{selectedRuleIds.size !== 1 ? 's' : ''} sélectionnée{selectedRuleIds.size !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Categories with rules */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Uncategorized section */}
          {showUncategorized && uncategorizedRules.length > 0 && (
            <DroppableCategory key="uncategorized" category="uncategorized">
              <div className="border border-orange-300 dark:border-orange-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                {/* Category Header */}
                <div className="w-full flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20">
                  <button
                    onClick={() => toggleCategory('uncategorized')}
                    className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      {expandedCategories.has('uncategorized') ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <FileText size={20} className="text-orange-600 dark:text-orange-400" />
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Uncategorized
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {uncategorizedRules.length} rule{uncategorizedRules.length > 1 ? 's' : ''} • {uncategorizedRules.filter(r => r.enabled).length} active
                        </p>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartQuickAdd('uncategorized')
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-300 bg-white dark:bg-orange-900/20 border border-orange-300 dark:border-orange-600 rounded hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
                      title="Quick add rule"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Category Rules */}
                {expandedCategories.has('uncategorized') && (
                  <div className="p-4 space-y-2 bg-white dark:bg-gray-900">
                    {/* Quick Add Inline UI for Uncategorized */}
                    {quickAddCategory === 'uncategorized' && (
                      <div className="p-3 border-2 border-dashed border-orange-400 dark:border-orange-500 rounded-lg bg-orange-50 dark:bg-orange-900/20 space-y-2">
                        {quickAddStep === 'name' ? (
                          <div>
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                              Rule Name
                            </label>
                            <Input
                              autoFocus
                              placeholder="Enter rule name..."
                              value={quickAddName}
                              onChange={(e) => setQuickAddName(e.target.value)}
                              onKeyDown={handleQuickAddKeyDown}
                              disabled={isCreatingQuick}
                              className="text-sm"
                            />
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={handleQuickAddSubmit}
                                disabled={!quickAddName.trim() || isCreatingQuick}
                                className="px-3 py-1 text-xs font-medium bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                              <button
                                onClick={handleQuickAddCancel}
                                disabled={isCreatingQuick}
                                className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                              >
                                Cancel
                              </button>
                              <span className="text-xs text-gray-500 ml-auto">Press Enter to continue</span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                              Instructions for AI
                            </label>
                            <Input
                              autoFocus
                              placeholder="Enter instructions..."
                              value={quickAddInstructions}
                              onChange={(e) => setQuickAddInstructions(e.target.value)}
                              onKeyDown={handleQuickAddKeyDown}
                              disabled={isCreatingQuick}
                              className="text-sm"
                            />
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={handleQuickAddSubmit}
                                disabled={!quickAddInstructions.trim() || isCreatingQuick}
                                className="px-3 py-1 text-xs font-medium bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {isCreatingQuick ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white dark:border-gray-900"></div>
                                    Creating...
                                  </>
                                ) : (
                                  'Create Rule'
                                )}
                              </button>
                              <button
                                onClick={() => setQuickAddStep('name')}
                                disabled={isCreatingQuick}
                                className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                              >
                                Back
                              </button>
                              <button
                                onClick={handleQuickAddCancel}
                                disabled={isCreatingQuick}
                                className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                              >
                                Cancel
                              </button>
                              <span className="text-xs text-gray-500 ml-auto">Press Enter to create</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <SortableContext items={uncategorizedRules.map(r => r.id)} strategy={verticalListSortingStrategy}>
                      {uncategorizedRules.map(rule => (
                        <SortableRule
                          key={rule.id}
                          rule={rule}
                          isChecked={selectedRuleIds.has(rule.id)}
                          onToggle={handleToggleEnabled}
                          onCheck={(e) => {
                            e.stopPropagation()
                            toggleRuleSelection(rule.id)
                          }}
                          onEdit={(r) => { setEditingRule(r); setShowBuilder(true); }}
                          onDelete={handleDeleteRule}
                          onDuplicate={handleDuplicateRule}
                          editingInline={editingInline}
                          inlineEditValue={inlineEditValue}
                          onStartInlineEdit={startInlineEdit}
                          onCancelInlineEdit={cancelInlineEdit}
                          onSaveInlineEdit={saveInlineEdit}
                          onInlineEditChange={(value) => setInlineEditValue(value)}
                          onInlineKeyDown={handleInlineKeyDown}
                        />
                      ))}
                    </SortableContext>
                  </div>
                )}
              </div>
            </DroppableCategory>
          )}

          {categories.map(category => {
            const categoryRules = rulesByCategory[category.value] || []
            const isExpanded = expandedCategories.has(category.value)
            const allSelected = categoryRules.length > 0 && categoryRules.every(r => selectedRuleIds.has(r.id))

            return (
              <DroppableCategory key={category.value} category={category.value}>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                  {/* Category Header */}
                  <div className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800">
                    <button
                      onClick={() => toggleCategory(category.value)}
                      className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        <DynamicIcon
                          name={category.icon}
                          size={20}
                          color={category.color}
                        />
                        <div className="text-left">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {category.label}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {categoryRules.length} rule{categoryRules.length > 1 ? 's' : ''} • {categoryRules.filter(r => r.enabled).length} active
                          </p>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      {categoryRules.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            selectAllInCategory(category.value, categoryRules)
                          }}
                          className="text-xs text-gray-700 dark:text-gray-400 hover:underline px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartQuickAdd((category as any).id)
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Quick add rule"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Category Rules */}
                  {isExpanded && (
                    <div className="p-4 space-y-2 bg-white dark:bg-gray-900">
                      {/* Quick Add Inline UI */}
                      {quickAddCategory === (category as any).id && (
                        <div className="p-3 border-2 border-dashed border-gray-400 dark:border-gray-500 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-2">
                          {quickAddStep === 'name' ? (
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                Rule Name
                              </label>
                              <Input
                                autoFocus
                                placeholder="Enter rule name..."
                                value={quickAddName}
                                onChange={(e) => setQuickAddName(e.target.value)}
                                onKeyDown={handleQuickAddKeyDown}
                                disabled={isCreatingQuick}
                                className="text-sm"
                              />
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={handleQuickAddSubmit}
                                  disabled={!quickAddName.trim() || isCreatingQuick}
                                  className="px-3 py-1 text-xs font-medium bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Next
                                </button>
                                <button
                                  onClick={handleQuickAddCancel}
                                  disabled={isCreatingQuick}
                                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                >
                                  Cancel
                                </button>
                                <span className="text-xs text-gray-500 ml-auto">Press Enter to continue</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                Instructions for AI
                              </label>
                              <Input
                                autoFocus
                                placeholder="Enter instructions..."
                                value={quickAddInstructions}
                                onChange={(e) => setQuickAddInstructions(e.target.value)}
                                onKeyDown={handleQuickAddKeyDown}
                                disabled={isCreatingQuick}
                                className="text-sm"
                              />
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={handleQuickAddSubmit}
                                  disabled={!quickAddInstructions.trim() || isCreatingQuick}
                                  className="px-3 py-1 text-xs font-medium bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                  {isCreatingQuick ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white dark:border-gray-900"></div>
                                      Creating...
                                    </>
                                  ) : (
                                    'Create Rule'
                                  )}
                                </button>
                                <button
                                  onClick={() => setQuickAddStep('name')}
                                  disabled={isCreatingQuick}
                                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                >
                                  Back
                                </button>
                                <button
                                  onClick={handleQuickAddCancel}
                                  disabled={isCreatingQuick}
                                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                >
                                  Cancel
                                </button>
                                <span className="text-xs text-gray-500 ml-auto">Press Enter to create</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {categoryRules.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          No rules in this category yet
                        </div>
                      ) : (
                        <SortableContext items={categoryRules.map(r => r.id)} strategy={verticalListSortingStrategy}>
                          {categoryRules.map(rule => (
                            <SortableRule
                              key={rule.id}
                              rule={rule}
                              isChecked={selectedRuleIds.has(rule.id)}
                              onToggle={handleToggleEnabled}
                              onCheck={(e) => {
                                e.stopPropagation()
                                toggleRuleSelection(rule.id)
                              }}
                              onEdit={(r) => { setEditingRule(r); setShowBuilder(true); }}
                              onDelete={handleDeleteRule}
                              onDuplicate={handleDuplicateRule}
                              editingInline={editingInline}
                              inlineEditValue={inlineEditValue}
                              onStartInlineEdit={startInlineEdit}
                              onCancelInlineEdit={cancelInlineEdit}
                              onSaveInlineEdit={saveInlineEdit}
                              onInlineEditChange={(value) => setInlineEditValue(value)}
                              onInlineKeyDown={handleInlineKeyDown}
                            />
                          ))}
                        </SortableContext>
                      )}
                    </div>
                  )}
                </div>
              </DroppableCategory>
            )
          })}
        </div>

        {/* Builder Modal */}
        {showBuilder && (
          <PlaybookBuilderV2
            projectId={projectId}
            initialData={(editingRule as any) || undefined}
            onSave={handleSaveRule}
            onCancel={() => { setShowBuilder(false); setEditingRule(null); }}
          />
        )}

        {/* Category Manager Modal */}
        {showCategoryManager && (
          <CategoryManager
            categories={categories}
            onSave={handleSaveCategories}
            onCancel={() => setShowCategoryManager(false)}
            projectId={projectId}
          />
        )}
      </div>
    </DndContext>
  )
}
