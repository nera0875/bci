'use client'

import { useState, useEffect } from 'react'
import {
  Settings, Save, Brain, Cpu, Key, Plus, Trash2,
  CheckCircle, Loader2, Edit2, Copy, Download, Upload,
  FileText, X, FolderOpen, ChevronRight, ChevronDown, Target, Eye, Sparkles
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

interface SettingsProV2Props {
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
}

interface AIModel {
  id: string
  name: string
  description: string
}

const DEFAULT_AI_MODELS: AIModel[] = [
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (Latest)', description: 'Best coding model' },
  { id: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1', description: 'Advanced agentic tasks' },
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', description: 'Previous generation' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast & affordable' }
]

export default function SettingsProV2({ projectId, projectName = 'Project' }: SettingsProV2Props) {
  const [activeTab, setActiveTab] = useState<'general' | 'models' | 'api' | 'memory'>('general')
  const [projectGoal, setProjectGoal] = useState('')
  const [aiModel, setAiModel] = useState('claude-sonnet-4-5-20250929')
  const [apiKeys, setApiKeys] = useState({ anthropic: '', openai: '' })
  const [saving, setSaving] = useState(false)
  const [aiModels, setAiModels] = useState<AIModel[]>(DEFAULT_AI_MODELS)
  const [editingProjectName, setEditingProjectName] = useState(false)
  const [newProjectName, setNewProjectName] = useState(projectName)

  // AI Text Assistant settings
  const [aiTextAssistant, setAiTextAssistant] = useState({
    enabled: false,
    shortcut: 'Ctrl+Shift+P'
  })

  // Memory Search Settings
  const [memorySearch, setMemorySearch] = useState({
    enabled: true,
    similarityThreshold: 0.7, // 0.0 à 1.0
    maxResults: 5, // Nombre max de facts retournés
    minConfidence: 0.6 // Seuil minimum de confiance
  })

  useEffect(() => {
    loadSettings()
  }, [projectId])

  const loadSettings = async () => {
    const { data } = await supabase
      .from('projects')
      .select('name, settings, api_keys, goal')
      .eq('id', projectId)
      .single()

    if (data) {
      setNewProjectName(data.name || projectName)
      setProjectGoal(data.goal || '')
      setAiModel(data.settings?.aiModel || 'claude-sonnet-4-5-20250929')
      setApiKeys(data.api_keys || { anthropic: '', openai: '' })
      setAiTextAssistant(data.settings?.aiTextAssistant || { enabled: false, shortcut: 'Ctrl+Shift+P' })
      setMemorySearch(data.settings?.memorySearch || {
        enabled: true,
        similarityThreshold: 0.7,
        maxResults: 5,
        minConfidence: 0.6
      })
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          goal: projectGoal,
          settings: { aiModel, aiTextAssistant, memorySearch },
          api_keys: apiKeys
        })
        .eq('id', projectId)

      if (!error) {
        toast.success('Settings saved!')
        // Dispatch event to update FloatingAIButton
        window.dispatchEvent(new CustomEvent('ai-text-assistant-settings-changed', {
          detail: aiTextAssistant
        }))
        // Dispatch event to update memory search settings
        window.dispatchEvent(new CustomEvent('memory-search-settings-changed', {
          detail: memorySearch
        }))
      } else {
        throw error
      }
    } catch (error) {
      toast.error('Failed to save settings')
    }
    setSaving(false)
  }

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Settings },
    { id: 'models' as const, label: 'AI Models', icon: Cpu },
    { id: 'api' as const, label: 'API Keys', icon: Key },
    { id: 'memory' as const, label: 'Memory Search', icon: Brain }
  ]

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header + Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 px-6 py-4">
          <Settings className="text-gray-600 dark:text-gray-400" size={24} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Project Settings</h2>
        </div>

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
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Project Name */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="text-green-500" size={20} />
                  <h3 className="text-lg font-semibold">Project Name</h3>
                </div>
                <div className="flex gap-2">
                  {editingProjectName ? (
                    <>
                      <Input
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button onClick={async () => {
                        await supabase.from('projects').update({ name: newProjectName }).eq('id', projectId)
                        setEditingProjectName(false)
                        toast.success('Name updated!')
                      }}>
                        <CheckCircle size={16} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg">
                        <span className="font-medium">{newProjectName}</span>
                      </div>
                      <Button variant="outline" onClick={() => setEditingProjectName(true)}>
                        <Edit2 size={16} className="mr-2" /> Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Project Goal */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="text-orange-500" size={20} />
                  <h3 className="text-lg font-semibold">Project Goal</h3>
                </div>
                <Textarea
                  value={projectGoal}
                  onChange={(e) => setProjectGoal(e.target.value)}
                  placeholder="Describe the main objective..."
                  className="min-h-[120px]"
                />
              </div>

              {/* AI Text Assistant */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="text-purple-500" size={20} />
                  <h3 className="text-lg font-semibold">AI Text Assistant</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Bouton flottant pour améliorer n'importe quel texte sélectionné sur la page
                </p>

                <div className="space-y-4">
                  {/* Enable Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-sm">Activer l'assistant</label>
                      <p className="text-xs text-gray-500 mt-1">Afficher le bouton flottant draggable</p>
                    </div>
                    <Switch
                      checked={aiTextAssistant.enabled}
                      onCheckedChange={(checked) => setAiTextAssistant({ ...aiTextAssistant, enabled: checked })}
                    />
                  </div>

                  {/* Shortcut Input */}
                  <div>
                    <label className="block font-medium text-sm mb-2">Raccourci clavier</label>
                    <Input
                      value={aiTextAssistant.shortcut}
                      onChange={(e) => setAiTextAssistant({ ...aiTextAssistant, shortcut: e.target.value })}
                      placeholder="Ex: Ctrl+Shift+P, Alt+A"
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Exemples: <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+Shift+P</code>,
                      <code className="ml-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Alt+A</code>,
                      <code className="ml-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+Alt+I</code>
                    </p>
                  </div>

                  {/* Usage Instructions */}
                  {aiTextAssistant.enabled && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                      <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                        💡 Comment l'utiliser :
                      </p>
                      <ol className="text-xs text-purple-800 dark:text-purple-200 space-y-1 list-decimal list-inside">
                        <li>Sélectionnez du texte n'importe où sur la page</li>
                        <li>Cliquez sur le bouton flottant ✨ ou utilisez le raccourci</li>
                        <li>Modifiez et améliorez avec l'IA</li>
                        <li>Copiez le résultat amélioré</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Models Tab */}
          {activeTab === 'models' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="text-purple-500" size={20} />
                <h3 className="text-lg font-semibold">AI Model Selection</h3>
              </div>
              <RadioGroup value={aiModel} onValueChange={setAiModel}>
                <div className="space-y-2">
                  {aiModels.map((model) => (
                    <label
                      key={model.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <RadioGroupItem value={model.id} />
                      <div className="flex-1">
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{model.id}</div>
                        <div className="text-sm text-gray-500">{model.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Key className="text-green-500" size={20} />
                <h3 className="text-lg font-semibold">API Keys</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Anthropic API Key</label>
                  <Input
                    type="password"
                    value={apiKeys.anthropic}
                    onChange={(e) => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                    placeholder="sk-ant-..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">OpenAI API Key (Optional)</label>
                  <Input
                    type="password"
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                    placeholder="sk-..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Memory Search Tab */}
          {activeTab === 'memory' && (
            <div className="space-y-6">
              {/* Enable/Disable */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="text-blue-500" size={20} />
                    <h3 className="text-lg font-semibold">Recherche de similarité</h3>
                  </div>
                  <Switch
                    checked={memorySearch.enabled}
                    onCheckedChange={(checked) => setMemorySearch({ ...memorySearch, enabled: checked })}
                  />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Active la recherche intelligente dans la mémoire en utilisant des embeddings vectoriels.
                </p>
              </div>

              {/* Similarity Threshold */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Seuil de similarité</label>
                    <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {memorySearch.similarityThreshold.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={memorySearch.similarityThreshold}
                    onChange={(e) => setMemorySearch({ ...memorySearch, similarityThreshold: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                </div>
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  <p>🎯 <strong>0.9-1.0</strong> : Quasi identique (très peu de résultats)</p>
                  <p>💎 <strong>0.8-0.9</strong> : Très similaire (recommandé pour précision)</p>
                  <p>✅ <strong>0.7-0.8</strong> : Similaire (bon équilibre) <span className="text-blue-500">← Défaut</span></p>
                  <p>🔍 <strong>0.6-0.7</strong> : Vaguement lié (plus de résultats)</p>
                  <p>⚠️ <strong>&lt;0.6</strong> : Peu pertinent (beaucoup de bruit)</p>
                </div>
              </div>

              {/* Max Results */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Résultats maximum</label>
                    <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {memorySearch.maxResults}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={memorySearch.maxResults}
                    onChange={(e) => setMemorySearch({ ...memorySearch, maxResults: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Nombre maximum de facts retournés par recherche. <strong>Plus = plus de contexte mais plus de tokens</strong>.
                </p>
              </div>

              {/* Min Confidence */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Confiance minimum</label>
                    <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {memorySearch.minConfidence.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={memorySearch.minConfidence}
                    onChange={(e) => setMemorySearch({ ...memorySearch, minConfidence: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Filtre les résultats en dessous de ce niveau de confiance. <strong>Plus haut = plus de qualité</strong>.
                </p>
              </div>

              {/* Info Card */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <Sparkles className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-semibold mb-2">💡 Conseils d'utilisation</p>
                    <ul className="space-y-1 text-xs">
                      <li>• <strong>Trop de résultats vides ?</strong> → Baisse le seuil de similarité à 0.6-0.65</li>
                      <li>• <strong>Trop de résultats non pertinents ?</strong> → Monte le seuil à 0.75-0.8</li>
                      <li>• <strong>Optimiser les coûts ?</strong> → Réduis les résultats max à 3-5</li>
                      <li>• <strong>Maximum de contexte ?</strong> → Monte à 10-15 résultats avec seuil 0.7</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={saveSettings} disabled={saving} className="bg-gray-900 hover:bg-gray-800">
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
  )
}
