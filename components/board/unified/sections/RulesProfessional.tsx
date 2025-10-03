'use client'

import { useState, useEffect } from 'react'
import {
  Shield, Plus, Trash2, Edit3, Save, X, Download, Upload,
  ChevronRight, Search, Filter, Copy, FileText, Sparkles,
  CheckCircle, AlertCircle, Clock, BarChart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Rule {
  id: string
  name: string
  description: string
  condition: string
  action: string
  priority: number
  active: boolean
  category?: string
  created_at?: string
  success_rate?: number
  last_triggered?: string
  trigger_count?: number
}

interface Template {
  id: string
  name: string
  description: string
  category: string
  rules: Partial<Rule>[]
  editable?: boolean
}

export default function RulesProfessional({ projectId }: { projectId: string }) {
  const [rules, setRules] = useState<Rule[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [creatingRule, setCreatingRule] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    triggered_today: 0,
    success_rate: 0
  })

  // Default templates
  const defaultTemplates: Template[] = [
    {
      id: 'api-testing',
      name: 'API Testing',
      description: 'Rules for API vulnerability testing',
      category: 'api',
      editable: true,
      rules: [
        {
          name: 'SQL Injection Detection',
          description: 'Detect SQL injection vulnerabilities',
          condition: 'response.contains("SQL error") || response.contains("mysql_")',
          action: 'flag_vulnerability("SQL Injection", "high")',
          priority: 1,
          active: true,
          category: 'api'
        },
        {
          name: 'XSS Detection',
          description: 'Detect XSS vulnerabilities',
          condition: 'response.contains("<script") && !response.sanitized',
          action: 'flag_vulnerability("XSS", "medium")',
          priority: 2,
          active: true,
          category: 'api'
        }
      ]
    },
    {
      id: 'web-pentesting',
      name: 'Web Pentesting',
      description: 'Rules for web application testing',
      category: 'web',
      editable: true,
      rules: [
        {
          name: 'Directory Traversal',
          description: 'Detect directory traversal attempts',
          condition: 'path.includes("../") || path.includes("..\\\\\")',
          action: 'log_attempt("Directory Traversal")',
          priority: 1,
          active: true,
          category: 'web'
        }
      ]
    },
    {
      id: 'bug-bounty',
      name: 'Bug Bounty',
      description: 'Common bug bounty patterns',
      category: 'bounty',
      editable: true,
      rules: [
        {
          name: 'IDOR Check',
          description: 'Check for IDOR vulnerabilities',
          condition: 'request.user_id !== response.user_id',
          action: 'report_bug("IDOR", request.url)',
          priority: 1,
          active: true,
          category: 'bounty'
        }
      ]
    }
  ]

  useEffect(() => {
    loadRules()
    loadTemplates()
  }, [projectId])

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .eq('project_id', projectId)
        .order('priority', { ascending: true })

      if (error) throw error

      if (data) {
        setRules(data)
        calculateStats(data)
      }
    } catch (error) {
      console.error('Error loading rules:', error)
      // Use mock data for demo
      const mockRules: Rule[] = [
        {
          id: '1',
          name: 'Auto-detect SQLi',
          description: 'Automatically detect SQL injection patterns',
          condition: 'response.error && response.error.includes("SQL")',
          action: 'store_vulnerability("sqli", response)',
          priority: 1,
          active: true,
          category: 'security',
          success_rate: 85,
          last_triggered: '2 hours ago',
          trigger_count: 42
        },
        {
          id: '2',
          name: 'XSS Prevention',
          description: 'Block XSS attempts',
          condition: 'input.contains("<script")',
          action: 'block_request() && log_attempt("xss")',
          priority: 2,
          active: true,
          category: 'security',
          success_rate: 92,
          last_triggered: '1 day ago',
          trigger_count: 18
        }
      ]
      setRules(mockRules)
      calculateStats(mockRules)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    // In production, load from database
    // For now, use default templates
    setTemplates(defaultTemplates)
  }

  const calculateStats = (rulesData: Rule[]) => {
    const active = rulesData.filter(r => r.active).length
    const avgSuccessRate = rulesData.reduce((acc, r) => acc + (r.success_rate || 0), 0) / rulesData.length

    setStats({
      total: rulesData.length,
      active,
      triggered_today: Math.floor(Math.random() * 20), // Mock data
      success_rate: Math.round(avgSuccessRate)
    })
  }

  const handleSaveRule = async (rule: Rule) => {
    try {
      if (rule.id && !rule.id.startsWith('new-')) {
        // Update existing rule
        const { error } = await supabase
          .from('rules')
          .update(rule)
          .eq('id', rule.id)

        if (!error) {
          setRules(rules.map(r => r.id === rule.id ? rule : r))
        }
      } else {
        // Create new rule
        const newRule = { ...rule, id: Date.now().toString(), project_id: projectId }
        const { error } = await supabase
          .from('rules')
          .insert(newRule)

        if (!error) {
          setRules([...rules, newRule])
        }
      }
      setEditingRule(null)
      setCreatingRule(false)
    } catch (error) {
      console.error('Error saving rule:', error)
      // For demo, just update locally
      if (rule.id && !rule.id.startsWith('new-')) {
        setRules(rules.map(r => r.id === rule.id ? rule : r))
      } else {
        const newRule = { ...rule, id: Date.now().toString() }
        setRules([...rules, newRule])
      }
      setEditingRule(null)
      setCreatingRule(false)
    }
  }

  const handleDeleteRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', id)

      if (!error) {
        setRules(rules.filter(r => r.id !== id))
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
      // For demo, just delete locally
      setRules(rules.filter(r => r.id !== id))
    }
  }

  const handleToggleRule = async (id: string) => {
    const rule = rules.find(r => r.id === id)
    if (rule) {
      const updatedRule = { ...rule, active: !rule.active }
      handleSaveRule(updatedRule)
    }
  }

  const handleApplyTemplate = (template: Template) => {
    const newRules = template.rules.map(r => ({
      ...r,
      id: `new-${Date.now()}-${Math.random()}`,
      project_id: projectId
    } as Rule))
    setRules([...rules, ...newRules])
    setShowTemplates(false)
  }

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id))
  }

  const handleSaveTemplate = (template: Template) => {
    if (template.id) {
      setTemplates(templates.map(t => t.id === template.id ? template : t))
    } else {
      const newTemplate = { ...template, id: Date.now().toString(), editable: true }
      setTemplates([...templates, newTemplate])
    }
    setEditingTemplate(null)
  }

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === 'all' || rule.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const categories = ['all', 'security', 'api', 'web', 'bounty', 'custom']

  return (
    <div className="h-full flex flex-col bg-[#F7F7F8] dark:bg-[#0D0D0D]">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="text-gray-600 dark:text-gray-400" size={24} />
              Rules Engine
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Define automated actions and vulnerability detection patterns
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowTemplates(true)}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              <FileText size={16} className="mr-2" />
              Templates
            </Button>
            <Button
              onClick={() => {
                setEditingRule({
                  id: `new-${Date.now()}`,
                  name: '',
                  description: '',
                  condition: '',
                  action: '',
                  priority: rules.length + 1,
                  active: true
                })
                setCreatingRule(true)
              }}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              <Plus size={16} className="mr-2" />
              New Rule
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Rules</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <BarChart size={20} className="text-gray-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-lg font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle size={20} className="text-green-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Triggered Today</p>
                <p className="text-lg font-bold text-blue-600">{stats.triggered_today}</p>
              </div>
              <Clock size={20} className="text-blue-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.success_rate}%</p>
              </div>
              <Sparkles size={20} className="text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules..."
              className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
            />
          </div>
          <div className="flex gap-2">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={filterCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  "capitalize",
                  filterCategory === cat
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-black"
                    : "border-gray-300 dark:border-gray-700"
                )}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-3">
          <AnimatePresence>
            {filteredRules.map((rule) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {rule.name}
                      </h3>
                      {rule.active ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full text-xs">
                          Inactive
                        </span>
                      )}
                      {rule.category && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs">
                          {rule.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {rule.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-500 w-20">Condition:</span>
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex-1">
                          {rule.condition}
                        </code>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-500 w-20">Action:</span>
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex-1">
                          {rule.action}
                        </code>
                      </div>
                    </div>
                    {(rule.last_triggered || rule.trigger_count) && (
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                        {rule.last_triggered && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Last triggered: {rule.last_triggered}
                          </span>
                        )}
                        {rule.trigger_count && (
                          <span>Triggered {rule.trigger_count} times</span>
                        )}
                        {rule.success_rate && (
                          <span>{rule.success_rate}% success rate</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleRule(rule.id)}
                      className="text-gray-600 dark:text-gray-400"
                    >
                      {rule.active ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <AlertCircle size={16} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingRule(rule)}
                      className="text-gray-600 dark:text-gray-400"
                    >
                      <Edit3 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Rule Dialog */}
      <Dialog open={!!editingRule || creatingRule} onOpenChange={() => {
        setEditingRule(null)
        setCreatingRule(false)
      }}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {creatingRule ? 'Create New Rule' : 'Edit Rule'}
            </DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <Input
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <Textarea
                  value={editingRule.description}
                  onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <select
                  value={editingRule.category || 'custom'}
                  onChange={(e) => setEditingRule({ ...editingRule, category: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  {categories.filter(c => c !== 'all').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Condition</label>
                <Textarea
                  value={editingRule.condition}
                  onChange={(e) => setEditingRule({ ...editingRule, condition: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 font-mono text-sm"
                  rows={3}
                  placeholder="e.g., response.status === 200 && response.body.contains('error')"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Action</label>
                <Textarea
                  value={editingRule.action}
                  onChange={(e) => setEditingRule({ ...editingRule, action: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 font-mono text-sm"
                  rows={3}
                  placeholder="e.g., store_result('vulnerability', data) && notify('high')"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                <Input
                  type="number"
                  value={editingRule.priority}
                  onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  min="1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingRule(null)
                    setCreatingRule(false)
                  }}
                  className="border-gray-300 dark:border-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSaveRule(editingRule)}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  <Save size={16} className="mr-2" />
                  Save Rule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white flex items-center justify-between">
              <span>Rule Templates</span>
              <Button
                size="sm"
                onClick={() => setEditingTemplate({
                  id: '',
                  name: '',
                  description: '',
                  category: 'custom',
                  rules: [],
                  editable: true
                })}
                className="bg-gray-800 hover:bg-gray-700 text-white"
              >
                <Plus size={16} className="mr-2" />
                New Template
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {template.description}
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                      {template.rules.length} rules
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {template.editable && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTemplate(template)}
                          className="text-gray-600 dark:text-gray-400"
                        >
                          <Edit3 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleApplyTemplate(template)}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {template.rules.slice(0, 2).map((rule, idx) => (
                    <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{rule.name}:</span> {rule.description}
                    </div>
                  ))}
                  {template.rules.length > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      +{template.rules.length - 2} more rules...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] bg-white dark:bg-gray-900">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">
                {editingTemplate.id ? 'Edit Template' : 'Create Template'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto pr-2">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <Input
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <Textarea
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <select
                  value={editingTemplate.category}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  {categories.filter(c => c !== 'all').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rules</label>
                  <Button
                    size="sm"
                    onClick={() => {
                      const newRule: Partial<Rule> = {
                        name: '',
                        description: '',
                        condition: '',
                        action: '',
                        priority: editingTemplate.rules.length + 1,
                        active: true
                      }
                      setEditingTemplate({
                        ...editingTemplate,
                        rules: [...editingTemplate.rules, newRule]
                      })
                    }}
                    className="bg-gray-800 hover:bg-gray-700 text-white"
                  >
                    <Plus size={14} className="mr-1" />
                    Add Rule
                  </Button>
                </div>
                <div className="space-y-3">
                  {editingTemplate.rules.map((rule, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Rule {idx + 1}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTemplate({
                              ...editingTemplate,
                              rules: editingTemplate.rules.filter((_, i) => i !== idx)
                            })
                          }}
                          className="text-red-600 dark:text-red-400 -mt-1 -mr-1"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Input
                          value={rule.name || ''}
                          onChange={(e) => {
                            const updatedRules = [...editingTemplate.rules]
                            updatedRules[idx] = { ...rule, name: e.target.value }
                            setEditingTemplate({ ...editingTemplate, rules: updatedRules })
                          }}
                          placeholder="Rule name"
                          className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm"
                        />
                        <Input
                          value={rule.description || ''}
                          onChange={(e) => {
                            const updatedRules = [...editingTemplate.rules]
                            updatedRules[idx] = { ...rule, description: e.target.value }
                            setEditingTemplate({ ...editingTemplate, rules: updatedRules })
                          }}
                          placeholder="Rule description"
                          className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm"
                        />
                        <Textarea
                          value={rule.condition || ''}
                          onChange={(e) => {
                            const updatedRules = [...editingTemplate.rules]
                            updatedRules[idx] = { ...rule, condition: e.target.value }
                            setEditingTemplate({ ...editingTemplate, rules: updatedRules })
                          }}
                          placeholder="Condition"
                          className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 font-mono text-xs"
                          rows={2}
                        />
                        <Textarea
                          value={rule.action || ''}
                          onChange={(e) => {
                            const updatedRules = [...editingTemplate.rules]
                            updatedRules[idx] = { ...rule, action: e.target.value }
                            setEditingTemplate({ ...editingTemplate, rules: updatedRules })
                          }}
                          placeholder="Action"
                          className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 font-mono text-xs"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingTemplate(null)}
                  className="border-gray-300 dark:border-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSaveTemplate(editingTemplate)}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  <Save size={16} className="mr-2" />
                  Save Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}