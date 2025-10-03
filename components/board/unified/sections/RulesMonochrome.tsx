'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Plus, Save, Trash2, Download, Upload,
  Globe, Folder, ChevronDown, ChevronRight,
  Settings2, Code, Shield, Book, Target, Hash,
  Sparkles, Copy, Check, X, Edit3, Eye, EyeOff,
  Layers, GitBranch, Terminal, Database, Server
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface Rule {
  id: string
  name: string
  description?: string
  content: string
  folder_target?: string
  enabled: boolean
  is_template?: boolean
  template_name?: string
  priority?: number
  tags?: string[]
  created_at?: string
}

interface RulesMonochromeProps {
  projectId: string
}

// Mini-panel component
const MiniPanel = ({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
  badge,
  className
}: {
  title: string
  icon: any
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  badge?: React.ReactNode
  className?: string
}) => {
  return (
    <div className={cn(
      "bg-white dark:bg-[#202123] rounded-lg border border-gray-200 dark:border-gray-700",
      className
    )}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-[#6E6E80]" />
          <span className="font-medium text-[#202123] dark:text-white text-sm">
            {title}
          </span>
          {badge}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className="text-[#6E6E80]" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Template card component
const TemplateCard = ({
  template,
  onApply
}: {
  template: any
  onApply: () => void
}) => {
  const [copied, setCopied] = useState(false)
  const Icon = template.icon

  const handleCopy = () => {
    navigator.clipboard.writeText(template.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-4 bg-[#F7F7F8] dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white dark:bg-[#202123] rounded-lg">
            <Icon size={18} className="text-[#202123] dark:text-white" />
          </div>
          <div>
            <h4 className="font-medium text-sm text-[#202123] dark:text-white">
              {template.name}
            </h4>
            <p className="text-xs text-[#6E6E80] mt-0.5">
              {template.description}
            </p>
          </div>
        </div>
      </div>

      {template.tags && (
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.map((tag: string) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 text-xs rounded text-[#6E6E80]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="flex-1 h-8 text-xs border-gray-200 dark:border-gray-700"
        >
          {copied ? (
            <>
              <Check size={14} className="mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} className="mr-1" />
              Copy
            </>
          )}
        </Button>
        <Button
          size="sm"
          onClick={onApply}
          className="flex-1 h-8 text-xs bg-[#202123] hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-[#202123]"
        >
          <Sparkles size={14} className="mr-1" />
          Apply
        </Button>
      </div>
    </motion.div>
  )
}

// Rule item component
const RuleItem = ({
  rule,
  onToggle,
  onDelete,
  onEdit
}: {
  rule: Rule
  onToggle: (enabled: boolean) => void
  onDelete: () => void
  onEdit: () => void
}) => {
  const [showContent, setShowContent] = useState(false)

  return (
    <div className="p-3 bg-white dark:bg-[#202123] rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Folder size={14} className="text-[#6E6E80]" />
            <span className="font-medium text-sm text-[#202123] dark:text-white">
              {rule.folder_target || 'Global'}
            </span>
            {rule.priority && rule.priority > 3 && (
              <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded">
                High
              </span>
            )}
          </div>

          <p className="text-xs text-[#6E6E80] line-clamp-2 mb-2">
            {rule.content}
          </p>

          {rule.tags && rule.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {rule.tags.map(tag => (
                <span key={tag} className="px-1.5 py-0.5 bg-[#F7F7F8] dark:bg-gray-800 text-xs rounded text-[#6E6E80]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-3">
          <button
            onClick={() => setShowContent(!showContent)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            {showContent ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <Edit3 size={14} className="text-[#6E6E80]" />
          </button>
          <Switch
            checked={rule.enabled}
            onCheckedChange={onToggle}
          />
          {!rule.is_template && (
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              <Trash2 size={14} className="text-red-500" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800"
          >
            <pre className="text-xs text-[#6E6E80] font-mono whitespace-pre-wrap">
              {rule.content}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Template data
const TEMPLATES = {
  security: [
    {
      name: 'OWASP Top 10',
      icon: Shield,
      description: 'Complete security testing methodology',
      content: `# OWASP Top 10 Testing

Always test for:
- SQL Injection
- XSS vulnerabilities
- Authentication bypass
- Sensitive data exposure
- Security misconfiguration`,
      tags: ['security', 'owasp', 'web']
    },
    {
      name: 'API Security',
      icon: Code,
      description: 'REST/GraphQL API testing',
      content: `# API Security Testing

- Test authentication mechanisms
- Check rate limiting
- Verify CORS configuration
- Test input validation`,
      tags: ['api', 'rest', 'security']
    }
  ],
  pentest: [
    {
      name: 'Network Scan',
      icon: Server,
      description: 'Network reconnaissance',
      content: `# Network Reconnaissance

- Port scanning
- Service enumeration
- Version detection
- Vulnerability mapping`,
      tags: ['network', 'recon']
    },
    {
      name: 'Web Application',
      icon: Globe,
      description: 'Web app testing',
      content: `# Web Application Testing

- Authentication testing
- Session management
- Input validation
- Business logic`,
      tags: ['web', 'application']
    }
  ],
  automation: [
    {
      name: 'Bug Bounty',
      icon: Target,
      description: 'Bug bounty methodology',
      content: `# Bug Bounty Strategy

- Subdomain enumeration
- Endpoint discovery
- Parameter fuzzing
- Automated scanning`,
      tags: ['bugbounty', 'automation']
    }
  ]
}

export default function RulesMonochrome({ projectId }: RulesMonochromeProps) {
  const [globalRules, setGlobalRules] = useState('')
  const [folderRules, setFolderRules] = useState<Rule[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)

  // Panel states
  const [panels, setPanels] = useState({
    templates: true,
    global: false,
    folder: false,
    active: true
  })

  // New rule form
  const [newRule, setNewRule] = useState({
    folder: '',
    content: ''
  })

  useEffect(() => {
    loadRules()
  }, [projectId])

  const loadRules = async () => {
    try {
      // Load global rules
      const { data: project } = await supabase
        .from('projects')
        .select('settings')
        .eq('id', projectId)
        .single()

      if (project?.settings?.globalRules) {
        setGlobalRules(project.settings.globalRules)
      }

      // Load folder rules
      const { data: rules } = await supabase
        .from('rules')
        .select('*')
        .eq('project_id', projectId)
        .order('priority', { ascending: false })

      if (rules) {
        setFolderRules(rules.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          content: r.action,
          folder_target: r.applies_to_node_id,
          enabled: r.enabled,
          priority: r.priority,
          is_template: r.config?.is_template,
          template_name: r.config?.template_name,
          tags: r.config?.tags || [],
          created_at: r.created_at
        })))
      }
    } catch (error) {
      console.error('Error loading rules:', error)
    }
  }

  const saveGlobalRules = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          settings: {
            globalRules
          }
        })
        .eq('id', projectId)

      if (!error) {
        toast.success('Global rules saved')
        setIsDirty(false)
      }
    } catch (error) {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  const addFolderRule = async () => {
    if (!newRule.folder || !newRule.content) {
      toast.error('Please fill all fields')
      return
    }

    try {
      const { error } = await supabase
        .from('rules')
        .insert({
          project_id: projectId,
          name: `Rule for ${newRule.folder}`,
          description: `Applies to ${newRule.folder}`,
          trigger: newRule.folder,
          action: newRule.content,
          applies_to_node_id: newRule.folder,
          enabled: true,
          priority: 3
        })

      if (!error) {
        toast.success('Rule added')
        setNewRule({ folder: '', content: '' })
        loadRules()
      }
    } catch (error) {
      toast.error('Failed to add rule')
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Delete this rule?')) return

    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', ruleId)

      if (!error) {
        toast.success('Rule deleted')
        loadRules()
      }
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('rules')
        .update({ enabled })
        .eq('id', ruleId)

      if (!error) {
        loadRules()
      }
    } catch (error) {
      toast.error('Failed to toggle')
    }
  }

  const applyTemplate = (template: any) => {
    setNewRule({
      folder: '',
      content: template.content
    })
    setPanels({ ...panels, folder: true, templates: false })
    toast.success(`Template "${template.name}" loaded`)
  }

  const exportRules = () => {
    const exportData = {
      name: 'BCI Rules Export',
      version: '3.0',
      timestamp: new Date().toISOString(),
      globalRules,
      folderRules: folderRules.map(r => ({
        folder: r.folder_target,
        content: r.content,
        enabled: r.enabled,
        tags: r.tags
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rules-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Rules exported')
  }

  const importRules = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        try {
          const data = JSON.parse(text)
          if (data.globalRules) {
            setGlobalRules(data.globalRules)
            setIsDirty(true)
            toast.success('Rules imported')
          }
        } catch (error) {
          toast.error('Invalid file')
        }
      }
    }
    input.click()
  }

  const activeRulesCount = folderRules.filter(r => r.enabled).length

  return (
    <div className="h-full flex flex-col bg-[#F7F7F8] dark:bg-gray-950">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-[#202123] border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="text-[#202123] dark:text-white" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-[#202123] dark:text-white">
                AI Rules & Instructions
              </h2>
              <p className="text-sm text-[#6E6E80]">
                {activeRulesCount} active • {folderRules.length} total
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportRules}
              className="border-gray-200 dark:border-gray-700 text-[#202123] dark:text-white"
            >
              <Download size={14} className="mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={importRules}
              className="border-gray-200 dark:border-gray-700 text-[#202123] dark:text-white"
            >
              <Upload size={14} className="mr-1" />
              Import
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Template Library */}
          <MiniPanel
            title="Template Library"
            icon={Layers}
            isOpen={panels.templates}
            onToggle={() => setPanels({ ...panels, templates: !panels.templates })}
            badge={
              <span className="px-2 py-0.5 bg-[#202123] dark:bg-white text-white dark:text-[#202123] text-xs rounded-full">
                {Object.values(TEMPLATES).flat().length}
              </span>
            }
          >
            <div className="space-y-4">
              {Object.entries(TEMPLATES).map(([category, templates]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-[#6E6E80] uppercase mb-3">
                    {category}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {templates.map((template, idx) => (
                      <TemplateCard
                        key={idx}
                        template={template}
                        onApply={() => applyTemplate(template)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </MiniPanel>

          {/* Global Rules */}
          <MiniPanel
            title="Global Rules"
            icon={Globe}
            isOpen={panels.global}
            onToggle={() => setPanels({ ...panels, global: !panels.global })}
            badge={
              isDirty && (
                <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full">
                  Unsaved
                </span>
              )
            }
          >
            <textarea
              value={globalRules}
              onChange={(e) => {
                setGlobalRules(e.target.value)
                setIsDirty(true)
              }}
              placeholder="Enter global instructions..."
              className="w-full h-48 p-3 bg-[#F7F7F8] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#202123] dark:focus:ring-white"
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={saveGlobalRules}
                disabled={!isDirty || saving}
                className="bg-[#202123] hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-[#202123]"
              >
                <Save size={14} className="mr-2" />
                Save Global Rules
              </Button>
            </div>
          </MiniPanel>

          {/* Folder Rules */}
          <MiniPanel
            title="Folder-Specific Rules"
            icon={Folder}
            isOpen={panels.folder}
            onToggle={() => setPanels({ ...panels, folder: !panels.folder })}
            badge={
              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                New
              </span>
            }
          >
            <div className="space-y-3">
              <input
                type="text"
                value={newRule.folder}
                onChange={(e) => setNewRule({ ...newRule, folder: e.target.value })}
                placeholder="Folder path (e.g., /api or /security)"
                className="w-full px-3 py-2 bg-white dark:bg-[#202123] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202123] dark:focus:ring-white"
              />
              <textarea
                value={newRule.content}
                onChange={(e) => setNewRule({ ...newRule, content: e.target.value })}
                placeholder="Instructions for this folder..."
                className="w-full h-32 p-3 bg-white dark:bg-[#202123] border border-gray-200 dark:border-gray-700 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#202123] dark:focus:ring-white"
              />
              <Button
                onClick={addFolderRule}
                className="w-full bg-[#202123] hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-[#202123]"
              >
                <Plus size={14} className="mr-2" />
                Add Folder Rule
              </Button>
            </div>
          </MiniPanel>

          {/* Active Rules */}
          <MiniPanel
            title="Active Rules"
            icon={Settings2}
            isOpen={panels.active}
            onToggle={() => setPanels({ ...panels, active: !panels.active })}
            badge={
              <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                {activeRulesCount}
              </span>
            }
          >
            <div className="space-y-3">
              {folderRules.length === 0 ? (
                <div className="text-center py-8">
                  <Folder size={32} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-[#6E6E80]">No rules yet</p>
                  <p className="text-xs text-[#6E6E80] mt-1">
                    Add rules using templates or create custom ones
                  </p>
                </div>
              ) : (
                folderRules.map(rule => (
                  <RuleItem
                    key={rule.id}
                    rule={rule}
                    onToggle={(v) => toggleRule(rule.id, v)}
                    onDelete={() => deleteRule(rule.id)}
                    onEdit={() => setEditingRule(rule)}
                  />
                ))
              )}
            </div>
          </MiniPanel>

        </div>
      </div>
    </div>
  )
}