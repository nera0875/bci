'use client'

import { useState, useEffect } from 'react'
import {
  Plus, Edit2, Trash2, Search, Filter, Globe, Folder,
  ChevronDown, Toggle, ToggleLeft, Power, Zap, Star, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface Rule {
  id: string
  project_id: string
  name: string
  trigger: string
  action: string
  priority: number
  enabled: boolean
  target_folder_id?: string | null
  created_at: string
  updated_at?: string
  // Enhanced with folder info
  folder_name?: string
  folder_icon?: string
}

interface MemoryNode {
  id: string
  name: string
  type: string
  icon?: string
  parent_id?: string | null
}

interface RulesSectionProps {
  projectId: string
}

const TRIGGER_OPTIONS = [
  { value: '*', label: 'Always (*)' },
  { value: 'authentication', label: 'Authentication' },
  { value: 'api', label: 'API Testing' },
  { value: 'business-logic', label: 'Business Logic' },
  { value: 'validation', label: 'Input Validation' },
  { value: 'database', label: 'Database' },
  { value: 'access', label: 'Access Control' }
]

const PRIORITY_COLORS = {
  5: 'text-red-600 bg-red-50 border-red-200',
  4: 'text-orange-600 bg-orange-50 border-orange-200',
  3: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  2: 'text-blue-600 bg-blue-50 border-blue-200',
  1: 'text-gray-600 bg-gray-50 border-gray-200'
}

export default function RulesSection({ projectId }: RulesSectionProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [folders, setFolders] = useState<MemoryNode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTrigger, setFilterTrigger] = useState<string>('all')
  const [filterFolder, setFilterFolder] = useState<string>('all')
  const [showEditor, setShowEditor] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    trigger: '*',
    action: '',
    priority: 3,
    enabled: true,
    target_folder_id: null as string | null
  })

  useEffect(() => {
    loadRules()
    loadFolders()
  }, [projectId])

  const loadRules = async () => {
    setLoading(true)
    try {
      const { data: rulesData, error } = await supabase
        .from('rules')
        .select('*')
        .eq('project_id', projectId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (rulesData && !error) {
        // Load folder names for rules with target_folder_id
        const folderIds = [...new Set(rulesData.filter(r => r.target_folder_id).map(r => r.target_folder_id))]

        if (folderIds.length > 0) {
          const { data: foldersData } = await supabase
            .from('memory_nodes')
            .select('id, name, icon')
            .in('id', folderIds)

          const folderMap = new Map(foldersData?.map(f => [f.id, f]) || [])
          const enhancedRules = rulesData.map(rule => ({
            ...rule,
            folder_name: rule.target_folder_id ? folderMap.get(rule.target_folder_id)?.name : null,
            folder_icon: rule.target_folder_id ? folderMap.get(rule.target_folder_id)?.icon : null
          }))

          setRules(enhancedRules)
        } else {
          setRules(rulesData)
        }
      }
    } catch (error) {
      console.error('Error loading rules:', error)
      toast.error('Failed to load rules')
    } finally {
      setLoading(false)
    }
  }

  const loadFolders = async () => {
    try {
      const { data } = await supabase
        .from('memory_nodes')
        .select('id, name, type, icon, parent_id')
        .eq('project_id', projectId)
        .eq('type', 'folder')
        .order('name')

      if (data) {
        setFolders(data)
      }
    } catch (error) {
      console.error('Error loading folders:', error)
    }
  }

  const saveRule = async () => {
    if (!formData.name.trim() || !formData.action.trim()) {
      toast.error('Name and Action are required')
      return
    }

    const ruleData = {
      project_id: projectId,
      name: formData.name.trim(),
      trigger: formData.trigger,
      action: formData.action.trim(),
      priority: formData.priority,
      enabled: formData.enabled,
      target_folder_id: formData.target_folder_id
    }

    try {
      if (editingRule) {
        // Update existing rule
        const { error } = await supabase
          .from('rules')
          .update(ruleData)
          .eq('id', editingRule.id)

        if (!error) {
          toast.success('Rule updated')
          loadRules()
          resetForm()
        }
      } else {
        // Create new rule
        const { error } = await supabase
          .from('rules')
          .insert(ruleData)

        if (!error) {
          toast.success('Rule created')
          loadRules()
          resetForm()
        }
      }
    } catch (error) {
      toast.error('Failed to save rule')
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Delete this rule?')) return

    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', ruleId)

    if (!error) {
      toast.success('Rule deleted')
      loadRules()
    } else {
      toast.error('Failed to delete rule')
    }
  }

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('rules')
      .update({ enabled })
      .eq('id', ruleId)

    if (!error) {
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled } : r))
      toast.success(enabled ? 'Rule enabled' : 'Rule disabled')
    }
  }

  const editRule = (rule: Rule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      trigger: rule.trigger,
      action: rule.action,
      priority: rule.priority,
      enabled: rule.enabled,
      target_folder_id: rule.target_folder_id || null
    })
    setShowEditor(true)
  }

  const resetForm = () => {
    setEditingRule(null)
    setFormData({
      name: '',
      trigger: '*',
      action: '',
      priority: 3,
      enabled: true,
      target_folder_id: null
    })
    setShowEditor(false)
  }

  // Filter rules
  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rule.action.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTrigger = filterTrigger === 'all' || rule.trigger === filterTrigger
    const matchesFolder = filterFolder === 'all' ||
                          (filterFolder === 'global' && !rule.target_folder_id) ||
                          rule.target_folder_id === filterFolder

    return matchesSearch && matchesTrigger && matchesFolder
  })

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">Rules Management</h2>
              <p className="text-sm text-gray-500">AI behavior instructions and conditions</p>
            </div>
            <Button onClick={() => setShowEditor(true)}>
              <Plus size={16} className="mr-2" />
              New Rule
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <Input
                placeholder="Search rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>

            <Select value={filterTrigger} onValueChange={setFilterTrigger}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Triggers</SelectItem>
                {TRIGGER_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterFolder} onValueChange={setFilterFolder}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scopes</SelectItem>
                <SelectItem value="global">
                  <div className="flex items-center gap-2">
                    <Globe size={14} />
                    Global
                  </div>
                </SelectItem>
                {folders.map(folder => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <div className="flex items-center gap-2">
                      <span>{folder.icon || '📁'}</span>
                      {folder.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Rules List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <AnimatePresence>
            {filteredRules.map((rule, index) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "bg-white dark:bg-gray-900 rounded-lg border p-4 transition-all",
                  rule.enabled
                    ? "border-gray-200 dark:border-gray-700"
                    : "border-gray-100 dark:border-gray-800 opacity-60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {rule.name}
                      </h3>

                      {/* Scope Badge */}
                      {rule.target_folder_id ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                          <span>{rule.folder_icon || '📁'}</span>
                          {rule.folder_name || 'Folder'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs">
                          <Globe size={10} />
                          Global
                        </span>
                      )}

                      {/* Priority Badge */}
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium border",
                        PRIORITY_COLORS[rule.priority as keyof typeof PRIORITY_COLORS]
                      )}>
                        P{rule.priority}
                      </span>

                      {/* Trigger Badge */}
                      <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                        {rule.trigger}
                      </span>
                    </div>

                    {/* Action Preview */}
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {rule.action}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => editRule(rule)}
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRule(rule.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredRules.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Zap size={48} className="mx-auto mb-4 opacity-30" />
              <p>No rules found</p>
              <p className="text-sm mt-2">Create your first rule to customize AI behavior</p>
            </div>
          )}
        </div>
      </div>

      {/* Rule Editor Sidebar */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold">
                {editingRule ? 'Edit Rule' : 'New Rule'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetForm}
              >
                <X size={16} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Rule name..."
                />
              </div>

              {/* Target */}
              <div>
                <label className="block text-sm font-medium mb-1">Apply to</label>
                <Select
                  value={formData.target_folder_id || 'global'}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    target_folder_id: value === 'global' ? null : value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      <div className="flex items-center gap-2">
                        <Globe size={14} />
                        Global (All contexts)
                      </div>
                    </SelectItem>
                    {folders.map(folder => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center gap-2">
                          <span>{folder.icon || '📁'}</span>
                          {folder.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Global rules apply everywhere, folder rules only when working in that folder
                </p>
              </div>

              {/* Trigger */}
              <div>
                <label className="block text-sm font-medium mb-1">Trigger</label>
                <Select
                  value={formData.trigger}
                  onValueChange={(value) => setFormData({ ...formData, trigger: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <Select
                  value={String(formData.priority)}
                  onValueChange={(value) => setFormData({ ...formData, priority: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 - Highest</SelectItem>
                    <SelectItem value="4">4 - High</SelectItem>
                    <SelectItem value="3">3 - Medium</SelectItem>
                    <SelectItem value="2">2 - Low</SelectItem>
                    <SelectItem value="1">1 - Lowest</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Higher priority rules override lower ones
                </p>
              </div>

              {/* Action */}
              <div>
                <label className="block text-sm font-medium mb-1">Action (Instruction)</label>
                <textarea
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  placeholder="What should the AI do when this rule triggers?&#10;&#10;Example: Always include curl command with full headers and response body"
                  className="w-full h-32 p-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Enabled */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Enabled</label>
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <Button onClick={saveRule} className="flex-1">
                {editingRule ? 'Update' : 'Create'} Rule
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}