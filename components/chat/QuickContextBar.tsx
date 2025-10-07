'use client'

import React from 'react'
import { Sliders, Shield, ChevronDown, ChevronRight, GripVertical, Eye, Edit2, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PlaybookBuilderV2 } from '@/components/rules/PlaybookBuilderV2'

interface QuickContextBarProps {
  currentStyle: string
  onStyleChange: (style: string) => void
  onContextSelect?: (context: string) => void
  projectId: string
  onCustomStylesChange?: (styles: any[]) => void
}

// Composant Rule sortable avec switch + actions
function SortableRule({
  rule,
  onToggle,
  onView,
  onEdit,
  onDelete
}: {
  rule: any
  onToggle: (id: string, enabled: boolean) => void
  onView: (rule: any) => void
  onEdit: (rule: any) => void
  onDelete: (id: string) => void
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
      className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 group"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical size={14} className="text-gray-400" />
      </div>

      <span className="text-sm">{rule.icon || '🎯'}</span>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-900 truncate">{rule.name}</div>
        {rule.description && (
          <div className="text-[10px] text-gray-500 truncate">{rule.description}</div>
        )}
      </div>

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onView(rule)
          }}
          className="p-1 hover:bg-blue-100 rounded"
          title="Voir détails"
        >
          <Eye size={12} className="text-blue-600" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(rule)
          }}
          className="p-1 hover:bg-orange-100 rounded"
          title="Éditer"
        >
          <Edit2 size={12} className="text-orange-600" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(rule.id)
          }}
          className="p-1 hover:bg-red-100 rounded"
          title="Supprimer"
        >
          <Trash2 size={12} className="text-red-600" />
        </button>
      </div>

      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={rule.enabled}
          onChange={(e) => {
            e.stopPropagation()
            onToggle(rule.id, rule.enabled)
          }}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  )
}

