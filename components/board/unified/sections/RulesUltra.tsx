'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Plus, Save, Trash2, Download, Upload,
  Globe, Folder, CheckCircle, XCircle, Copy,
  Package, Zap, Shield, Code, ChevronDown, ChevronRight,
  Search, Filter, AlertTriangle, Info, Star,
  Settings, Lightbulb, Book, Target
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

interface RulesUltraProps {
  projectId: string
}

// Professional templates with categories
const RULE_TEMPLATES = [
  {
    category: 'Security Testing',
    templates: [
      {
        name: 'OWASP Top 10',
        icon: Shield,
        description: 'Complete OWASP testing methodology',
        content: `# OWASP Top 10 Security Testing Protocol

## Testing Approach
Always follow this systematic approach for each vulnerability class:

### 1. Injection (SQL, NoSQL, OS, LDAP)
- Test all input fields with special characters
- Use time-based techniques for blind testing
- Document database errors carefully
- Test parameterized queries bypass

### 2. Broken Authentication
- Test password reset flows
- Check session management
- Verify MFA implementation
- Test account lockout mechanisms

### 3. Sensitive Data Exposure
- Check HTTPS implementation
- Test for data leakage in responses
- Verify encryption at rest
- Check error message verbosity

### 4. XML External Entities (XXE)
- Test XML upload points
- Check DTD processing
- Test for SSRF via XXE
- Verify XML parser configuration

### 5. Broken Access Control
- Test horizontal privilege escalation
- Test vertical privilege escalation
- Check direct object references
- Verify API access controls

### Documentation Requirements
For each finding:
- Vulnerability title and OWASP category
- Steps to reproduce
- Impact assessment
- Evidence (screenshots/requests)
- Remediation recommendations`,
        folder_target: '/security/owasp',
        tags: ['security', 'owasp', 'methodology']
      },
      {
        name: 'API Security',
        icon: Code,
        description: 'REST/GraphQL API security testing',
        content: `# API Security Testing Framework

## Authentication Testing
- Bearer token validation
- API key security
- OAuth flow testing
- JWT token analysis

## Authorization Testing
- Resource access controls
- Rate limiting verification
- CORS configuration
- Method-based restrictions

## Input Validation
- JSON/XML payload fuzzing
- Parameter pollution
- Type confusion attacks
- Boundary value testing

## Business Logic
- Workflow bypass attempts
- Race condition testing
- Price manipulation
- Quantity limits bypass`,
        folder_target: '/api',
        tags: ['api', 'rest', 'graphql']
      },
      {
        name: 'Web Application',
        icon: Globe,
        description: 'Frontend security assessment',
        content: `# Web Application Security Assessment

## Client-Side Testing
- XSS (Reflected, Stored, DOM-based)
- CSRF token validation
- Clickjacking protections
- HTML5 security features

## Session Management
- Cookie security flags
- Session fixation
- Session timeout
- Concurrent sessions

## File Upload Testing
- File type validation bypass
- Malicious file upload
- Path traversal via filename
- DoS via file size`,
        folder_target: '/web',
        tags: ['web', 'frontend', 'xss']
      }
    ]
  },
  {
    category: 'Penetration Testing',
    templates: [
      {
        name: 'Network Pentest',
        icon: Target,
        description: 'Internal/External network testing',
        content: `# Network Penetration Testing Playbook

## Reconnaissance
- DNS enumeration
- Subdomain discovery
- Port scanning strategy
- Service fingerprinting

## Vulnerability Assessment
- Version-based vulnerabilities
- Default credentials
- Misconfigurations
- Unnecessary services

## Exploitation
- Document all attempts
- Maintain audit trail
- Capture evidence
- Assess impact`,
        folder_target: '/network',
        tags: ['network', 'infrastructure']
      },
      {
        name: 'Bug Bounty',
        icon: Star,
        description: 'Bug bounty hunting methodology',
        content: `# Bug Bounty Hunting Strategy

## High-Value Targets
- Authentication systems
- Payment processing
- Admin panels
- File upload functions
- API endpoints

## Automation Strategy
- Subdomain monitoring
- Endpoint discovery
- Parameter fuzzing
- Response analysis

## Reporting Format
- Clear title
- Severity justification
- Reproducible steps
- Impact demonstration`,
        folder_target: '/bugbounty',
        tags: ['bugbounty', 'automation']
      }
    ]
  },
  {
    category: 'Compliance',
    templates: [
      {
        name: 'GDPR Assessment',
        icon: Book,
        description: 'Privacy and data protection',
        content: `# GDPR Compliance Testing

## Data Collection
- Consent mechanisms
- Data minimization
- Purpose limitation
- Storage limitation

## User Rights
- Right to access
- Right to deletion
- Data portability
- Opt-out mechanisms`,
        folder_target: '/compliance/gdpr',
        tags: ['compliance', 'gdpr', 'privacy']
      }
    ]
  }
]

