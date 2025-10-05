'use client'

import { useState, useEffect } from 'react'
import {
  Settings, Save, Brain, Cpu, Key, Plus, Trash2,
  CheckCircle, Loader2, Edit2, Copy, Download, Upload,
  FileText, X, FolderOpen, ChevronRight, ChevronDown, Target, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

interface SettingsProProps {
  projectId: string
  projectName?: string
}

interface Template {
  id: string
  name: string
  category: string
  prompt: string
  variables?: Record<string, string>
  isDefault?: boolean
  created_at?: string
}

// AI Models available (editable by user) - Updated October 2025
const DEFAULT_AI_MODELS = [
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5 (Latest)',
    description: 'Best coding model, strongest for agents & computer use'
  },
  {
    id: 'claude-opus-4-1-20250805',
    name: 'Claude Opus 4.1',
    description: 'Advanced agentic tasks, coding & reasoning'
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    description: 'Standards for coding & advanced reasoning'
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Balanced performance & cost'
  },
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    description: 'Previous generation, great performance'
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Fast & affordable'
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    description: 'Most affordable option'
  }
]

interface AIModel {
  id: string // Model ID pour l'API (editable)
  name: string // Nom affiché (editable)
  description: string // Description (editable)
}

export default function SettingsPro({ projectId, projectName = 'Project' }: SettingsProProps) {
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<Record<string, boolean>>({})
  const [systemPrompt, setSystemPrompt] = useState('')
  const [projectGoal, setProjectGoal] = useState('')
  const [aiModel, setAiModel] = useState('claude-sonnet-4-5-20250929')
  const [apiKeys, setApiKeys] = useState({
    anthropic: '',
    openai: ''
  })
  const [saving, setSaving] = useState(false)
  const [testingApi, setTestingApi] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateCategory, setTemplateCategory] = useState('')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [aiModels, setAiModels] = useState<AIModel[]>(DEFAULT_AI_MODELS)
  const [editingModel, setEditingModel] = useState<string | null>(null)
  const [editingModelData, setEditingModelData] = useState<AIModel | null>(null)
  const [showModelEditor, setShowModelEditor] = useState(false)
  const [apiValidation, setApiValidation] = useState<{ status: 'idle' | 'testing' | 'success' | 'error', message?: string }>({ status: 'idle' })
  const [editingProjectName, setEditingProjectName] = useState(false)
  const [newProjectName, setNewProjectName] = useState(projectName)
  const [showBasePromptModal, setShowBasePromptModal] = useState(false)
  const [basePromptContent, setBasePromptContent] = useState('')
  const [activeTab, setActiveTab] = useState<'general' | 'prompts' | 'templates' | 'models' | 'api'>('general')

  useEffect(() => {
    loadSettings()
    loadTemplates()
    loadCustomModels()
    loadBasePrompt()
  }, [projectId])

  const loadBasePrompt = async () => {
    try {
      const response = await fetch('/api/system-prompt')
      const data = await response.json()
      setBasePromptContent(data.prompt || '')
    } catch (error) {
      console.error('Error loading base prompt:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('name, system_prompt, settings, api_keys, goal')
        .eq('id', projectId)
        .single()

      if (data) {
        setNewProjectName(data.name || projectName)
        setSystemPrompt(data.system_prompt || '')
        setProjectGoal(data.goal || '')
        setAiModel(data.settings?.aiModel || 'claude-3-5-sonnet-20241022')
        setApiKeys(data.api_keys || { anthropic: '', openai: '' })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const loadTemplates = async () => {
    // Load from localStorage or DB
    const savedTemplates = localStorage.getItem(`templates_${projectId}`)
    if (savedTemplates) {
      const parsed = JSON.parse(savedTemplates)
      setTemplates(parsed)

      // Extract categories
      const cats = parsed.reduce((acc: Record<string, boolean>, t: Template) => {
        acc[t.category] = true
        return acc
      }, {})
      setCategories(cats)
    } else {
      // Initialize with default templates
      const defaults: Template[] = [
        {
          id: '1',
          name: 'Bug Bounty - HackerOne',
          category: 'Bug Bounty',
          prompt: `Tu es un expert en bug bounty sur HackerOne.
Focus: Trouver des vulns avec impact critique.
Priorité: RCE, SQLi, Account Takeover.
Format rapport: Impact business clair, POC, remediation.`,
          isDefault: true
        },
        {
          id: '2',
          name: 'Pentest - Web Application',
          category: 'Pentest',
          prompt: `Tu es un pentester professionnel.
Méthodologie: OWASP Top 10.
Documentation: Screenshots, payloads, impact.
Objectif: Sécuriser l'application du client.`,
          isDefault: true
        },
        {
          id: '3',
          name: 'API Security Testing',
          category: 'API',
          prompt: `Tu es spécialisé en sécurité API REST/GraphQL.
Focus: Auth, rate limiting, injection, data exposure.
Tests: Fuzzing, JWT manipulation, versioning issues.`,
          isDefault: true
        }
      ]
      setTemplates(defaults)
      setCategories({ 'Bug Bounty': true, 'Pentest': true, 'API': true })
      localStorage.setItem(`templates_${projectId}`, JSON.stringify(defaults))
    }
  }

  const loadCustomModels = () => {
    const stored = localStorage.getItem('custom_ai_models')
    if (stored) {
      setAiModels(JSON.parse(stored))
    }
  }

  const saveCustomModels = (models: AIModel[]) => {
    localStorage.setItem('custom_ai_models', JSON.stringify(models))
    setAiModels(models)
  }

  const handleSaveModel = (oldId: string, updatedModel: AIModel) => {
    const updatedModels = aiModels.map(m =>
      m.id === oldId ? updatedModel : m
    )
    saveCustomModels(updatedModels)

    // Si le modèle actuel est celui qu'on vient de modifier, mettre à jour
    if (aiModel === oldId) {
      setAiModel(updatedModel.id)
    }

    setShowModelEditor(false)
    setEditingModelData(null)
    toast.success('Model updated')
  }

  const handleAddCustomModel = () => {
    const newModel: AIModel = {
      id: 'claude-3-5-sonnet-20241022',
      name: 'New Custom Model',
      description: 'Custom model configuration'
    }
    setEditingModelData(newModel)
    setShowModelEditor(true)
  }

  const handleDeleteModel = (modelId: string) => {
    if (aiModels.length === 1) {
      toast.error('Cannot delete the last model')
      return
    }

    const updatedModels = aiModels.filter(m => m.id !== modelId)
    saveCustomModels(updatedModels)

    if (aiModel === modelId) {
      setAiModel(updatedModels[0]?.id || 'claude-3-5-sonnet-20241022')
    }
    toast.success('Model deleted')
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          goal: projectGoal,
          system_prompt: systemPrompt,
          settings: {
            aiModel,
            activeTemplateId: activeTemplate?.id
          },
          api_keys: apiKeys
        })
        .eq('id', projectId)

      if (!error) {
        toast.success('Settings saved successfully')
      } else {
        throw error
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    }
    setSaving(false)
  }

  const saveProjectName = async () => {
    if (!newProjectName.trim()) {
      toast.error('Le nom du projet ne peut pas être vide')
      return
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({ name: newProjectName.trim() })
        .eq('id', projectId)

      if (!error) {
        toast.success('Nom du projet mis à jour !')
        setEditingProjectName(false)
        // Reload page to update header
        window.location.reload()
      } else {
        throw error
      }
    } catch (error) {
      console.error('Error saving project name:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleCreateTemplate = () => {
    setEditingTemplate({
      id: `template_${Date.now()}`,
      name: templateName || 'New Template',
      category: templateCategory || 'Custom',
      prompt: systemPrompt || '',
      variables: {}
    })
    setShowTemplateModal(true)
  }

  const handleSaveTemplate = () => {
    if (!editingTemplate) return

    const updatedTemplates = editingTemplate.id.includes('template_')
      ? [...templates, editingTemplate]
      : templates.map(t => t.id === editingTemplate.id ? editingTemplate : t)

    setTemplates(updatedTemplates)
    localStorage.setItem(`templates_${projectId}`, JSON.stringify(updatedTemplates))

    // Update categories
    if (!categories[editingTemplate.category]) {
      setCategories({ ...categories, [editingTemplate.category]: true })
    }

    toast.success('Template saved')
    setShowTemplateModal(false)
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateCategory('')
  }

  const handleDeleteTemplate = (id: string) => {
    if (!confirm('Delete this template?')) return

    const updatedTemplates = templates.filter(t => t.id !== id)
    setTemplates(updatedTemplates)
    localStorage.setItem(`templates_${projectId}`, JSON.stringify(updatedTemplates))
    toast.success('Template deleted')
  }

  const handleApplyTemplate = (template: Template) => {
    setActiveTemplate(template)
    setSystemPrompt(template.prompt)
    toast.success(`Applied template: ${template.name}`)
  }

  const handleDuplicateTemplate = (template: Template) => {
    const duplicate = {
      ...template,
      id: `template_${Date.now()}`,
      name: `${template.name} (Copy)`,
      isDefault: false
    }
    const updatedTemplates = [...templates, duplicate]
    setTemplates(updatedTemplates)
    localStorage.setItem(`templates_${projectId}`, JSON.stringify(updatedTemplates))
    toast.success('Template duplicated')
  }

  const handleExportTemplate = (template: Template) => {
    const data = JSON.stringify(template, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template.name.replace(/\s+/g, '_')}_template.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Template exported')
  }

  const handleImportTemplate = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return

      const text = await file.text()
      try {
        const template = JSON.parse(text)
        template.id = `template_${Date.now()}`
        const updatedTemplates = [...templates, template]
        setTemplates(updatedTemplates)
        localStorage.setItem(`templates_${projectId}`, JSON.stringify(updatedTemplates))
        toast.success('Template imported')
      } catch (error) {
        toast.error('Invalid template file')
      }
    }
    input.click()
  }

  const testApiKey = async () => {
    if (!apiKeys.anthropic) {
      toast.error('Please enter an Anthropic API key')
      return
    }

    setTestingApi(true)
    setApiValidation({ status: 'testing' })

    try {
      // Use server-side route to avoid CORS
      const response = await fetch('/api/test-anthropic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKeys.anthropic,
          model: aiModel.includes('claude') ? aiModel : 'claude-sonnet-4-5'
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setApiValidation({
          status: 'success',
          message: `✓ Connected with ${aiModels.find(m => m.id === aiModel)?.name || aiModel}`
        })
        toast.success('API key is valid!')
      } else {
        setApiValidation({
          status: 'error',
          message: `✗ ${data.error || 'Invalid API key'}`
        })
        toast.error('Invalid API key')
      }
    } catch (error) {
      setApiValidation({
        status: 'error',
        message: '✗ Connection failed'
      })
      toast.error('Failed to test API key')
    }
    setTestingApi(false)
  }

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = []
    acc[template.category].push(template)
    return acc
  }, {} as Record<string, Template[]>)

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Settings },
    { id: 'prompts' as const, label: 'Prompts', icon: Brain },
    { id: 'templates' as const, label: 'Templates', icon: FileText },
    { id: 'models' as const, label: 'AI Models', icon: Cpu },
    { id: 'api' as const, label: 'API Keys', icon: Key }
  ]

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header avec Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 px-6 py-4">
          <Settings className="text-gray-600 dark:text-gray-400" size={24} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Project Settings
          </h2>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-1 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors",
                  activeTab === tab.id
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-t-2 border-x border-gray-200 dark:border-gray-700 border-t-blue-500"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">{/* Templates Sidebar - REMOVED, now in Templates tab */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Prompt Templates
          </h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreateTemplate}
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
            >
              <Plus size={14} className="mr-1" />
              Create
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleImportTemplate}
            >
              <Upload size={14} />
            </Button>
          </div>
        </div>

        {/* Template Tree */}
        <div className="flex-1 overflow-auto p-2">
          {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
            <div key={category} className="mb-2">
              <button
                onClick={() => setCategories({ ...categories, [category]: !categories[category] })}
                className="w-full flex items-center gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-left"
              >
                {categories[category] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <FolderOpen size={14} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {category}
                </span>
                <span className="ml-auto text-xs text-gray-400">
                  {categoryTemplates.length}
                </span>
              </button>

              <AnimatePresence>
                {categories[category] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {categoryTemplates.map(template => (
                      <div
                        key={template.id}
                        className={cn(
                          "group flex items-center gap-2 ml-4 px-2 py-1.5 rounded cursor-pointer",
                          "hover:bg-gray-100 dark:hover:bg-gray-800",
                          activeTemplate?.id === template.id && "bg-blue-50 dark:bg-blue-900/20"
                        )}
                        onClick={() => handleApplyTemplate(template)}
                      >
                        <FileText size={14} className="text-gray-400" />
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                          {template.name}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDuplicateTemplate(template)
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            title="Duplicate"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingTemplate(template)
                              setShowTemplateModal(true)
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            title="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExportTemplate(template)
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            title="Export"
                          >
                            <Download size={12} />
                          </button>
                          {!template.isDefault && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteTemplate(template.id)
                              }}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Main Settings */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="text-gray-600 dark:text-gray-400" size={24} />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Project Settings
              </h2>
            </div>

            {/* Project Name */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="text-green-500" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Project Name
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Edit your project name. This will update across the entire application.
                </p>

                <div className="flex items-center gap-2">
                  {editingProjectName ? (
                    <>
                      <Input
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveProjectName()
                          if (e.key === 'Escape') {
                            setEditingProjectName(false)
                            setNewProjectName(projectName)
                          }
                        }}
                      />
                      <Button onClick={saveProjectName} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingProjectName(false)
                          setNewProjectName(projectName)
                        }}
                      >
                        <X size={16} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {newProjectName}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setEditingProjectName(true)}
                      >
                        <Edit2 size={16} className="mr-2" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Project Goal */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="text-orange-500" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Project Goal
                    </h3>
                  </div>
                  {projectGoal && (
                    <button
                      onClick={() => {
                        if (confirm('Clear project goal?')) {
                          setProjectGoal('')
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Define the main objective for this project. This will be injected into the AI context.
                </p>

                <Textarea
                  value={projectGoal}
                  onChange={(e) => setProjectGoal(e.target.value)}
                  placeholder="Ex: Test the security of https://example.com API for OWASP Top 10 vulnerabilities..."
                  className="min-h-[120px]"
                />
              </div>

              {/* System Prompt */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="text-blue-500" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      System Prompt
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowBasePromptModal(true)}
                      className="text-xs"
                    >
                      <Eye size={14} className="mr-1" />
                      View Base Prompt
                    </Button>
                    {activeTemplate && (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-sm">
                        {activeTemplate.name}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Define how the AI behaves. Use {"{{variables}}"} for dynamic content.
                </p>

                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Enter your system prompt..."
                  className="min-h-[300px] font-mono text-sm"
                />

                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="Template name..."
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Category..."
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-40"
                  />
                  <Button
                    onClick={handleCreateTemplate}
                    disabled={!templateName}
                  >
                    Save as Template
                  </Button>
                </div>
              </div>

              {/* AI Model Selection */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className="text-purple-500" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    AI Model
                  </h3>
                </div>

                <div className="space-y-3">
                  <RadioGroup value={aiModel} onValueChange={setAiModel}>
                    <div className="space-y-2">
                      {aiModels.map((model) => (
                        <label
                          key={model.id}
                          className="group flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        >
                          <RadioGroupItem value={model.id} />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {model.name}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              {model.id}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {model.description}
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setEditingModelData(model)
                                setShowModelEditor(true)
                              }}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                              title="Edit model"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (confirm(`Delete ${model.name}?`)) {
                                  handleDeleteModel(model.id)
                                }
                              }}
                              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </label>
                      ))}
                    </div>
                  </RadioGroup>

                  <Button
                    variant="outline"
                    onClick={handleAddCustomModel}
                    className="w-full"
                    size="sm"
                  >
                    <Plus size={14} className="mr-1" />
                    Add Custom Model
                  </Button>
                </div>
              </div>

              {/* API Keys */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Key className="text-green-500" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    API Keys
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Anthropic API Key
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={apiKeys.anthropic}
                        onChange={(e) => {
                          setApiKeys({ ...apiKeys, anthropic: e.target.value })
                          setApiValidation({ status: 'idle' })
                        }}
                        placeholder="sk-ant-..."
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={testApiKey}
                        disabled={testingApi}
                      >
                        {testingApi ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        Test
                      </Button>
                    </div>

                    {/* Validation Status */}
                    {apiValidation.status !== 'idle' && (
                      <div className={`mt-2 text-sm flex items-center gap-2 ${
                        apiValidation.status === 'success' ? 'text-green-600' :
                        apiValidation.status === 'error' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {apiValidation.status === 'testing' && <Loader2 size={14} className="animate-spin" />}
                        {apiValidation.message}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      OpenAI API Key (Optional)
                    </label>
                    <Input
                      type="password"
                      value={apiKeys.openai}
                      onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                      placeholder="sk-..."
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={saveSettings}
                  disabled={saving}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Editor Modal */}
      <AnimatePresence>
        {showTemplateModal && editingTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Template
                </h3>
                <button
                  onClick={() => {
                    setShowTemplateModal(false)
                    setEditingTemplate(null)
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <Input
                    value={editingTemplate.category}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prompt
                  </label>
                  <Textarea
                    value={editingTemplate.prompt}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, prompt: e.target.value })}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTemplateModal(false)
                      setEditingTemplate(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveTemplate}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Save Template
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Editor Modal */}
      <AnimatePresence>
        {showModelEditor && editingModelData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Model Configuration
                </h3>
                <button
                  onClick={() => {
                    setShowModelEditor(false)
                    setEditingModelData(null)
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Model ID (API identifier)
                  </label>
                  <Input
                    value={editingModelData.id}
                    onChange={(e) => setEditingModelData({ ...editingModelData, id: e.target.value })}
                    placeholder="claude-3-5-sonnet-20241022"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Utilisé pour les appels API</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Name
                  </label>
                  <Input
                    value={editingModelData.name}
                    onChange={(e) => setEditingModelData({ ...editingModelData, name: e.target.value })}
                    placeholder="Claude 3.5 Sonnet"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <Textarea
                    value={editingModelData.description}
                    onChange={(e) => setEditingModelData({ ...editingModelData, description: e.target.value })}
                    className="min-h-[80px]"
                    placeholder="Description du modèle..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowModelEditor(false)
                      setEditingModelData(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const originalModel = aiModels.find(m => m === editingModelData)
                      const isNewModel = !originalModel

                      if (isNewModel) {
                        // C'est un nouveau modèle
                        const updatedModels = [...aiModels, editingModelData]
                        saveCustomModels(updatedModels)
                        setShowModelEditor(false)
                        setEditingModelData(null)
                        toast.success('Model added')
                      } else {
                        // Modification d'un modèle existant
                        handleSaveModel(originalModel.id, editingModelData)
                      }
                    }}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Save Model
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Base Prompt Viewer Modal */}
      <AnimatePresence>
        {showBasePromptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowBasePromptModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Eye className="text-blue-600 dark:text-blue-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Base System Prompt
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Prompt caché injecté automatiquement dans chaque requête
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBasePromptModal(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                    {basePromptContent || 'Chargement...'}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    DEPRECATED
                  </span>
                  <span>Ce prompt sera bientôt supprimé</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(basePromptContent)
                      toast.success('Prompt copié !')
                    }}
                  >
                    <Copy size={14} className="mr-1" />
                    Copier
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowBasePromptModal(false)}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}