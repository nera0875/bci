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
function SortableRule({ rule, isChecked, onToggle, onCheck, onEdit, onDelete, onDuplicate }: {
  rule: Rule
  isChecked: boolean
  onToggle: (id: string) => void
  onCheck: (e: React.MouseEvent) => void
  onEdit: (rule: Rule) => void
  onDelete: (id: string) => void
  onDuplicate: (rule: Rule) => void
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
        onClick={() => onToggle(rule.id)}
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
          <span className="text-lg">{rule.icon || '🎯'}</span>
          <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {rule.name}
          </span>
        </div>

        {/* Preview simplifié des instructions */}
        <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
          {(rule.action_instructions || rule.description || 'No instructions configured')
            .replace(/^#+\s*/gm, '') // Enlever les markdown headers
            .replace(/\*\*/g, '') // Enlever le bold
            .split('\n')
            .filter(line => line.trim().length > 10) // Garder que les lignes avec du contenu
            .slice(0, 2) // Prendre les 2 premières lignes
            .join(' ')
            .substring(0, 150)}...
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(rule)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title="Edit"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onDuplicate(rule)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title="Duplicate"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={() => onDelete(rule.id)}
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Load categories from Supabase (rule_categories table)
  useEffect(() => {
    loadCategories()
  }, [projectId])

  const loadCategories = async () => {
    try {
      const response = await fetch(`/api/rules/categories?projectId=${projectId}`)
      const { categories: supabaseCategories } = await response.json()

      if (supabaseCategories && supabaseCategories.length > 0) {
        // Convert Supabase format to component format (include id for deletion)
        const formatted = supabaseCategories.map((cat: any) => ({
          id: cat.id,  // UUID for API calls
          value: cat.key,
          label: cat.label,
          icon: cat.icon_name || cat.icon || 'Shield', // ✅ Use icon_name from DB
          color: cat.icon_color || '#6b7280' // ✅ Use icon_color from DB
        }))
        setCategories(formatted)
      }
    } catch (error) {
      console.error('Error loading rule categories:', error)
    }
  }

  const handleSaveCategories = async (newCategories: typeof categories) => {
    try {
      // ℹ️ CategoryManager fait déjà les appels API individuels (POST/PUT/DELETE)
      // Ici on recharge juste depuis la DB pour synchroniser
      setShowCategoryManager(false)
      await loadCategories() // Reload from DB
      toast.success('Catégories sauvegardées !')
    } catch (error) {
      console.error('Error reloading categories:', error)
      toast.error('Erreur lors du rechargement')
    }
  }

  useEffect(() => {
    loadRules()
  }, [projectId])

  const loadRules = async () => {
    try {
      setLoading(true)
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
      toast.error('Erreur chargement rules')
    } finally {
      setLoading(false)
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
            icon: ruleData.icon || '🎯',
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
                </div>

                {/* Category Rules */}
                {expandedCategories.has('uncategorized') && (
                  <div className="p-4 space-y-2 bg-white dark:bg-gray-900">
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
                  </div>

                  {/* Category Rules */}
                  {isExpanded && (
                    <div className="p-4 space-y-2 bg-white dark:bg-gray-900">
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
