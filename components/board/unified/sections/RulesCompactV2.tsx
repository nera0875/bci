'use client'

import { useState, useEffect } from 'react'
import { Shield, Plus, Edit2, Trash2, Copy, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlaybookBuilderV2 } from '@/components/rules/PlaybookBuilderV2'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
  metadata?: any
  created_at: string
}

interface RulesCompactV2Props {
  projectId: string
}

export default function RulesCompactV2({ projectId }: RulesCompactV2Props) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

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
        .order('created_at', { ascending: false })

      if (error) throw error
      setRules(data || [])
    } catch (error) {
      console.error('Error loading rules:', error)
      toast.error('Erreur chargement rules')
    } finally {
      setLoading(false)
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
          trigger: JSON.stringify(rule.trigger_config),
          action: JSON.stringify(rule.action_config)
        })

      if (error) throw error
      toast.success('Playbook dupliqué !')
      await loadRules()
    } catch (error) {
      console.error('Error duplicating rule:', error)
      toast.error('Erreur duplication')
    }
  }

  const handleSaveRule = async (ruleData: any) => {
    try {
      if (editingRule?.id) {
        // Update existing
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
        // Create new
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
            // Anciennes colonnes pour compatibilité
            trigger: JSON.stringify(ruleData.trigger_config),
            action: JSON.stringify(ruleData.action_config)
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

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('rules')
        .update({ enabled })
        .eq('id', id)

      if (error) throw error
      toast.success(enabled ? 'Rule activée' : 'Rule désactivée')
      await loadRules()
    } catch (error) {
      console.error('Error toggling rule:', error)
      toast.error('Erreur toggle rule')
    }
  }

  const categories = [
    { value: 'authentication', label: 'Authentication', icon: '🔐', color: 'blue' },
    { value: 'api', label: 'API', icon: '🔌', color: 'green' },
    { value: 'business-logic', label: 'Business Logic', icon: '🧠', color: 'purple' },
    { value: 'vulnerabilities', label: 'Vulnerabilities', icon: '🐛', color: 'red' },
    { value: 'custom', label: 'Custom', icon: '⚙️', color: 'gray' }
  ]

  // Toggle all rules in a category
  const handleToggleCategoryFocus = async (category: string, enabled: boolean) => {
    const categoryRules = rules.filter(r => r.category === category)

    try {
      await Promise.all(
        categoryRules.map(rule =>
          supabase.from('rules').update({ enabled }).eq('id', rule.id)
        )
      )
      toast.success(`${category} ${enabled ? 'activée' : 'désactivée'}`)
      await loadRules()
    } catch (error) {
      console.error('Error toggling category:', error)
      toast.error('Erreur toggle catégorie')
    }
  }

  // Get unique categories from rules
  const uniqueCategories = Array.from(new Set(rules.map(r => r.category).filter(Boolean)))

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || rule.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              🛡️ Rules & Playbooks
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filteredRules.length} playbook{filteredRules.length > 1 ? 's' : ''} • {filteredRules.filter(r => r.enabled).length} active
            </p>
          </div>

          <Button
            onClick={() => { setEditingRule(null); setShowBuilder(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={16} className="mr-2" />
            New Playbook
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center gap-2 px-6 py-3 overflow-x-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              categoryFilter === 'all'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            📋 All
          </button>
          {categories.map(cat => {
            const categoryRules = rules.filter(r => r.category === cat.value)
            const allEnabled = categoryRules.length > 0 && categoryRules.every(r => r.enabled)

            return (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2',
                  categoryFilter === cat.value
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {cat.icon} {cat.label}
                {categoryRules.length > 0 && (
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {categoryRules.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search playbooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Focus Toggle (only when specific category selected) */}
      {categoryFilter !== 'all' && filteredRules.length > 0 && (
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Category Focus: {categories.find(c => c.value === categoryFilter)?.icon} {categories.find(c => c.value === categoryFilter)?.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filteredRules.filter(r => r.enabled).length}/{filteredRules.length} enabled
              </span>
              <Switch
                checked={filteredRules.length > 0 && filteredRules.every(r => r.enabled)}
                onCheckedChange={(checked) => handleToggleCategoryFocus(categoryFilter, checked)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredRules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No playbooks found' : 'No playbooks yet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
              {searchQuery
                ? 'Try adjusting your search or filter'
                : 'Create your first playbook to automate actions based on triggers'}
            </p>
            {!searchQuery && (
              <Button onClick={() => { setEditingRule(null); setShowBuilder(true); }}>
                <Plus size={16} className="mr-2" />
                Create Playbook
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRules.map(rule => (
              <div
                key={rule.id}
                className={cn(
                  "group rounded-lg border-2 transition-all p-4",
                  rule.enabled
                    ? "bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800 shadow-sm"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60"
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      rule.enabled ? "bg-green-500" : "bg-gray-400"
                    )} />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {rule.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => handleToggleEnabled(rule.id, checked)}
                    />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingRule(rule); setShowBuilder(true); }}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateRule(rule)}
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* WHEN → THEN */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider min-w-[60px]">
                      WHEN
                    </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      {rule.trigger_type === 'endpoint' && `API endpoint matches ${rule.trigger_config?.url_pattern || 'pattern'}`}
                      {rule.trigger_type === 'context' && `Message contains: ${rule.trigger_config?.keywords?.join(', ') || 'keywords'}`}
                      {rule.trigger_type === 'pattern' && `Pattern detected`}
                      {rule.trigger_type === 'manual' && `Triggered manually`}
                      {!rule.trigger_type && <span className="text-gray-400 italic">No trigger configured</span>}
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider min-w-[60px]">
                      THEN
                    </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      {rule.action_type === 'extract' && `Extract ${rule.action_config?.parameter || 'data'}`}
                      {rule.action_type === 'test' && `Run ${rule.action_config?.test_type || 'security'} test`}
                      {rule.action_type === 'store' && 'Store result in memory'}
                      {rule.action_type === 'analyze' && 'Analyze response'}
                      {!rule.action_type && <span className="text-gray-400 italic">No action configured</span>}
                    </p>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="flex items-center gap-2 flex-wrap">
                  {rule.target_folders && rule.target_folders.length > 0 && (
                    <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                      📂 {rule.target_folders.join(', ')}
                    </span>
                  )}
                  {rule.description && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                      {rule.description}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
    )
  }
