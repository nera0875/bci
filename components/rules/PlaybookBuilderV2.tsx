'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Save, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import AITextEditorModal from '@/components/editor/AITextEditorModal'
import { toast } from 'sonner'

interface PlaybookData {
  id?: string
  name: string
  description?: string
  icon?: string  // Emoji
  category?: string // Deprecated - use category_id
  category_id?: string
  trigger_type: 'endpoint' | 'context' | 'always'
  trigger_config: any
  target_categories?: string[]  // Categories from memory_facts
  target_tags?: string[]        // Tags from memory_facts
  action_type: 'test' | 'store' | 'instruct'
  action_config: any
  action_instructions?: string  // Instructions libres (utilisé pour action_type='instruct')
  enabled: boolean
}

interface PlaybookBuilderV2Props {
  projectId: string
  initialData?: Partial<PlaybookData>
  onSave: (data: PlaybookData) => void
  onCancel: () => void
}

// ❌ SUPPRIMÉ: Categories hardcodées - chargées depuis memory_categories maintenant

// Tags suggestions (matching factExtractor)
const TAG_SUGGESTIONS = [
  'idor', 'sqli', 'xss', 'csrf', 'ssrf', 'rce', 'lfi', 'xxe',
  'price-manipulation', 'quantity-bypass', 'auth-bypass', 'payment-bypass',
  'burp', 'automated', 'manual', 'critical', 'high', 'medium', 'low'
]

// Emoji picker icons
const RULE_EMOJIS = ['🎯', '⚡', '🔥', '✨', '🚀', '🛡️', '🔍', '🎨', '💡', '🔧', '⚙️', '📌']

