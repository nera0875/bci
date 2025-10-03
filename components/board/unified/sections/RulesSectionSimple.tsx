'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Plus, Save, Trash2, Download, Upload,
  Globe, Folder, CheckCircle, XCircle, Copy,
  Package, Zap, Shield, Code
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Rule {
  id: string
  name: string
  description?: string
  content: string
  folder_target?: string
  enabled: boolean
  is_template?: boolean
  template_name?: string
}

interface RulesSectionProps {
  projectId: string
}

// Predefined templates
const RULE_TEMPLATES = [
  {
    name: 'OWASP Top 10 Testing',
    icon: Shield,
    content: `# OWASP Top 10 Security Testing

Always check for:
- SQL Injection in all input fields
- XSS vulnerabilities in outputs
- Authentication bypass methods
- Sensitive data exposure
- Security misconfiguration
- Using components with known vulnerabilities

For each test:
1. Document the payload used
2. Capture the response
3. Note the impact level
4. Suggest remediation`,
    folder_target: null
  },
  {
    name: 'API Security Testing',
    icon: Code,
    content: `# API Security Testing Protocol

For each endpoint:
- Test authentication (Bearer tokens, API keys)
- Check rate limiting
- Verify CORS configuration
- Test input validation
- Check for information disclosure
- Test HTTP methods (GET, POST, PUT, DELETE, OPTIONS)

Document:
- Endpoint URL
- Request/Response
- Security findings`,
    folder_target: '/api'
  },
  {
    name: 'Web Application Testing',
    icon: Globe,
    content: `# Web Application Security

Focus areas:
- Authentication & Session Management
- Input Validation
- Output Encoding
- Access Controls
- Business Logic
- Client-side Security

Testing approach:
- Manual testing first
- Automated scanning second
- Always verify findings`,
    folder_target: '/web'
  }
]

export default function RulesSectionSimple({ projectId }: RulesSectionProps) {
  const [globalRules, setGlobalRules] = useState('')
  const [folderRules, setFolderRules] = useState<Rule[]>([])
  const [selectedFolder, setSelectedFolder] = useState('')
  const [folderRuleContent, setFolderRuleContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadRules()
  }, [projectId])

  const loadRules = async () => {
    try {
      // Load global rules from project settings
      const { data: project } = await supabase
        .from('projects')
        .select('settings')
        .eq('id', projectId)
        .single()

      if (project?.settings?.globalRules) {
        setGlobalRules(project.settings.globalRules)
      }

      // Load folder-specific rules
      const { data: rules } = await supabase
        .from('rules')
        .select('*')
        .eq('project_id', projectId)
        .order('name')

      if (rules) {
        setFolderRules(rules.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          content: r.action,
          folder_target: r.applies_to_node_id,
          enabled: r.enabled,
          is_template: r.config?.is_template,
          template_name: r.config?.template_name
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
      toast.error('Failed to save global rules')
    }
    setSaving(false)
  }

  const addFolderRule = async () => {
    if (!selectedFolder || !folderRuleContent) {
      toast.error('Please enter a folder path and rule content')
      return
    }

    try {
      const { error } = await supabase
        .from('rules')
        .insert({
          project_id: projectId,
          name: `Rule for ${selectedFolder}`,
          description: `Applies to ${selectedFolder}`,
          trigger: selectedFolder,
          action: folderRuleContent,
          applies_to_node_id: selectedFolder,
          enabled: true,
          priority: 3
        })

      if (!error) {
        toast.success('Folder rule added')
        setSelectedFolder('')
        setFolderRuleContent('')
        loadRules()
      }
    } catch (error) {
      toast.error('Failed to add folder rule')
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
      toast.error('Failed to delete rule')
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
      toast.error('Failed to toggle rule')
    }
  }

  const applyTemplate = (template: typeof RULE_TEMPLATES[0]) => {
    if (template.folder_target) {
      setSelectedFolder(template.folder_target)
      setFolderRuleContent(template.content)
      toast.success(`Template "${template.name}" loaded`)
    } else {
      setGlobalRules(prev => prev + '\n\n' + template.content)
      setIsDirty(true)
      toast.success(`Template "${template.name}" applied to global rules`)
    }
  }

  const exportRules = () => {
    const exportData = {
      name: 'BCI Rules Export',
      version: '1.0',
      timestamp: new Date().toISOString(),
      globalRules,
      folderRules: folderRules.map(r => ({
        folder: r.folder_target,
        content: r.content,
        enabled: r.enabled
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bci-rules-${new Date().toISOString().split('T')[0]}.bci-template`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Rules exported')
  }

  const importRules = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.bci-template,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        try {
          const data = JSON.parse(text)
          if (data.globalRules) {
            setGlobalRules(data.globalRules)
            setIsDirty(true)
          }
          // Import folder rules if needed
          toast.success('Rules imported')
        } catch (error) {
          toast.error('Invalid file format')
        }
      }
    }
    input.click()
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="text-purple-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                AI Rules & Instructions
              </h2>
              <p className="text-sm text-gray-500">
                Define how the AI should behave globally and per folder
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportRules}>
              <Download size={14} className="mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={importRules}>
              <Upload size={14} className="mr-1" />
              Import
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Templates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Package className="text-amber-600" size={20} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Quick Templates
                </h3>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                {RULE_TEMPLATES.map((template, i) => {
                  const Icon = template.icon
                  return (
                    <button
                      key={i}
                      onClick={() => applyTemplate(template)}
                      className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-md transition-all text-left"
                    >
                      <Icon size={20} className="text-blue-600 mb-2" />
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {template.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {template.folder_target ? `For ${template.folder_target}` : 'Global'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Global Rules */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="text-blue-600" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Global Rules (Apply Everywhere)
                  </h3>
                </div>
                <Button
                  size="sm"
                  onClick={saveGlobalRules}
                  disabled={!isDirty || saving}
                >
                  <Save size={14} className="mr-1" />
                  Save
                </Button>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={globalRules}
                onChange={(e) => {
                  setGlobalRules(e.target.value)
                  setIsDirty(true)
                }}
                placeholder="Enter general instructions for the AI...

Example:
- Always document findings with screenshots
- Use professional language
- Follow OWASP methodology
- Prioritize critical vulnerabilities"
                className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Folder-Specific Rules */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Folder className="text-purple-600" size={20} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Folder-Specific Rules
                </h3>
              </div>
            </div>

            {/* Add New Folder Rule */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    placeholder="Folder path (e.g., /api or /sqli)"
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                  />
                  <Button onClick={addFolderRule}>
                    <Plus size={14} className="mr-1" />
                    Add Rule
                  </Button>
                </div>
                <textarea
                  value={folderRuleContent}
                  onChange={(e) => setFolderRuleContent(e.target.value)}
                  placeholder="Instructions for this folder..."
                  className="w-full h-24 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm resize-none"
                />
              </div>
            </div>

            {/* Existing Folder Rules */}
            <div className="p-4 space-y-3">
              {folderRules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Folder size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No folder-specific rules yet</p>
                </div>
              ) : (
                folderRules.map(rule => (
                  <div
                    key={rule.id}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Folder size={16} className="text-purple-600" />
                        <span className="font-medium text-sm">
                          {rule.folder_target || 'Global'}
                        </span>
                        {rule.is_template && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                            Template
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(v) => toggleRule(rule.id, v)}
                        />
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {rule.content.substring(0, 150)}...
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}