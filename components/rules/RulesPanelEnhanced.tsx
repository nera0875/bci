'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Edit2, Trash2, Globe, Folder, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
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
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

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
}

interface MemoryNode {
  id: string
  name: string
  type: string
  icon?: string
  parent_id?: string | null
}

interface RulesPanelEnhancedProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

// Triggers prédéfinis
const TRIGGER_OPTIONS = [
  { value: '*', label: 'Always (*)' },
  { value: 'authentication', label: 'Authentication' },
  { value: 'api', label: 'API Testing' },
  { value: 'business-logic', label: 'Business Logic' },
  { value: 'validation', label: 'Input Validation' },
  { value: 'database', label: 'Database' },
  { value: 'access', label: 'Access Control' }
]

export default function RulesPanelEnhanced({
  projectId,
  isOpen,
  onClose
}: RulesPanelEnhancedProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [folders, setFolders] = useState<MemoryNode[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    trigger: '*',
    action: '',
    priority: 1,
    enabled: true,
    target_folder_id: null as string | null
  })

  useEffect(() => {
    if (isOpen) {
      loadRules()
      loadFolders()
    }
  }, [isOpen, projectId])

  const loadRules = async () => {
    setLoading(true)

    // Load rules with folder names
    const { data: rulesData, error: rulesError } = await supabase
      .from('rules')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: false })

    if (rulesData && !rulesError) {
      // Load folder names for rules with target_folder_id
      const folderIds = [...new Set(rulesData.filter(r => r.target_folder_id).map(r => r.target_folder_id))]

      if (folderIds.length > 0) {
        const { data: foldersData } = await supabase
          .from('memory_nodes')
          .select('id, name, icon')
          .in('id', folderIds)

        // Enhance rules with folder names
        const folderMap = new Map(foldersData?.map(f => [f.id, f]) || [])
        const enhancedRules = rulesData.map(rule => ({
          ...rule,
          folderName: rule.target_folder_id ? folderMap.get(rule.target_folder_id)?.name : null,
          folderIcon: rule.target_folder_id ? folderMap.get(rule.target_folder_id)?.icon : null
        }))

        setRules(enhancedRules)
      } else {
        setRules(rulesData)
      }
    }

    setLoading(false)
  }

  const loadFolders = async () => {
    const { data } = await supabase
      .from('memory_nodes')
      .select('id, name, type, icon, parent_id')
      .eq('project_id', projectId)
      .eq('type', 'folder')
      .order('name')

    if (data) {
      setFolders(data)
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
      } else {
        toast.error('Failed to update rule')
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
      } else {
        toast.error('Failed to create rule')
      }
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
      priority: 1,
      enabled: true,
      target_folder_id: null
    })
    setShowEditor(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">Rules - AI Instructions</h2>
            <p className="text-sm text-gray-500 mt-1">
              Conditions and behaviors injected into Claude's prompt
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Rules List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4">
              <Button
                onClick={() => setShowEditor(true)}
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                New Rule
              </Button>
            </div>

            {loading ? (
              <div className="text-center text-gray-500 py-8">Loading rules...</div>
            ) : rules.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No rules defined yet</p>
                <p className="text-sm mt-2">Create your first rule to customize AI behavior</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className={cn(
                      "border rounded-lg p-4 transition-colors",
                      rule.enabled ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900 opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{rule.name}</h3>
                          {rule.target_folder_id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                              <Folder size={10} />
                              {(rule as any).folderName || 'Folder'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs">
                              <Globe size={10} />
                              Global
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>Trigger: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{rule.trigger}</code></span>
                          <span>Priority: {rule.priority}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                      <p className="line-clamp-2">{rule.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rule Editor */}
          {showEditor && (
            <div className="w-96 border-l p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
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

              <div className="space-y-4">
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
                      <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
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

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={saveRule}
                    className="flex-1"
                  >
                    {editingRule ? 'Update' : 'Create'} Rule
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}