export function PlaybookBuilderV2({ projectId, initialData, onSave, onCancel }: PlaybookBuilderV2Props) {
  // États de base
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [icon, setIcon] = useState(initialData?.icon || '🎯')
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Charger les catégories de rules depuis Supabase (rule_categories)
  const [ruleCategories, setRuleCategories] = useState<Array<{ id: string; value: string; label: string; icon: string }>>([])

  // Charger les catégories de memory depuis Supabase (memory_categories)
  const [memoryCategories, setMemoryCategories] = useState<Array<{ value: string; label: string; icon: string }>>([])

  useEffect(() => {
    loadRuleCategories()
    loadMemoryCategories()
  }, [projectId])

  const loadRuleCategories = async () => {
    try {
      const response = await fetch(`/api/rules/categories?projectId=${projectId}`)
      const { categories } = await response.json()

      if (categories) {
        const formatted = categories.map((cat: any) => ({
          id: cat.id,
          value: cat.key,
          label: cat.label,
          icon: cat.icon || '📁'
        }))
        setRuleCategories(formatted)
      }
    } catch (error) {
      console.error('Error loading rule categories:', error)
    }
  }

  const loadMemoryCategories = async () => {
    try {
      const response = await fetch(`/api/memory/categories?projectId=${projectId}`)
      const { categories } = await response.json()

      if (categories) {
        const formatted = categories.map((cat: any) => ({
          value: cat.key,
          label: cat.label,
          icon: cat.icon || '📁'
        }))
        setMemoryCategories(formatted)
      }
    } catch (error) {
      console.error('Error loading memory categories:', error)
    }
  }

  // Déclencheur
  const [triggerType, setTriggerType] = useState<PlaybookData['trigger_type']>(initialData?.trigger_type || 'context')
  const [triggerConfig, setTriggerConfig] = useState<any>(initialData?.trigger_config || {})

  // Ciblage facts (facultatif)
  const [enableFactTargeting, setEnableFactTargeting] = useState(
    (initialData?.target_categories && initialData.target_categories.length > 0) ||
    (initialData?.target_tags && initialData.target_tags.length > 0)
  )
  const [targetCategories, setTargetCategories] = useState<string[]>(initialData?.target_categories || [])
  const [targetTags, setTargetTags] = useState<string[]>(initialData?.target_tags || [])
  const [newTag, setNewTag] = useState('')

  // Actions
  const [actionType, setActionType] = useState<PlaybookData['action_type']>(initialData?.action_type || 'test')
  const [actionConfig, setActionConfig] = useState<any>(initialData?.action_config || {})
  const [actionInstructions, setActionInstructions] = useState<string>(initialData?.action_instructions || '')

  // Navigation par onglets
  const [activeTab, setActiveTab] = useState<'basic' | 'trigger' | 'target' | 'action'>('basic')

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Nom du playbook requis')
      return
    }

    const playbook: PlaybookData = {
      id: initialData?.id,
      name: name.trim(),
      description: description.trim(),
      icon,
      category_id: categoryId || undefined,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      target_categories: enableFactTargeting ? targetCategories : undefined,
      target_tags: enableFactTargeting ? targetTags : undefined,
      action_type: actionType,
      action_config: actionConfig,
      action_instructions: actionInstructions.trim() || undefined,
      enabled: false // User doit activer manuellement
    }

    onSave(playbook)
  }

  const addTag = () => {
    if (!newTag.trim() || targetTags.includes(newTag.trim())) return
    setTargetTags([...targetTags, newTag.trim().toLowerCase()])
    setNewTag('')
  }

  const removeTag = (tag: string) => {
    setTargetTags(targetTags.filter(t => t !== tag))
  }

  const toggleCategory = (cat: string) => {
    if (targetCategories.includes(cat)) {
      setTargetCategories(targetCategories.filter(c => c !== cat))
    } else {
      setTargetCategories([...targetCategories, cat])
    }
  }

  const tabs = [
    { id: 'basic' as const, label: 'Basic Info', icon: '📝' },
    { id: 'trigger' as const, label: 'Trigger', icon: '🎯' },
    { id: 'target' as const, label: 'Target Facts', icon: '🎨' },
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
                {/* Emoji + Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Icon & Name
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="text-4xl hover:scale-110 transition-transform p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                        title="Change icon"
                      >
                        {icon}
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-20 grid grid-cols-6 gap-2">
                          {RULE_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setIcon(emoji)
                                setShowEmojiPicker(false)
                              }}
                              className="text-3xl hover:scale-125 transition-transform p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Test IDOR on user endpoints"
                      className="text-base h-11 flex-1"
                    />
                  </div>
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
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full text-base h-11 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">-- Aucune catégorie --</option>
                    {ruleCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    Catégories chargées depuis Supabase (rule_categories)
                  </p>
                </div>
              </div>
            )}

            {/* TAB: Trigger (SIMPLIFIÉ - Keywords uniquement) */}
            {activeTab === 'trigger' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    💡 <strong>Trigger</strong> détermine <strong>QUAND</strong> cette règle s'applique automatiquement.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    💬 Mots-clés déclencheurs
                  </label>
                  <Input
                    value={triggerConfig.keywords?.join(', ') || ''}
                    onChange={(e) => setTriggerConfig({ keywords: e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean) })}
                    placeholder="Ex: idor, /api/users, id parameter"
                    className="text-base h-11"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Si je dis "teste idor sur /api/users", cette règle s'active automatiquement
                  </p>
                </div>
              </div>
            )}

            {/* TAB: Target Facts */}
            {activeTab === 'target' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg">
                  <p className="text-sm text-gray-900 dark:text-gray-200">
                    🎨 <strong>Target Facts</strong> cible où appliquer cette règle (optionnel). Si vide, la règle s'applique partout.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Activer le ciblage
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Appliquer cette règle uniquement sur certaines categories/tags
                    </p>
                  </div>
                  <Switch
                    checked={enableFactTargeting}
                    onCheckedChange={setEnableFactTargeting}
                  />
                </div>

                {enableFactTargeting && (
                  <div className="space-y-4">
                    {/* Categories */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        📁 Categories (chargées depuis memory_categories)
                      </label>
                      {memoryCategories.length === 0 ? (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm text-yellow-900 dark:text-yellow-200">
                            ⚠️ Aucune catégorie de mémoire trouvée. Créez-les dans Memory Board → Facts.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {memoryCategories.map(cat => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => toggleCategory(cat.value)}
                              className={`p-3 rounded-lg border-2 text-left transition-all ${
                                targetCategories.includes(cat.value)
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{cat.icon}</span>
                                <div>
                                  <div className="font-medium text-sm">{cat.label}</div>
                                  <div className="text-xs text-gray-500">{cat.value}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Sélectionnez les categories auxquelles cette règle s'applique
                      </p>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        🏷️ Tags
                      </label>
                      <div className="flex gap-1 flex-wrap mb-3">
                        {targetTags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 mb-3">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                          placeholder="Ajouter un tag..."
                          className="flex-1"
                        />
                        <Button type="button" onClick={addTag} variant="outline">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {TAG_SUGGESTIONS.filter(t => !targetTags.includes(t)).slice(0, 12).map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setTargetTags([...targetTags, tag])}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Sélectionnez les tags auxquels cette règle s'applique
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Action (TEXTE LIBRE) */}
            {activeTab === 'action' && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-900 dark:text-green-200">
                    ⚡ <strong>Action</strong> détermine <strong>QUOI FAIRE</strong> quand cette règle est déclenchée.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                      Instructions pour l'IA
                    </label>
                    <AITextEditorModal
                      value={actionInstructions}
                      onChange={setActionInstructions}
                      projectId={projectId}
                      buttonText="✏️ AI Prompt"
                      label="Instructions Action"
                      placeholder="Décris ce que l'IA doit faire..."
                      context="Write clear, actionable instructions for the AI to execute when this rule triggers. Be specific about what to test, how to test it, and what to look for."
                      minHeight="400px"
                    />
                  </div>
                  <Textarea
                    value={actionInstructions}
                    onChange={(e) => setActionInstructions(e.target.value)}
                    placeholder="Ex: Teste IDOR avec IDs +1, -1, 0, 9999. Vérifie unauthorized. Range résultat dans category 'api' avec tag 'idor'."
                    rows={12}
                    className="text-base font-mono"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 Écris librement ce que l'IA doit faire. Exemples :
                  </p>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-4 space-y-1">
                    <li>• "Teste IDOR en changeant l'ID par +1, -1, 0, 9999"</li>
                    <li>• "Analyse la réponse et extrait les endpoints mentionnés"</li>
                    <li>• "Range le résultat dans category 'business_logic' avec severity 'high'"</li>
                    <li>• "Utilise le format MEMORY_ACTION pour ranger les découvertes"</li>
                  </ul>
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
