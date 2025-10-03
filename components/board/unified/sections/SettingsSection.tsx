'use client'

import { useState, useEffect } from 'react'
import {
  Settings, Save, Download, Upload, Trash2,
  Shield, Brain, Zap, Globe, Key,
  ToggleLeft, ToggleRight, Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { exportProject, importProject } from '@/lib/services/exportImportService'

interface SettingsSectionProps {
  projectId: string
  projectName?: string
}

interface ProjectSettings {
  aiModel: 'claude-3.5-sonnet' | 'gpt-4' | 'claude-3-opus'
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
  notifications: {
    suggestions: boolean
    patterns: boolean
    errors: boolean
    weeklyDigest: boolean
  }
}

export default function SettingsSection({
  projectId,
  projectName = 'Project'
}: SettingsSectionProps) {
  const [settings, setSettings] = useState<ProjectSettings>({
    aiModel: 'claude-3.5-sonnet',
    autoSaveThreshold: 0.85,
    autoAcceptThreshold: 0.95,
    patternDetectionEnabled: true,
    folderTargetingEnabled: true,
    learningMode: 'balanced',
    exportFormat: 'both',
    apiKeys: {},
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

  useEffect(() => {
    loadSettings()
  }, [projectId])

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/settings`)
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast.success('Settings saved successfully')
        setIsDirty(false)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    }
    setSaving(false)
  }

  const handleExport = async () => {
    try {
      await exportProject(projectId, projectName)
      toast.success('Project exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export project')
    }
  }

  const handleImport = async () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.bci'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          await importProject(projectId, file)
          toast.success('Project imported successfully')
          window.location.reload()
        }
      }
      input.click()
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import project')
    }
  }

  const updateSetting = (path: string, value: any) => {
    const keys = path.split('.')
    const updated = { ...settings }
    let current: any = updated

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value

    setSettings(updated)
    setIsDirty(true)
  }

  const ToggleSwitch = ({
    enabled,
    onChange,
    label
  }: {
    enabled: boolean
    onChange: (value: boolean) => void
    label: string
  }) => (
    <button
      onClick={() => onChange(!enabled)}
      className="flex items-center justify-between w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
    >
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      {enabled ? (
        <ToggleRight className="text-blue-600" size={20} />
      ) : (
        <ToggleLeft className="text-gray-400" size={20} />
      )}
    </button>
  )

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
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* AI Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Brain className="text-blue-600" size={20} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  AI Configuration
                </h3>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  AI Model
                </label>
                <select
                  value={settings.aiModel}
                  onChange={(e) => updateSetting('aiModel', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                >
                  <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                  <option value="gpt-4">GPT-4</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Learning Mode
                </label>
                <select
                  value={settings.learningMode}
                  onChange={(e) => updateSetting('learningMode', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                >
                  <option value="conservative">Conservative (Slower, more accurate)</option>
                  <option value="balanced">Balanced (Recommended)</option>
                  <option value="aggressive">Aggressive (Faster, more suggestions)</option>
                </select>
              </div>

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
                <Zap className="text-amber-600" size={20} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Features
                </h3>
              </div>
            </div>
            <div className="p-4">
              <ToggleSwitch
                enabled={settings.patternDetectionEnabled}
                onChange={(v) => updateSetting('patternDetectionEnabled', v)}
                label="Pattern Detection"
              />
              <ToggleSwitch
                enabled={settings.folderTargetingEnabled}
                onChange={(v) => updateSetting('folderTargetingEnabled', v)}
                label="Folder-based Rule Targeting"
              />
            </div>
          </div>

          {/* API Keys */}
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
                  {showApiKeys ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  OpenAI API Key
                </label>
                <input
                  type={showApiKeys ? 'text' : 'password'}
                  value={settings.apiKeys.openai || ''}
                  onChange={(e) => updateSetting('apiKeys.openai', e.target.value)}
                  placeholder="sk-..."
                  className="mt-1 w-full px-3 py-2 border rounded-lg font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Anthropic API Key
                </label>
                <input
                  type={showApiKeys ? 'text' : 'password'}
                  value={settings.apiKeys.anthropic || ''}
                  onChange={(e) => updateSetting('apiKeys.anthropic', e.target.value)}
                  placeholder="sk-ant-..."
                  className="mt-1 w-full px-3 py-2 border rounded-lg font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Globe className="text-green-600" size={20} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Notifications
                </h3>
              </div>
            </div>
            <div className="p-4">
              <ToggleSwitch
                enabled={settings.notifications.suggestions}
                onChange={(v) => updateSetting('notifications.suggestions', v)}
                label="New Suggestions"
              />
              <ToggleSwitch
                enabled={settings.notifications.patterns}
                onChange={(v) => updateSetting('notifications.patterns', v)}
                label="Pattern Detections"
              />
              <ToggleSwitch
                enabled={settings.notifications.errors}
                onChange={(v) => updateSetting('notifications.errors', v)}
                label="Error Alerts"
              />
              <ToggleSwitch
                enabled={settings.notifications.weeklyDigest}
                onChange={(v) => updateSetting('notifications.weeklyDigest', v)}
                label="Weekly Performance Digest"
              />
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

              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex gap-2">
                  <Info className="text-amber-600 mt-0.5" size={16} />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium mb-1">Export Information</p>
                    <p>Exports include all memory nodes, rules, and settings in .bci format.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="p-4 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <Trash2 className="text-red-600" size={20} />
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Danger Zone
                </h3>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                These actions are irreversible. Please be certain.
              </p>
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-100 dark:hover:bg-red-950"
                onClick={() => {
                  if (confirm('Are you sure you want to reset all AI learning data?')) {
                    toast.info('Learning data reset')
                  }
                }}
              >
                Reset Learning Data
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}