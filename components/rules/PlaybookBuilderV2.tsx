'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Save, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { FolderSelector } from './FolderSelector'
import AITextEditorModal from '@/components/editor/AITextEditorModal'
import { toast } from 'sonner'

interface PlaybookData {
  id?: string
  name: string
  description?: string
  category?: string  // Dynamic, user-defined
  trigger_type: 'endpoint' | 'context' | 'pattern' | 'manual'
  trigger_config: any
  target_folders?: string[]
  action_type: 'extract' | 'test' | 'store' | 'analyze'
  action_config: any
  enabled: boolean
}

interface PlaybookBuilderV2Props {
  projectId: string
  initialData?: Partial<PlaybookData>
  onSave: (data: PlaybookData) => void
  onCancel: () => void
}

export function PlaybookBuilderV2({ projectId, initialData, onSave, onCancel }: PlaybookBuilderV2Props) {
  // États de base
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [category, setCategory] = useState(initialData?.category || '')

  // Déclencheur
  const [triggerType, setTriggerType] = useState<PlaybookData['trigger_type']>(initialData?.trigger_type || 'manual')
  const [triggerConfig, setTriggerConfig] = useState<any>(initialData?.trigger_config || {})

  // Ciblage folders (facultatif)
  const [enableFolderTargeting, setEnableFolderTargeting] = useState(
    initialData?.target_folders && initialData.target_folders.length > 0
  )
  const [targetFolders, setTargetFolders] = useState<string[]>(initialData?.target_folders || [])

  // Actions
  const [actionType, setActionType] = useState<PlaybookData['action_type']>(initialData?.action_type || 'test')
  const [actionConfig, setActionConfig] = useState<any>(initialData?.action_config || {})

  // Navigation par onglets
  const [activeTab, setActiveTab] = useState<'basic' | 'trigger' | 'folders' | 'action'>('basic')

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Nom du playbook requis')
      return
    }

    const playbook: PlaybookData = {
      id: initialData?.id,
      name: name.trim(),
      description: description.trim(),
      category,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      target_folders: enableFolderTargeting ? targetFolders : undefined,
      action_type: actionType,
      action_config: actionConfig,
      enabled: false // User doit activer manuellement
    }

    onSave(playbook)
  }

  const tabs = [
    { id: 'basic' as const, label: 'Basic Info', icon: '📝' },
    { id: 'trigger' as const, label: 'Trigger', icon: '🎯' },
    { id: 'folders' as const, label: 'Folders', icon: '📁' },
    { id: 'action' as const, label: 'Action', icon: '⚡' }
  ]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {initialData?.id ? 'Edit Playbook' : 'New Playbook'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {initialData?.id ? 'Modify your automation rule' : 'Create a new automation rule'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs + Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-800 p-4 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                  activeTab === tab.id
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* TAB: Basic Info */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Test API authentication endpoints"
                    className="text-base h-11"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                      Description <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <AITextEditorModal
                      value={description}
                      onChange={setDescription}
                      projectId={projectId}
                      buttonText="✏️ Prompt"
                      label="Description du Playbook"
                      placeholder="What does this playbook do?"
                      context="This is a security playbook description for bug bounty and pentesting automation. Keep it clear, professional, and actionable (2-4 sentences max)."
                      minHeight="300px"
                    />
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this playbook do?"
                    rows={3}
                    className="text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Category <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: 🔐 Authentication, 🔌 API Testing, ⚙️ Custom..."
                    className="text-base h-11"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    You can use emojis to organize your playbooks visually
                  </p>
                </div>
              </div>
            )}

            {/* TAB: Trigger */}
            {activeTab === 'trigger' && (
              <div className="space-y-4">

              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="trigger-endpoint"
                  checked={triggerType === 'endpoint'}
                  onChange={() => setTriggerType('endpoint')}
                  className="w-4 h-4"
                />
                <label htmlFor="trigger-endpoint" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900 dark:text-white">Endpoint Match</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">When URL matches a pattern</div>
                </label>
              </div>

              {triggerType === 'endpoint' && (
                <div className="ml-7 space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">URL Pattern</label>
                    <Input
                      value={triggerConfig.url_pattern || ''}
                      onChange={(e) => setTriggerConfig({ ...triggerConfig, url_pattern: e.target.value })}
                      placeholder="/api/users/* ou /checkout"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Méthode HTTP</label>
                    <div className="flex gap-2">
                      {['GET', 'POST', 'PUT', 'DELETE'].map(method => (
                        <button
                          key={method}
                          onClick={() => setTriggerConfig({ ...triggerConfig, http_method: method })}
                          className={`px-3 py-1.5 rounded border text-sm ${
                            triggerConfig.http_method === method
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="trigger-context"
                  checked={triggerType === 'context'}
                  onChange={() => setTriggerType('context')}
                  className="w-4 h-4"
                />
                <label htmlFor="trigger-context" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900 dark:text-white">Context Detected</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">When message contains keywords</div>
                </label>
              </div>

              {triggerType === 'context' && (
                <div className="ml-7 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <label className="block text-sm font-medium mb-1.5">Mots-clés (séparés par virgule)</label>
                  <Input
                    value={triggerConfig.keywords?.join(', ') || ''}
                    onChange={(e) => setTriggerConfig({ ...triggerConfig, keywords: e.target.value.split(',').map((k: string) => k.trim()) })}
                    placeholder="auth, login, token"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="trigger-pattern"
                  checked={triggerType === 'pattern'}
                  onChange={() => setTriggerType('pattern')}
                  className="w-4 h-4"
                />
                <label htmlFor="trigger-pattern" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900 dark:text-white">Pattern Success Rate</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">When pattern has high success rate</div>
                </label>
              </div>

              {triggerType === 'pattern' && (
                <div className="ml-7 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <label className="block text-sm font-medium mb-1.5">Success Rate minimum (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={triggerConfig.min_success_rate ? triggerConfig.min_success_rate * 100 : 70}
                    onChange={(e) => setTriggerConfig({ ...triggerConfig, min_success_rate: Number(e.target.value) / 100 })}
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="trigger-manual"
                  checked={triggerType === 'manual'}
                  onChange={() => setTriggerType('manual')}
                  className="w-4 h-4"
                />
                <label htmlFor="trigger-manual" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900 dark:text-white">Manual Only</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">You decide when to run this</div>
                </label>
              </div>
              </div>
            )}

            {/* TAB: Folders */}
            {activeTab === 'folders' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Enable Folder Targeting
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Apply this playbook only to specific folders
                    </p>
                  </div>
                  <Switch
                    checked={enableFolderTargeting}
                    onCheckedChange={setEnableFolderTargeting}
                  />
                </div>

                {enableFolderTargeting && (
                  <FolderSelector
                    projectId={projectId}
                    selectedFolders={targetFolders}
                    onChange={setTargetFolders}
                  />
                )}
              </div>
            )}

            {/* TAB: Action */}
            {activeTab === 'action' && (
              <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="action-extract"
                  checked={actionType === 'extract'}
                  onChange={() => setActionType('extract')}
                  className="w-4 h-4"
                />
                <label htmlFor="action-extract" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900 dark:text-white">Extract Parameter</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Extract a parameter from the request</div>
                </label>
              </div>

              {actionType === 'extract' && (
                <div className="ml-7 space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Nom du paramètre</label>
                    <Input
                      value={actionConfig.parameter || ''}
                      onChange={(e) => setActionConfig({ ...actionConfig, parameter: e.target.value })}
                      placeholder="id, token, user_id..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Type</label>
                    <select
                      value={actionConfig.param_type || 'string'}
                      onChange={(e) => setActionConfig({ ...actionConfig, param_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="string">String</option>
                      <option value="numeric">Numeric</option>
                      <option value="uuid">UUID</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="action-test"
                  checked={actionType === 'test'}
                  onChange={() => setActionType('test')}
                  className="w-4 h-4"
                />
                <label htmlFor="action-test" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900 dark:text-white">Test Variations</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Test different variations</div>
                </label>
              </div>

              {actionType === 'test' && (
                <div className="ml-7 space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Type de test</label>
                    <select
                      value={actionConfig.test_type || 'idor'}
                      onChange={(e) => setActionConfig({ ...actionConfig, test_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="idor">IDOR (ID enumeration)</option>
                      <option value="sqli">SQL Injection</option>
                      <option value="xss">XSS</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Variations</label>
                    <div className="space-y-2">
                      {['id+1', 'id-1', 'random'].map(variation => (
                        <label key={variation} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={actionConfig.variations?.includes(variation)}
                            onChange={(e) => {
                              const current = actionConfig.variations || []
                              const updated = e.target.checked
                                ? [...current, variation]
                                : current.filter((v: string) => v !== variation)
                              setActionConfig({ ...actionConfig, variations: updated })
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{variation}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="action-store"
                  checked={actionType === 'store'}
                  onChange={() => setActionType('store')}
                  className="w-4 h-4"
                />
                <label htmlFor="action-store" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900 dark:text-white">Store Result</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Save result to Memory</div>
                </label>
              </div>

              {actionType === 'store' && (
                <div className="ml-7 space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Les résultats seront automatiquement rangés selon le succès/échec
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="action-analyze"
                  checked={actionType === 'analyze'}
                  onChange={() => setActionType('analyze')}
                  className="w-4 h-4"
                />
                <label htmlFor="action-analyze" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900 dark:text-white">Analyze Response</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Analyze response and detect patterns</div>
                </label>
              </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <Button variant="outline" onClick={onCancel} size="lg">
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2 bg-gray-900 hover:bg-gray-800" size="lg">
            <Save size={16} />
            Save Playbook
          </Button>
        </div>
      </div>
    </div>
  )
}
