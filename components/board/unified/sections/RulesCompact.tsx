'use client'

import { useState, useEffect } from 'react'
import {
  Shield, Plus, Trash2, Edit2, Save, X, Search,
  Zap, Copy, Download, Upload, Play, CheckCircle,
  AlertTriangle, FileJson, Code, Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface RulesCompactProps {
  projectId: string
}

interface Playbook {
  id: string
  name: string
  description: string
  enabled: boolean
  trigger: string
  actions: any[]
  category?: string
  tags?: string[]
  created_at?: string
  success_rate?: number
}

export default function RulesCompact({ projectId }: RulesCompactProps) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null)
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editorContent, setEditorContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'custom'>('all')

  // Default playbook templates
  const DEFAULT_TEMPLATES = [
    {
      name: 'IDOR Detection',
      description: 'Test for Insecure Direct Object References',
      trigger: 'URL contains numeric ID or UUID',
      actions: [
        'Extract ID parameter',
        'Test with ID+1, ID-1',
        'Test with random UUID',
        'Compare responses',
        'Alert if 200 with different data'
      ],
      category: 'vulnerabilities',
      tags: ['idor', 'auth']
    },
    {
      name: 'JWT Analysis',
      description: 'Analyze and test JWT tokens',
      trigger: 'Header contains Authorization: Bearer',
      actions: [
        'Decode JWT without verification',
        'Check algorithm confusion',
        'Test with none algorithm',
        'Modify claims and re-sign',
        'Test expired tokens'
      ],
      category: 'authentication',
      tags: ['jwt', 'auth', 'token']
    },
    {
      name: 'API Rate Limit Test',
      description: 'Test API rate limiting',
      trigger: 'API endpoint detected',
      actions: [
        'Send 100 requests rapidly',
        'Check for rate limit headers',
        'Test with different IPs',
        'Test with different user agents',
        'Document bypass methods'
      ],
      category: 'api',
      tags: ['rate-limit', 'dos']
    }
  ]

  useEffect(() => {
    loadPlaybooks()
  }, [projectId])

  const loadPlaybooks = async () => {
    try {
      const { data } = await supabase
        .from('rules')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (data) {
        // Transform DB data to playbook format
        const transformedPlaybooks = data.map(rule => ({
          id: rule.id,
          name: rule.name,
          description: rule.description || '',
          enabled: rule.enabled,
          trigger: rule.metadata?.trigger || '',
          actions: rule.metadata?.actions || [],
          category: rule.metadata?.category || 'custom',
          tags: rule.metadata?.tags || [],
          created_at: rule.created_at,
          success_rate: rule.metadata?.success_rate || 0
        }))
        setPlaybooks(transformedPlaybooks)
      }
    } catch (error) {
      console.error('Error loading playbooks:', error)
      toast.error('Failed to load playbooks')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlaybook = () => {
    const newPlaybook: Playbook = {
      id: 'new',
      name: 'New Playbook',
      description: 'Describe what this playbook does',
      enabled: true,
      trigger: 'Define when this playbook should run',
      actions: ['Action 1', 'Action 2'],
      category: 'custom',
      tags: []
    }
    setEditingPlaybook(newPlaybook)
    setShowEditor(true)
    setEditorContent(JSON.stringify(newPlaybook, null, 2))
  }

  const handleEditPlaybook = (playbook: Playbook) => {
    setEditingPlaybook(playbook)
    setShowEditor(true)
    setEditorContent(JSON.stringify(playbook, null, 2))
  }

  const handleSavePlaybook = async () => {
    if (!editorContent) return

    try {
      const playbookData = JSON.parse(editorContent)

      if (editingPlaybook?.id === 'new') {
        // Create new playbook
        const { error } = await supabase
          .from('rules')
          .insert({
            project_id: projectId,
            name: playbookData.name,
            description: playbookData.description,
            enabled: playbookData.enabled,
            focus_type: `playbook_${Date.now()}`,
            metadata: {
              trigger: playbookData.trigger,
              actions: playbookData.actions,
              category: playbookData.category,
              tags: playbookData.tags
            }
          })

        if (error) throw error
        toast.success('Playbook created')
      } else {
        // Update existing playbook
        const { error } = await supabase
          .from('rules')
          .update({
            name: playbookData.name,
            description: playbookData.description,
            enabled: playbookData.enabled,
            metadata: {
              trigger: playbookData.trigger,
              actions: playbookData.actions,
              category: playbookData.category,
              tags: playbookData.tags,
              success_rate: playbookData.success_rate
            }
          })
          .eq('id', editingPlaybook!.id)

        if (error) throw error
        toast.success('Playbook updated')
      }

      loadPlaybooks()
      setShowEditor(false)
      setEditingPlaybook(null)
      setEditorContent('')
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON format')
      } else {
        console.error('Error saving playbook:', error)
        toast.error('Failed to save playbook')
      }
    }
  }

  const handleDeletePlaybook = async (id: string) => {
    if (!confirm('Delete this playbook?')) return

    try {
      await supabase
        .from('rules')
        .delete()
        .eq('id', id)

      toast.success('Playbook deleted')
      loadPlaybooks()
    } catch (error) {
      console.error('Error deleting playbook:', error)
      toast.error('Failed to delete playbook')
    }
  }

  const handleTogglePlaybook = async (id: string, enabled: boolean) => {
    try {
      await supabase
        .from('rules')
        .update({ enabled })
        .eq('id', id)

      setPlaybooks(prev => prev.map(p =>
        p.id === id ? { ...p, enabled } : p
      ))

      toast.success(enabled ? 'Playbook activated' : 'Playbook deactivated')
    } catch (error) {
      console.error('Error toggling playbook:', error)
      toast.error('Failed to update playbook')
    }
  }

  const handleImportTemplate = async (template: typeof DEFAULT_TEMPLATES[0]) => {
    const newPlaybook = {
      project_id: projectId,
      name: template.name,
      description: template.description,
      enabled: true,
      focus_type: `playbook_${Date.now()}`,
      metadata: {
        trigger: template.trigger,
        actions: template.actions,
        category: template.category,
        tags: template.tags
      }
    }

    try {
      const { error } = await supabase
        .from('rules')
        .insert(newPlaybook)

      if (error) throw error
      toast.success(`Imported ${template.name}`)
      loadPlaybooks()
    } catch (error) {
      console.error('Error importing template:', error)
      toast.error('Failed to import template')
    }
  }

  const handleExportPlaybook = (playbook: Playbook) => {
    const data = JSON.stringify(playbook, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${playbook.name.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Playbook exported')
  }

  const handleRunPlaybook = async (playbook: Playbook) => {
    toast.info(`Running ${playbook.name}...`)
    // Here you would integrate with the actual testing engine
    setTimeout(() => {
      toast.success(`${playbook.name} completed`)
    }, 2000)
  }

  // Filter playbooks
  const filteredPlaybooks = playbooks.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    if (activeTab === 'active') return matchesSearch && p.enabled
    if (activeTab === 'custom') return matchesSearch && p.category === 'custom'
    return matchesSearch
  })

  const activeCount = playbooks.filter(p => p.enabled).length
  const totalCount = playbooks.length

  return (
    <div className="h-full flex bg-white dark:bg-gray-900">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield size={24} />
                Detection Playbooks
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {activeCount} active / {totalCount} total playbooks
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreatePlaybook}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Plus size={16} className="mr-1" />
                New Playbook
              </Button>
            </div>
          </div>

          {/* Search and Tabs */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search playbooks..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  "px-3 py-1 rounded text-sm transition-colors",
                  activeTab === 'all'
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={cn(
                  "px-3 py-1 rounded text-sm transition-colors",
                  activeTab === 'active'
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={cn(
                  "px-3 py-1 rounded text-sm transition-colors",
                  activeTab === 'custom'
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                Custom
              </button>
            </div>
          </div>
        </div>

        {/* Playbooks Grid */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Loading playbooks...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Template Cards */}
              {filteredPlaybooks.length === 0 && searchQuery === '' && (
                <>
                  <div className="col-span-full mb-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Import Templates to Get Started
                    </h3>
                  </div>
                  {DEFAULT_TEMPLATES.map((template, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {template.name}
                        </h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleImportTemplate(template)}
                          className="text-blue-600 dark:text-blue-400"
                        >
                          <Download size={14} className="mr-1" />
                          Import
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </>
              )}

              {/* Playbook Cards */}
              {filteredPlaybooks.map((playbook, i) => (
                <motion.div
                  key={playbook.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "rounded-lg p-4 border transition-all",
                    playbook.enabled
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {playbook.name}
                    </h3>
                    <Switch
                      checked={playbook.enabled}
                      onCheckedChange={(checked) => handleTogglePlaybook(playbook.id, checked)}
                    />
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {playbook.description}
                  </p>

                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Trigger:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {playbook.trigger}
                    </p>
                  </div>

                  {playbook.success_rate !== undefined && playbook.success_rate > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {playbook.success_rate}% success rate
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRunPlaybook(playbook)}
                      className="text-blue-600 dark:text-blue-400"
                    >
                      <Play size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditPlaybook(playbook)}
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExportPlaybook(playbook)}
                    >
                      <Download size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeletePlaybook(playbook.id)}
                      className="text-red-600"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Panel */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="w-[500px] border-l border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-800"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {editingPlaybook?.id === 'new' ? 'Create Playbook' : 'Edit Playbook'}
              </h3>
              <button
                onClick={() => {
                  setShowEditor(false)
                  setEditingPlaybook(null)
                  setEditorContent('')
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-4">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Playbook Configuration (JSON)
                </label>
              </div>
              <Textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="h-[calc(100%-100px)] font-mono text-sm bg-white dark:bg-gray-900"
                placeholder="Enter playbook configuration..."
              />
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
              <Button
                onClick={handleSavePlaybook}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Save size={16} className="mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditor(false)
                  setEditingPlaybook(null)
                  setEditorContent('')
                }}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}