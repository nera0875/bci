'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Settings, Save, Download, Upload, Trash2,
  Shield, Brain, Zap, Globe, Key,
  CheckCircle, XCircle, Loader2, AlertCircle,
  Terminal, Database, Server, Cloud, ChevronDown,
  ChevronUp, Eye, EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { exportProject, importProject } from '@/lib/services/exportImportService'
import { supabase } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

interface SettingsUltraProps {
  projectId: string
  projectName?: string
}

interface ProjectSettings {
  aiModel: string
  autoSaveThreshold: number
  autoAcceptThreshold: number
  patternDetectionEnabled: boolean
  folderTargetingEnabled: boolean
  learningMode: 'aggressive' | 'balanced' | 'conservative'
  exportFormat: 'json' | 'markdown' | 'both'
  apiKeys: {
    openai?: string
    anthropic?: string
  }
  apiStatus: {
    openai: 'unconfigured' | 'testing' | 'connected' | 'error'
    anthropic: 'unconfigured' | 'testing' | 'connected' | 'error'
  }
  notifications: {
    suggestions: boolean
    patterns: boolean
    errors: boolean
    weeklyDigest: boolean
  }
}

// Model suggestions
const MODEL_SUGGESTIONS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'gpt-4-turbo-preview',
  'gpt-4',
  'gpt-3.5-turbo'
]