export function QuickContextBar({ currentStyle, onStyleChange, onContextSelect, projectId, onCustomStylesChange }: QuickContextBarProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [rules, setRules] = React.useState<any[]>([])
  const [categories, setCategories] = React.useState<any[]>([])
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set())
  const [viewingRule, setViewingRule] = React.useState<any | null>(null)
  const [editingRule, setEditingRule] = React.useState<any | null>(null)
  const [showBuilder, setShowBuilder] = React.useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Charger rules et categories au montage
  React.useEffect(() => {
    loadRules()
    loadCategories()
  }, [projectId])

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('rules')
        .select(`
          *,
          rule_category:rule_categories!category_id(id, key, label, icon, description)
        `)
        .eq('project_id', projectId)
        .order('priority', { ascending: true })

      if (error) {
        console.error('❌ Error loading rules:', error)
        return
      }

      setRules(data || [])
      console.log('✅ Loaded', data?.length || 0, 'rules from Supabase')
    } catch (err) {
      console.error('❌ Error loading rules:', err)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch(`/api/rules/categories?projectId=${projectId}`)
      const { categories: cats } = await response.json()
      setCategories(cats || [])
    } catch (err) {
      console.error('❌ Error loading categories:', err)
    }
  }

  const toggleRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('rules')
        .update({ enabled: !currentEnabled })
        .eq('id', ruleId)

      if (error) throw error

      // Recharger
      await loadRules()
      toast.success(!currentEnabled ? '✅ Rule activée' : '⏸️ Rule désactivée')
    } catch (err) {
      console.error('Error toggling rule:', err)
      toast.error('Erreur lors du toggle')
    }
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = rules.findIndex(r => r.id === active.id)
    const newIndex = rules.findIndex(r => r.id === over.id)

    const newRules = arrayMove(rules, oldIndex, newIndex)
    setRules(newRules)

    // Update priorities in database
    try {
      for (let i = 0; i < newRules.length; i++) {
        await supabase
          .from('rules')
          .update({ priority: i + 1 })
          .eq('id', newRules[i].id)
      }
      toast.success('Ordre mis à jour')
    } catch (err) {
      console.error('Error updating priorities:', err)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const toggleCategory = (categoryKey: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey)
    } else {
      newExpanded.add(categoryKey)
    }
    setExpandedCategories(newExpanded)
  }

  // Grouper rules par catégorie
  const groupedRules = React.useMemo(() => {
    const grouped: Record<string, any[]> = {}

    rules.forEach(rule => {
      const categoryKey = rule.rule_category?.key || rule.category || 'uncategorized'
      if (!grouped[categoryKey]) {
        grouped[categoryKey] = []
      }
      grouped[categoryKey].push(rule)
    })

    return grouped
  }, [rules])

  // Handlers pour les actions
  const handleViewRule = (rule: any) => {
    setViewingRule(rule)
  }

  const handleEditRule = (rule: any) => {
    setEditingRule(rule)
    setShowBuilder(true)
    setViewingRule(null) // Fermer le modal de détails si ouvert
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Supprimer cette rule ?')) return

    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', ruleId)

      if (error) throw error

      await loadRules()
      toast.success('Rule supprimée !')
    } catch (err) {
      console.error('Error deleting rule:', err)
      toast.error('Erreur lors de la suppression')
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
      toast.error(`Erreur sauvegarde: ${error.message || 'Unknown'}`)
    }
  }


  return (
    <div className="relative">
      {/* Compact Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Paramètres de conversation"
      >
        <Sliders className="w-5 h-5 text-gray-600" />
      </button>

      {/* Panel Popup */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute bottom-full left-0 mb-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden max-h-[500px] overflow-y-auto">
            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Rules actives
                </h3>
                <span className="text-xs text-gray-500">
                  {rules.filter(r => r.enabled).length} / {rules.length}
                </span>
              </div>

              {/* Message si aucune rule */}
              {rules.length === 0 && (
                <div className="text-center py-4 px-3">
                  <p className="text-xs text-gray-500 mb-2">Aucune rule disponible</p>
                  <p className="text-xs text-gray-400">Créez-en une dans Rules & Playbooks</p>
                </div>
              )}

              {/* Rules groupées par catégories avec drag & drop */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {Object.entries(groupedRules).map(([categoryKey, categoryRules]: [string, any]) => {
                      const category = categories.find(c => c.key === categoryKey)
                      const isExpanded = expandedCategories.has(categoryKey)

                      return (
                        <div key={categoryKey} className="border border-gray-200 rounded-lg">
                          {/* Category Header */}
                          <button
                            onClick={() => toggleCategory(categoryKey)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <span className="text-sm">{category?.icon || '📁'}</span>
                              <span className="text-xs font-medium text-gray-900">
                                {category?.label || categoryKey}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({categoryRules.filter((r: any) => r.enabled).length}/{categoryRules.length})
                              </span>
                            </div>
                          </button>

                          {/* Rules in Category */}
                          {isExpanded && (
                            <div className="p-2 space-y-1">
                              {categoryRules.map((rule: any) => (
                                <SortableRule
                                  key={rule.id}
                                  rule={rule}
                                  onToggle={toggleRule}
                                  onView={handleViewRule}
                                  onEdit={handleEditRule}
                                  onDelete={handleDeleteRule}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </>
      )}

      {/* Modal détails rule */}
      {viewingRule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{viewingRule.icon || '🎯'}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {viewingRule.name}
                  </h3>
                  {viewingRule.category && (
                    <p className="text-xs text-gray-500">
                      {categories.find(c => c.key === viewingRule.category)?.label || viewingRule.category}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewingRule(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Description */}
              {viewingRule.description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    📝 Description
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {viewingRule.description}
                  </p>
                </div>
              )}

              {/* Trigger */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  ⚡ Déclencheur
                </h4>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <div><strong>Type:</strong> {viewingRule.trigger_type || 'N/A'}</div>
                  {viewingRule.trigger_config?.keywords && (
                    <div>
                      <strong>Keywords:</strong> {viewingRule.trigger_config.keywords.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Action */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  🎬 Action
                </h4>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <div><strong>Type:</strong> {viewingRule.action_type || 'N/A'}</div>
                  {viewingRule.action_config?.instructions && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                      {viewingRule.action_config.instructions}
                    </div>
                  )}
                </div>
              </div>

              {/* Target */}
              {(viewingRule.target_categories?.length > 0 || viewingRule.target_tags?.length > 0) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    🎯 Ciblage Facts
                  </h4>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    {viewingRule.target_categories?.length > 0 && (
                      <div>
                        <strong>Catégories:</strong> {viewingRule.target_categories.join(', ')}
                      </div>
                    )}
                    {viewingRule.target_tags?.length > 0 && (
                      <div>
                        <strong>Tags:</strong> {viewingRule.target_tags.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-800">
                <div>
                  <strong>Status:</strong>{' '}
                  <span className={viewingRule.enabled ? 'text-green-600' : 'text-gray-500'}>
                    {viewingRule.enabled ? 'Activée' : 'Désactivée'}
                  </span>
                </div>
                <div>
                  <strong>Priorité:</strong> {viewingRule.priority || 0}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => {
                  handleDeleteRule(viewingRule.id)
                  setViewingRule(null)
                }}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Supprimer
              </button>
              <button
                onClick={() => {
                  handleEditRule(viewingRule)
                  setViewingRule(null)
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                Éditer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