// Accordion component
function Accordion({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  badge,
  children
}: {
  title: string
  icon: any
  isOpen: boolean
  onToggle: () => void
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={20} className="text-gray-600 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
          {badge}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight size={18} className="text-gray-500" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function RulesUltra({ projectId }: RulesUltraProps) {
  const [globalRules, setGlobalRules] = useState('')
  const [folderRules, setFolderRules] = useState<Rule[]>([])
  const [selectedFolder, setSelectedFolder] = useState('')
  const [folderRuleContent, setFolderRuleContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Accordion states
  const [openSections, setOpenSections] = useState({
    templates: true,
    global: false,
    folder: false,
    active: true
  })

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
        toast.success('Global rules saved successfully')
        setIsDirty(false)
      }
    } catch (error) {
      toast.error('Failed to save global rules')
    }
    setSaving(false)
  }

  const addFolderRule = async () => {
    if (!selectedFolder || !folderRuleContent) {
      toast.error('Please enter both folder path and rule content')
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
        toast.success('Folder rule added successfully')
        setSelectedFolder('')
        setFolderRuleContent('')
        loadRules()
      }
    } catch (error) {
      toast.error('Failed to add folder rule')
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

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
        toast.success(enabled ? 'Rule enabled' : 'Rule disabled')
      }
    } catch (error) {
      toast.error('Failed to toggle rule')
    }
  }

  const applyTemplate = (template: any) => {
    setSelectedFolder(template.folder_target || '')
    setFolderRuleContent(template.content)
    toast.success(`Template "${template.name}" loaded`)
    setOpenSections(prev => ({ ...prev, folder: true, templates: false }))
  }

  const exportRules = () => {
    const exportData = {
      name: 'BCI Rules Export',
      version: '2.0',
      timestamp: new Date().toISOString(),
      globalRules,
      folderRules: folderRules.map(r => ({
        folder: r.folder_target,
        content: r.content,
        enabled: r.enabled,
        tags: r.tags,
        priority: r.priority
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bci-rules-${new Date().toISOString().split('T')[0]}.bci-template`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Rules exported successfully')
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
          toast.success('Rules imported successfully')
        } catch (error) {
          toast.error('Invalid file format')
        }
      }
    }
    input.click()
  }

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Filter rules
  const filteredRules = folderRules.filter(rule => {
    const matchesSearch = !searchQuery ||
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.content.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => rule.tags?.includes(tag))

    return matchesSearch && matchesTags
  })

  const activeRulesCount = folderRules.filter(r => r.enabled).length
  const totalRulesCount = folderRules.length

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
                {activeRulesCount} active rules • {totalRulesCount} total
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

        {/* Quick Stats */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              {activeRulesCount} Active
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <Info size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
              {totalRulesCount - activeRulesCount} Inactive
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">

          {/* Template Library */}
          <Accordion
            title="Template Library"
            icon={Package}
            isOpen={openSections.templates}
            onToggle={() => toggleSection('templates')}
            badge={
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                {RULE_TEMPLATES.reduce((acc, cat) => acc + cat.templates.length, 0)} templates
              </span>
            }
          >
            <div className="space-y-6">
              {RULE_TEMPLATES.map((category, catIdx) => (
                <div key={catIdx}>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {category.category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {category.templates.map((template, idx) => {
                      const Icon = template.icon
                      return (
                        <motion.button
                          key={idx}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => applyTemplate(template)}
                          className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:shadow-lg transition-all text-left group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                              <Icon size={20} className="text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {template.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {template.description}
                              </div>
                              {template.tags && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {template.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-xs rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Accordion>

          {/* Global Rules */}
          <Accordion
            title="Global Rules"
            icon={Globe}
            isOpen={openSections.global}
            onToggle={() => toggleSection('global')}
            badge={
              isDirty && (
                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                  Unsaved
                </span>
              )
            }
          >
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                These instructions apply to all AI interactions across the entire project.
              </div>
              <textarea
                value={globalRules}
                onChange={(e) => {
                  setGlobalRules(e.target.value)
                  setIsDirty(true)
                }}
                placeholder="Enter general instructions for the AI...

Example:
• Always follow OWASP methodology
• Document all findings with screenshots
• Use professional language in reports
• Prioritize critical vulnerabilities
• Include remediation steps"
                className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex justify-end">
                <Button
                  onClick={saveGlobalRules}
                  disabled={!isDirty || saving}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Save size={14} className="mr-2" />
                  Save Global Rules
                </Button>
              </div>
            </div>
          </Accordion>

          {/* Folder-Specific Rules */}
          <Accordion
            title="Folder-Specific Rules"
            icon={Folder}
            isOpen={openSections.folder}
            onToggle={() => toggleSection('folder')}
            badge={
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                New
              </span>
            }
          >
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-3">
                  Add New Folder Rule
                </h4>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={selectedFolder}
                      onChange={(e) => setSelectedFolder(e.target.value)}
                      placeholder="Folder path (e.g., /api/endpoints or /security/sqli)"
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    />
                  </div>
                  <textarea
                    value={folderRuleContent}
                    onChange={(e) => setFolderRuleContent(e.target.value)}
                    placeholder="Instructions specific to this folder..."
                    className="w-full h-32 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm resize-none"
                  />
                  <Button
                    onClick={addFolderRule}
                    className="bg-blue-600 hover:bg-blue-700 w-full"
                  >
                    <Plus size={14} className="mr-2" />
                    Add Folder Rule
                  </Button>
                </div>
              </div>
            </div>
          </Accordion>

          {/* Active Rules */}
          <Accordion
            title="Active Rules"
            icon={Zap}
            isOpen={openSections.active}
            onToggle={() => toggleSection('active')}
            badge={
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                {activeRulesCount}
              </span>
            }
          >
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search rules..."
                    className="w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter size={14} className="mr-1" />
                  Filter
                </Button>
              </div>

              {/* Rules List */}
              <div className="space-y-3">
                {filteredRules.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Folder size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No rules found</p>
                    <p className="text-xs mt-1">Add rules using templates or create custom ones</p>
                  </div>
                ) : (
                  filteredRules.map(rule => (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Folder size={16} className="text-purple-600" />
                            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                              {rule.folder_target || 'Global'}
                            </span>
                            {rule.is_template && (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded">
                                Template
                              </span>
                            )}
                            {rule.priority && rule.priority > 3 && (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                                High Priority
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {rule.content}
                          </p>
                          {rule.tags && rule.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {rule.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(v) => toggleRule(rule.id, v)}
                          />
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </Accordion>

        </div>
      </div>
    </div>
  )
}