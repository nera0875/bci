'use client'

import { useState, useEffect } from 'react'
import {
  Shield, Plus, Trash2, Edit2, Copy, ChevronRight, ChevronDown,
  FileText, GripVertical, Check, X, Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { PlaybookBuilderV2 } from '@/components/rules/PlaybookBuilderV2'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Rule {
  id: string
  name: string
  description?: string
  enabled: boolean
  category?: string
  trigger_type?: string
  trigger_config?: any
  target_folders?: string[]
  action_type?: string
  action_config?: any
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
        isOver && "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400 dark:ring-blue-500 rounded"
      )}
    >
      {children}
    </div>
  )
}

// Sortable rule item
function SortableRule({ rule, onToggle, onEdit, onDelete, onDuplicate }: {
  rule: Rule
  onToggle: (id: string) => void
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
        "hover:border-blue-300 dark:hover:border-blue-600 transition-all",
        rule.enabled && "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/20"
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
        onClick={() => onToggle(rule.id)}
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
          rule.enabled
            ? "bg-blue-500 border-blue-500"
            : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
        )}
      >
        {rule.enabled && <Check size={14} className="text-white" />}
      </button>

      {/* Priority badge */}
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400">
        {rule.priority || 0}
      </div>

      {/* Name & WHEN/THEN preview */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={14} className="text-gray-400 flex-shrink-0" />
          <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {rule.name}
          </span>
        </div>
        <div className="text-xs space-y-0.5">
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600 dark:text-blue-400 uppercase min-w-[45px]">WHEN</span>
            <span className="text-gray-600 dark:text-gray-400 truncate">
              {rule.trigger_type === 'context' && `Message contains: ${rule.trigger_config?.keywords?.join(', ') || 'keywords'}`}
              {rule.trigger_type === 'endpoint' && `Endpoint: ${rule.trigger_config?.url_pattern || 'pattern'}`}
              {!rule.trigger_type && <span className="italic">Not configured</span>}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-green-600 dark:text-green-400 uppercase min-w-[45px]">THEN</span>
            <span className="text-gray-600 dark:text-gray-400 truncate">
              {rule.action_type === 'store' && 'Store result'}
              {rule.action_type === 'extract' && `Extract ${rule.action_config?.parameter || 'data'}`}
              {!rule.action_type && <span className="italic">Not configured</span>}
            </span>
          </div>
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']))

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const categories = [
    { value: 'authentication', label: 'Authentication', icon: '🔐', color: 'blue' },
    { value: 'api', label: 'API', icon: '🔌', color: 'green' },
    { value: 'business-logic', label: 'Business Logic', icon: '🧠', color: 'purple' },
    { value: 'vulnerabilities', label: 'Vulnerabilities', icon: '🐛', color: 'red' },
    { value: 'custom', label: 'Custom', icon: '⚙️', color: 'gray' }
  ]

  useEffect(() => {
    loadRules()
  }, [projectId])

  const loadRules = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .eq('project_id', projectId)
        .order('priority', { ascending: true })

      if (error) throw error
      setRules(data || [])
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
          category: rule.category,
          trigger_type: rule.trigger_type,
          trigger_config: rule.trigger_config,
          target_folders: rule.target_folders,
          action_type: rule.action_type,
          action_config: rule.action_config,
          enabled: false,
          priority: (rule.priority || 0) + 1
        })

      if (error) throw error
      toast.success('Rule dupliquée !')
      await loadRules()
    } catch (error) {
      console.error('Error duplicating rule:', error)
      toast.error('Erreur duplication')
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
            category: ruleData.category,
            trigger_type: ruleData.trigger_type,
            trigger_config: ruleData.trigger_config,
            target_folders: ruleData.target_folders,
            action_type: ruleData.action_type,
            action_config: ruleData.action_config,
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
            category: ruleData.category,
            trigger_type: ruleData.trigger_type,
            trigger_config: ruleData.trigger_config,
            target_folders: ruleData.target_folders,
            action_type: ruleData.action_type,
            action_config: ruleData.action_config,
            enabled: false,
            priority: rules.length + 1
          })

        if (error) throw error
        toast.success('Rule créée !')
      }

      setShowBuilder(false)
      setEditingRule(null)
      await loadRules()
    } catch (error) {
      console.error('Error saving rule:', error)
      toast.error('Erreur sauvegarde rule')
    }
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (!over) return

    // Si drop sur une catégorie
    if (over.id.startsWith('category-')) {
      const targetCategory = over.id.replace('category-', '')
      const rule = rules.find(r => r.id === active.id)

      if (rule && rule.category !== targetCategory) {
        supabase
          .from('rules')
          .update({ category: targetCategory })
          .eq('id', rule.id)
          .then(() => {
            toast.success(`Rule déplacée vers ${targetCategory}`)
            loadRules()
          })
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
    acc[cat.value] = filteredRules.filter(r => r.category === cat.value)
    return acc
  }, {} as Record<string, Rule[]>)

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
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🛡️ Rules & Playbooks
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {filteredRules.length} rules • {filteredRules.filter(r => r.enabled).length} active
              </p>
            </div>

            <Button
              onClick={() => { setEditingRule(null); setShowBuilder(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus size={16} className="mr-2" />
              New Rule
            </Button>
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
        </div>

        {/* Categories with rules */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {categories.map(category => {
            const categoryRules = rulesByCategory[category.value] || []
            const isExpanded = expandedCategories.has(category.value)

            return (
              <DroppableCategory key={category.value} category={category.value}>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.value)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span className="text-2xl">{category.icon}</span>
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
                              onToggle={handleToggleEnabled}
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
            initialData={editingRule || undefined}
            onSave={handleSaveRule}
            onCancel={() => { setShowBuilder(false); setEditingRule(null); }}
          />
        )}
      </div>
    </DndContext>
  )
}
