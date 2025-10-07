'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Save, X, Power, Copy, Check, FileCode, Palette } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { MEMORY_ACTION_INSTRUCTIONS } from '@/lib/services/systemPrompt'
import { FORMATTING_INSTRUCTIONS } from '@/lib/services/formattingInstructions'

interface SystemPrompt {
  id: string
  name: string
  content: string
  enabled: boolean
}

interface BrainPanelProps {
  projectId: string
}

export default function BrainPanel({ projectId }: BrainPanelProps) {
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([])
  const [loading, setLoading] = useState(true)

  // Section expansion
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['memory']))

  // Edit states
  const [editingMemory, setEditingMemory] = useState(false)
  const [editingFormatting, setEditingFormatting] = useState(false)
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)

  const [memoryContent, setMemoryContent] = useState(MEMORY_ACTION_INSTRUCTIONS)
  const [formattingContent, setFormattingContent] = useState(FORMATTING_INSTRUCTIONS)
  const [editPromptName, setEditPromptName] = useState('')
  const [editPromptContent, setEditPromptContent] = useState('')

  // System states (localStorage)
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [formattingEnabled, setFormattingEnabled] = useState(true)

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPrompt, setNewPrompt] = useState({ name: '', content: '' })

  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load system states from localStorage
      const savedStates = localStorage.getItem(`brain_system_states_${projectId}`)
      if (savedStates) {
        const states = JSON.parse(savedStates)
        setMemoryEnabled(states.memory_action ?? true)
        setFormattingEnabled(states.formatting ?? true)
      }

      // Load custom prompts from DB
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })

      if (error) throw error

      setSystemPrompts(data?.map(p => ({
        id: p.id,
        name: p.name,
        content: p.content,
        enabled: p.is_active
      })) || [])
    } catch (error) {
      console.error('Error loading:', error)
      toast.error('Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const toggleMemory = () => {
    const newState = !memoryEnabled
    setMemoryEnabled(newState)
    const states = { memory_action: newState, formatting: formattingEnabled }
    localStorage.setItem(`brain_system_states_${projectId}`, JSON.stringify(states))
    toast.success(`MEMORY_ACTION ${newState ? 'activé' : 'désactivé'}`)
  }

  const toggleFormatting = () => {
    const newState = !formattingEnabled
    setFormattingEnabled(newState)
    const states = { memory_action: memoryEnabled, formatting: newState }
    localStorage.setItem(`brain_system_states_${projectId}`, JSON.stringify(states))
    toast.success(`Formatting ${newState ? 'activé' : 'désactivé'}`)
  }

  const saveMemory = () => {
    // Note: On ne peut pas vraiment modifier MEMORY_ACTION_INSTRUCTIONS car c'est une constante
    // Mais on peut sauvegarder dans localStorage pour override
    localStorage.setItem(`brain_memory_override_${projectId}`, memoryContent)
    setEditingMemory(false)
    toast.success('✅ MEMORY_ACTION sauvegardé')
  }

  const saveFormatting = () => {
    localStorage.setItem(`brain_formatting_override_${projectId}`, formattingContent)
    setEditingFormatting(false)
    toast.success('✅ Formatting sauvegardé')
  }

  const togglePrompt = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('system_prompts')
        .update({ is_active: !currentState })
        .eq('id', id)

      if (error) throw error

      setSystemPrompts(prev => prev.map(p =>
        p.id === id ? { ...p, enabled: !currentState } : p
      ))
      toast.success(`Prompt ${!currentState ? 'activé' : 'désactivé'}`)
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const editPrompt = (prompt: SystemPrompt) => {
    setEditingPromptId(prompt.id)
    setEditPromptName(prompt.name)
    setEditPromptContent(prompt.content)
    setExpandedSections(new Set([...expandedSections, 'custom']))
  }

  const savePrompt = async () => {
    if (!editingPromptId) return

    try {
      const { error } = await supabase
        .from('system_prompts')
        .update({ name: editPromptName, content: editPromptContent })
        .eq('id', editingPromptId)

      if (error) throw error

      setSystemPrompts(prev => prev.map(p =>
        p.id === editingPromptId
          ? { ...p, name: editPromptName, content: editPromptContent }
          : p
      ))
      setEditingPromptId(null)
      toast.success('✅ Sauvegardé')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const deletePrompt = async (id: string) => {
    if (!confirm('Supprimer ce prompt ?')) return

    try {
      const { error } = await supabase
        .from('system_prompts')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSystemPrompts(prev => prev.filter(p => p.id !== id))
      toast.success('Supprimé')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const addPrompt = async () => {
    if (!newPrompt.name || !newPrompt.content) {
      toast.error('Nom et contenu requis')
      return
    }

    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .insert({
          project_id: projectId,
          name: newPrompt.name,
          content: newPrompt.content,
          category: 'custom',
          is_active: true,
          sort_order: systemPrompts.length
        })
        .select()
        .single()

      if (error) throw error

      setSystemPrompts(prev => [...prev, {
        id: data.id,
        name: data.name,
        content: data.content,
        enabled: true
      }])

      setShowAddModal(false)
      setNewPrompt({ name: '', content: '' })
      toast.success('✅ Créé')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Copié !')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const activeCount = (memoryEnabled ? 1 : 0) + (formattingEnabled ? 1 : 0) + systemPrompts.filter(p => p.enabled).length

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              🧠 Brain - Configuration IA
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gérer toutes les directives et instructions de l'IA
            </p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus size={16} className="mr-1" />
            Nouveau Prompt
          </Button>
        </div>
        <div className="flex gap-3 text-xs text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Power size={12} className="text-green-600" />
            {activeCount} active{activeCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* MEMORY_ACTION Section */}
        <div className={`rounded-lg border-2 transition-all ${
          memoryEnabled
            ? 'border-purple-300 bg-white dark:bg-gray-900'
            : 'border-gray-200 bg-gray-50 dark:bg-gray-800/50'
        }`}>
          <div
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => toggleSection('memory')}
          >
            <div className="flex items-center gap-3">
              {expandedSections.has('memory') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              <FileCode size={20} className="text-purple-600" />
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  💾 MEMORY_ACTION
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    memoryEnabled
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {memoryEnabled ? '✅ Actif' : '⏸️ Inactif'}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Instructions pour modifications mémoire avec validation
                </p>
              </div>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={toggleMemory}
                className={`p-2 rounded transition-colors ${
                  memoryEnabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={memoryEnabled ? 'Désactiver' : 'Activer'}
              >
                <Power size={16} />
              </button>
              <button
                onClick={() => setEditingMemory(!editingMemory)}
                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                title="Modifier"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleCopy(memoryContent, 'memory')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                title="Copier"
              >
                {copiedId === 'memory' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {expandedSections.has('memory') && (
            <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-800 pt-4">
              {editingMemory ? (
                <div className="space-y-3">
                  <textarea
                    value={memoryContent}
                    onChange={(e) => setMemoryContent(e.target.value)}
                    rows={20}
                    className="w-full px-3 py-2 border rounded text-xs font-mono bg-gray-50 dark:bg-gray-900"
                  />
                  <div className="flex gap-2">
                    <Button onClick={saveMemory} size="sm" className="bg-green-600">
                      <Save size={14} className="mr-1" />
                      Sauvegarder
                    </Button>
                    <Button onClick={() => setEditingMemory(false)} size="sm" variant="outline">
                      <X size={14} className="mr-1" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <pre className="text-xs whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded max-h-96 overflow-y-auto">
                  {memoryContent}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Formatting Section */}
        <div className={`rounded-lg border-2 transition-all ${
          formattingEnabled
            ? 'border-blue-300 bg-white dark:bg-gray-900'
            : 'border-gray-200 bg-gray-50 dark:bg-gray-800/50'
        }`}>
          <div
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => toggleSection('formatting')}
          >
            <div className="flex items-center gap-3">
              {expandedSections.has('formatting') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              <Palette size={20} className="text-blue-600" />
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  🎨 Formatting Markdown
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    formattingEnabled
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {formattingEnabled ? '✅ Actif' : '⏸️ Inactif'}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Instructions de formatage pour les réponses
                </p>
              </div>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={toggleFormatting}
                className={`p-2 rounded transition-colors ${
                  formattingEnabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={formattingEnabled ? 'Désactiver' : 'Activer'}
              >
                <Power size={16} />
              </button>
              <button
                onClick={() => setEditingFormatting(!editingFormatting)}
                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                title="Modifier"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleCopy(formattingContent, 'formatting')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                title="Copier"
              >
                {copiedId === 'formatting' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {expandedSections.has('formatting') && (
            <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-800 pt-4">
              {editingFormatting ? (
                <div className="space-y-3">
                  <textarea
                    value={formattingContent}
                    onChange={(e) => setFormattingContent(e.target.value)}
                    rows={15}
                    className="w-full px-3 py-2 border rounded text-xs font-mono bg-gray-50 dark:bg-gray-900"
                  />
                  <div className="flex gap-2">
                    <Button onClick={saveFormatting} size="sm" className="bg-green-600">
                      <Save size={14} className="mr-1" />
                      Sauvegarder
                    </Button>
                    <Button onClick={() => setEditingFormatting(false)} size="sm" variant="outline">
                      <X size={14} className="mr-1" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <pre className="text-xs whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded max-h-96 overflow-y-auto">
                  {formattingContent}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Custom Prompts Section */}
        {systemPrompts.length > 0 && (
          <div className="rounded-lg border-2 border-gray-200 bg-white dark:bg-gray-900">
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => toggleSection('custom')}
            >
              <div className="flex items-center gap-3">
                {expandedSections.has('custom') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <div>
                  <h3 className="font-semibold text-sm">
                    ✏️ Prompts Personnalisés ({systemPrompts.length})
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {systemPrompts.filter(p => p.enabled).length} actif{systemPrompts.filter(p => p.enabled).length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {expandedSections.has('custom') && (
              <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
                {systemPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className={`border rounded-lg p-3 ${
                      prompt.enabled
                        ? 'border-purple-200 bg-purple-50/50 dark:bg-purple-900/10'
                        : 'border-gray-200 bg-gray-50 dark:bg-gray-800/50'
                    }`}
                  >
                    {editingPromptId === prompt.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editPromptName}
                          onChange={(e) => setEditPromptName(e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                          placeholder="Nom"
                        />
                        <textarea
                          value={editPromptContent}
                          onChange={(e) => setEditPromptContent(e.target.value)}
                          rows={10}
                          className="w-full px-2 py-1 border rounded text-xs font-mono"
                          placeholder="Contenu"
                        />
                        <div className="flex gap-2">
                          <Button onClick={savePrompt} size="sm" className="bg-green-600">
                            <Save size={12} className="mr-1" />
                            Sauvegarder
                          </Button>
                          <Button onClick={() => setEditingPromptId(null)} size="sm" variant="outline">
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              {prompt.name}
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                prompt.enabled
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {prompt.enabled ? '✅' : '⏸️'}
                              </span>
                            </h4>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => togglePrompt(prompt.id, prompt.enabled)}
                              className={`p-1 rounded ${
                                prompt.enabled
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                            >
                              <Power size={14} />
                            </button>
                            <button
                              onClick={() => editPrompt(prompt)}
                              className="p-1 hover:bg-blue-100 rounded"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => deletePrompt(prompt.id)}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {prompt.content.substring(0, 150)}...
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-3xl w-full">
            <h3 className="text-lg font-semibold mb-4">Nouveau Prompt Personnalisé</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newPrompt.name}
                onChange={(e) => setNewPrompt(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
                placeholder="Nom du prompt (ex: Expert IDOR)"
              />
              <textarea
                value={newPrompt.content}
                onChange={(e) => setNewPrompt(prev => ({ ...prev, content: e.target.value }))}
                rows={12}
                className="w-full px-3 py-2 border rounded font-mono text-sm"
                placeholder="Contenu du prompt..."
              />
              <div className="flex gap-2">
                <Button onClick={addPrompt} className="flex-1 bg-purple-600">
                  <Plus size={16} className="mr-1" />
                  Créer
                </Button>
                <Button
                  onClick={() => {
                    setShowAddModal(false)
                    setNewPrompt({ name: '', content: '' })
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