const CollapsibleSection = ({
  title,
  icon: Icon,
  iconColor,
  children,
  defaultOpen = true
}: {
  title: string
  icon: any
  iconColor: string
  children: React.ReactNode
  defaultOpen?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={iconColor} size={20} />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          </div>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
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

export default function SettingsUltra({
  projectId,
  projectName = 'Project'
}: SettingsUltraProps) {
  const [settings, setSettings] = useState<ProjectSettings>({
    aiModel: 'claude-3-5-sonnet-20241022',
    autoSaveThreshold: 0.85,
    autoAcceptThreshold: 0.95,
    patternDetectionEnabled: true,
    folderTargetingEnabled: true,
    learningMode: 'balanced',
    exportFormat: 'both',
    apiKeys: {},
    apiStatus: {
      openai: 'unconfigured',
      anthropic: 'unconfigured'
    },
    notifications: {
      suggestions: true,
      patterns: true,
      errors: true,
      weeklyDigest: false
    }
  })

  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [testingApi, setTestingApi] = useState<'openai' | 'anthropic' | null>(null)
  const [showModelSuggestions, setShowModelSuggestions] = useState(false)
  const modelInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSettings()
  }, [projectId])

  useEffect(() => {
    // Close suggestions on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (modelInputRef.current && !modelInputRef.current.contains(e.target as Node)) {
        setShowModelSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('settings, api_keys')
        .eq('id', projectId)
        .single()

      if (data) {
        const savedSettings = data.settings as any || {}
        const apiKeys = data.api_keys as any || {}

        setSettings(prev => ({
          ...prev,
          ...savedSettings,
          aiModel: savedSettings.aiModel || savedSettings.customModel || 'claude-3-5-sonnet-20241022',
          apiKeys,
          apiStatus: {
            openai: apiKeys.openai ? 'connected' : 'unconfigured',
            anthropic: apiKeys.anthropic ? 'connected' : 'unconfigured'
          }
        }))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          settings: {
            aiModel: settings.aiModel,
            autoSaveThreshold: settings.autoSaveThreshold,
            autoAcceptThreshold: settings.autoAcceptThreshold,
            patternDetectionEnabled: settings.patternDetectionEnabled,
            folderTargetingEnabled: settings.folderTargetingEnabled,
            learningMode: settings.learningMode,
            exportFormat: settings.exportFormat,
            notifications: settings.notifications
          },
          api_keys: settings.apiKeys
        })
        .eq('id', projectId)

      if (!error) {
        toast.success('Settings saved successfully')
        setIsDirty(false)
      } else {
        throw error
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    }
    setSaving(false)
  }

  const testApiConnection = async (service: 'openai' | 'anthropic') => {
    const apiKey = settings.apiKeys[service]
    if (!apiKey) {
      toast.error(`Please enter ${service === 'openai' ? 'OpenAI' : 'Anthropic'} API key`)
      return
    }

    setTestingApi(service)
    updateSetting(`apiStatus.${service}`, 'testing')

    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, apiKey })
      })

      const result = await response.json()

      if (result.success) {
        updateSetting(`apiStatus.${service}`, 'connected')
        toast.success(`${service === 'openai' ? 'OpenAI' : 'Anthropic'} connected successfully`)
        // Auto-save after successful connection
        setTimeout(saveSettings, 500)
      } else {
        updateSetting(`apiStatus.${service}`, 'error')
        toast.error(`Failed to connect to ${service === 'openai' ? 'OpenAI' : 'Anthropic'}`)
      }
    } catch (error) {
      updateSetting(`apiStatus.${service}`, 'error')
      toast.error('Connection test failed')
    }

    setTestingApi(null)
  }

  const updateSetting = (path: string, value: any) => {
    const keys = path.split('.')
    setSettings(prev => {
      const updated = { ...prev }
      let current: any = updated

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value

      setIsDirty(true)
      return updated
    })
  }

  const handleExport = async () => {
    try {
      await exportProject(projectId, projectName)
      toast.success('Project exported successfully')
    } catch (error) {
      toast.error('Failed to export project')
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.bci,.bci-template'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        await importProject(projectId, file)
        toast.success('Project imported successfully')
        window.location.reload()
      }
    }
    input.click()
  }

  const StatusIndicator = ({ status }: { status: string }) => {
    switch (status) {
      case 'connected':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1"
          >
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-xs text-green-600">Connected</span>
          </motion.div>
        )
      case 'error':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1"
          >
            <XCircle size={16} className="text-red-500" />
            <span className="text-xs text-red-600">Error</span>
          </motion.div>
        )
      case 'testing':
        return (
          <motion.div className="flex items-center gap-1">
            <Loader2 size={16} className="text-blue-500 animate-spin" />
            <span className="text-xs text-blue-600">Testing...</span>
          </motion.div>
        )
      default:
        return (
          <div className="flex items-center gap-1">
            <AlertCircle size={16} className="text-gray-400" />
            <span className="text-xs text-gray-500">Not configured</span>
          </div>
        )
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="text-gray-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Project Settings
              </h2>
              <p className="text-sm text-gray-500">
                Configure AI behavior and system preferences
              </p>
            </div>
          </div>

          <Button
            variant={isDirty ? 'default' : 'outline'}
            onClick={saveSettings}
            disabled={!isDirty || saving}
          >
            {saving ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* AI Model Configuration */}
          <CollapsibleSection
            title="AI Model Configuration"
            icon={Brain}
            iconColor="text-blue-600"
          >
            <div className="space-y-4">
              {/* Direct Model Input */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  AI Model Name
                </label>
                <div className="relative" ref={modelInputRef}>
                  <input
                    type="text"
                    value={settings.aiModel}
                    onChange={(e) => {
                      updateSetting('aiModel', e.target.value)
                      setShowModelSuggestions(true)
                    }}
                    onFocus={() => setShowModelSuggestions(true)}
                    placeholder="e.g., claude-3-5-sonnet-20241022"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  {/* Model Suggestions Dropdown */}
                  {showModelSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-auto"
                    >
                      {MODEL_SUGGESTIONS
                        .filter(model =>
                          model.toLowerCase().includes(settings.aiModel.toLowerCase())
                        )
                        .map(model => (
                          <button
                            key={model}
                            onClick={() => {
                              updateSetting('aiModel', model)
                              setShowModelSuggestions(false)
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                          >
                            {model}
                          </button>
                        ))}
                    </motion.div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter the exact model identifier from Anthropic or OpenAI
                </p>
              </div>

              {/* Learning Mode */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Learning Mode
                </label>
                <select
                  value={settings.learningMode}
                  onChange={(e) => updateSetting('learningMode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                >
                  <option value="conservative">Conservative (Slower, more accurate)</option>
                  <option value="balanced">Balanced (Recommended)</option>
                  <option value="aggressive">Aggressive (Faster, more suggestions)</option>
                </select>
              </div>
            </div>
          </CollapsibleSection>

          {/* API Keys with Validation */}
          <CollapsibleSection
            title="API Keys"
            icon={Key}
            iconColor="text-purple-600"
          >
            <div className="space-y-4">
              {/* Anthropic API Key */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Anthropic API Key (Claude)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type={showApiKeys ? 'text' : 'password'}
                        value={settings.apiKeys.anthropic || ''}
                        onChange={(e) => updateSetting('apiKeys.anthropic', e.target.value)}
                        placeholder="sk-ant-..."
                        className="w-full px-3 py-2 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 font-mono text-sm"
                      />
                      <button
                        onClick={() => setShowApiKeys(!showApiKeys)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {showApiKeys ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="mt-2">
                      <StatusIndicator status={settings.apiStatus.anthropic} />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => testApiConnection('anthropic')}
                    disabled={testingApi === 'anthropic'}
                    className="min-w-[80px]"
                  >
                    {testingApi === 'anthropic' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
              </div>

              {/* OpenAI API Key */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  OpenAI API Key (Embeddings)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type={showApiKeys ? 'text' : 'password'}
                        value={settings.apiKeys.openai || ''}
                        onChange={(e) => updateSetting('apiKeys.openai', e.target.value)}
                        placeholder="sk-..."
                        className="w-full px-3 py-2 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 font-mono text-sm"
                      />
                      <button
                        onClick={() => setShowApiKeys(!showApiKeys)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {showApiKeys ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="mt-2">
                      <StatusIndicator status={settings.apiStatus.openai} />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => testApiConnection('openai')}
                    disabled={testingApi === 'openai'}
                    className="min-w-[80px]"
                  >
                    {testingApi === 'openai' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Thresholds */}
          <CollapsibleSection
            title="Auto-Optimization Thresholds"
            icon={Zap}
            iconColor="text-amber-600"
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-save Threshold
                  </label>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                    {Math.round(settings.autoSaveThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={settings.autoSaveThreshold * 100}
                  onChange={(e) => updateSetting('autoSaveThreshold', Number(e.target.value) / 100)}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-accept Threshold
                  </label>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                    {Math.round(settings.autoAcceptThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="100"
                  value={settings.autoAcceptThreshold * 100}
                  onChange={(e) => updateSetting('autoAcceptThreshold', Number(e.target.value) / 100)}
                  className="w-full"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Features */}
          <CollapsibleSection
            title="Features"
            icon={Terminal}
            iconColor="text-green-600"
            defaultOpen={false}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Pattern Detection
                </label>
                <Switch
                  checked={settings.patternDetectionEnabled}
                  onCheckedChange={(v) => updateSetting('patternDetectionEnabled', v)}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Folder-based Rule Targeting
                </label>
                <Switch
                  checked={settings.folderTargetingEnabled}
                  onCheckedChange={(v) => updateSetting('folderTargetingEnabled', v)}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Import/Export */}
          <CollapsibleSection
            title="Data Management"
            icon={Shield}
            iconColor="text-gray-600"
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="flex-1"
                >
                  <Download size={16} className="mr-2" />
                  Export Project
                </Button>
                <Button
                  variant="outline"
                  onClick={handleImport}
                  className="flex-1"
                >
                  <Upload size={16} className="mr-2" />
                  Import Project
                </Button>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex gap-2">
                  <Database className="text-blue-600 mt-0.5" size={16} />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Export Formats</p>
                    <p>.bci - Full project backup</p>
                    <p>.bci-template - Shareable rules template</p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>

        </div>
      </div>
    </div>
  )
}