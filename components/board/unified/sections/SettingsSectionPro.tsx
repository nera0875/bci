'use client'

import { useState, useEffect } from 'react'
import {
  Settings, Save, Download, Upload, Trash2,
  Shield, Brain, Zap, Globe, Key,
  CheckCircle, XCircle, Loader2, AlertCircle,
  Terminal, Database, Server, Cloud
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { exportProject, importProject } from '@/lib/services/exportImportService'
import { supabase } from '@/lib/supabase/client'

interface SettingsSectionProps {
  projectId: string
  projectName?: string
}

interface ProjectSettings {
  aiModel: string // Now accepts custom models
  customModel: string // For user input
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

// Preset models
const CLAUDE_MODELS = [
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  { value: 'custom', label: 'Custom Model' }
]

const GPT_MODELS = [
  { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
]

export default function SettingsSectionPro({
  projectId,
  projectName = 'Project'
}: SettingsSectionProps) {
  const [settings, setSettings] = useState<ProjectSettings>({
    aiModel: 'claude-3-5-sonnet-20241022',
    customModel: '',
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

  useEffect(() => {
    loadSettings()
  }, [projectId])

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
            aiModel: settings.aiModel === 'custom' ? settings.customModel : settings.aiModel,
            customModel: settings.customModel,
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
        return <CheckCircle size={16} className="text-green-500" />
      case 'error':
        return <XCircle size={16} className="text-red-500" />
      case 'testing':
        return <Loader2 size={16} className="text-blue-500 animate-spin" />
      default:
        return <AlertCircle size={16} className="text-gray-400" />
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
        <div className="max-w-4xl mx-auto space-y-6">

          {/* AI Model Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Brain className="text-blue-600" size={20} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  AI Model Configuration
                </h3>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Select Model
                </label>
                <select
                  value={settings.aiModel}
                  onChange={(e) => updateSetting('aiModel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                >
                  <optgroup label="Claude Models">
                    {CLAUDE_MODELS.map(model => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="GPT Models">
                    {GPT_MODELS.map(model => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Custom Model Input */}
              {settings.aiModel === 'custom' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Custom Model Name
                  </label>
                  <input
                    type="text"
                    value={settings.customModel}
                    onChange={(e) => updateSetting('customModel', e.target.value)}
                    placeholder="e.g., claude-3-5-sonnet-20241022"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the exact model identifier from Anthropic or OpenAI
                  </p>
                </div>
              )}

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
          </div>

          {/* API Keys with Validation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="text-purple-600" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    API Keys
                  </h3>
                </div>
                <button
                  onClick={() => setShowApiKeys(!showApiKeys)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showApiKeys ? 'Hide' : 'Show'} Keys
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {/* Anthropic API Key */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Anthropic API Key (Claude)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showApiKeys ? 'text' : 'password'}
                      value={settings.apiKeys.anthropic || ''}
                      onChange={(e) => updateSetting('apiKeys.anthropic', e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 font-mono text-sm"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <StatusIndicator status={settings.apiStatus.anthropic} />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => testApiConnection('anthropic')}
                    disabled={testingApi === 'anthropic'}
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
                  <div className="flex-1 relative">
                    <input
                      type={showApiKeys ? 'text' : 'password'}
                      value={settings.apiKeys.openai || ''}
                      onChange={(e) => updateSetting('apiKeys.openai', e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 font-mono text-sm"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <StatusIndicator status={settings.apiStatus.openai} />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => testApiConnection('openai')}
                    disabled={testingApi === 'openai'}
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
          </div>

          {/* Thresholds */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Zap className="text-amber-600" size={20} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Auto-Optimization Thresholds
                </h3>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-save Threshold
                  </label>
                  <span className="text-sm text-gray-500">
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
                  <span className="text-sm text-gray-500">
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
          </div>

          {/* Features */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Terminal className="text-green-600" size={20} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Features
                </h3>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Pattern Detection
                </label>
                <Switch
                  checked={settings.patternDetectionEnabled}
                  onCheckedChange={(v) => updateSetting('patternDetectionEnabled', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Folder-based Rule Targeting
                </label>
                <Switch
                  checked={settings.folderTargetingEnabled}
                  onCheckedChange={(v) => updateSetting('folderTargetingEnabled', v)}
                />
              </div>
            </div>
          </div>

          {/* Import/Export */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Shield className="text-gray-600" size={20} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Data Management
                </h3>
              </div>
            </div>
            <div className="p-4 space-y-4">
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
          </div>

        </div>
      </div>
    </div>
  )
}