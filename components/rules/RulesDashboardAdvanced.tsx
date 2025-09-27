import React, { useState, useEffect } from 'react'
import { Shield, Plus, Edit2, Trash2, Save, X, Target, Zap } from 'lucide-react'

interface Rule {
  id: string
  project_id: string
  name: string
  description?: string
  trigger: string
  action: string
  enabled: boolean
  priority: number
  config?: any
}

interface RulesDashboardAdvancedProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export function RulesDashboardAdvanced({ projectId, isOpen, onClose }: RulesDashboardAdvancedProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [showNewRule, setShowNewRule] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string>('*')

  const folders = [
    { value: '*', label: 'Toutes les règles globales', icon: '🌐' },
    { value: 'requetes', label: 'Requêtes HTTP', icon: '📡' },
    { value: 'failles', label: 'Failles de sécurité', icon: '🔒' },
    { value: 'tests', label: 'Tests et payloads', icon: '🧪' },
    { value: 'analysis', label: 'Analyses et rapports', icon: '📊' },
    { value: 'success', label: 'Tests réussis', icon: '✅' },
    { value: 'failed', label: 'Tests échoués', icon: '❌' },
    { value: 'plan', label: 'Plans et stratégies', icon: '📋' }
  ]

  useEffect(() => {
    if (isOpen) {
      loadRules()
    }
  }, [isOpen, projectId])

  const loadRules = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/rules/simple?projectId=${projectId}`)
      const data = await response.json()
      
      if (data.success) {
        setRules(data.rules)
      }
    } catch (error) {
      console.error('Erreur chargement règles:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveRule = async (rule: Partial<Rule>) => {
    try {
      const action = rule.id ? 'update' : 'create'
      const response = await fetch('/api/rules/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          projectId,
          rule: {
            ...rule,
            trigger: rule.trigger || selectedFolder,
            enabled: rule.enabled !== false
          }
        })
      })

      const data = await response.json()
      if (data.success) {
        await loadRules()
        setEditingRule(null)
        setShowNewRule(false)
      } else {
        alert('Erreur: ' + data.error)
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Supprimer cette règle ?')) return

    try {
      const response = await fetch('/api/rules/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          rule: { id: ruleId }
        })
      })

      const data = await response.json()
      if (data.success) {
        await loadRules()
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }

  const toggleRule = async (rule: Rule) => {
    try {
      const response = await fetch('/api/rules/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          rule: { id: rule.id, active: !rule.enabled }
        })
      })

      const data = await response.json()
      if (data.success) {
        await loadRules()
      }
    } catch (error) {
      console.error('Erreur toggle:', error)
    }
  }

  const startNewRule = () => {
    setEditingRule({
      id: '',
      project_id: projectId,
      name: '',
      description: '',
      trigger: selectedFolder,
      action: '',
      enabled: true,
      priority: 1,
      config: {}
    })
    setShowNewRule(true)
  }

  const filteredRules = rules.filter(rule => 
    selectedFolder === '*' ? true : rule.trigger === selectedFolder
  )

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'bg-red-100 text-red-700 border-red-200'
    if (priority === 2) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-green-100 text-green-700 border-green-200'
  }

  const getPriorityLabel = (priority: number) => {
    if (priority === 1) return 'CRITIQUE'
    if (priority === 2) return 'IMPORTANT'
    return 'UTILE'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Dashboard Règles Avancé</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[70vh]">
          {/* Sidebar dossiers */}
          <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
            <h3 className="font-semibold mb-3 text-gray-900">Dossiers</h3>
            <div className="space-y-1">
              {folders.map(folder => {
                const folderRules = rules.filter(r => r.trigger === folder.value)
                return (
                  <button
                    key={folder.value}
                    onClick={() => setSelectedFolder(folder.value)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedFolder === folder.value
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{folder.icon}</span>
                        <span className="text-sm font-medium">{folder.label}</span>
                      </div>
                      {folderRules.length > 0 && (
                        <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                          {folderRules.length}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contenu principal */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">
                Règles pour : {folders.find(f => f.value === selectedFolder)?.label}
              </h3>
              <button
                onClick={startNewRule}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Nouvelle Règle
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">Chargement...</div>
            ) : (
              <div className="space-y-3">
                {filteredRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 border rounded-lg ${
                      rule.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">{rule.name}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(rule.priority)}`}>
                            {getPriorityLabel(rule.priority)}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {folders.find(f => f.value === rule.trigger)?.icon} {rule.trigger}
                          </span>
                        </div>
                        
                        {rule.description && (
                          <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                        )}
                        
                        <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                          {rule.action}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => toggleRule(rule)}
                          className={`p-2 rounded ${
                            rule.enabled 
                              ? 'text-green-600 hover:bg-green-100' 
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={rule.enabled ? 'Désactiver' : 'Activer'}
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredRules.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucune règle pour ce dossier</p>
                    <button
                      onClick={startNewRule}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Créer la première règle
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal d'édition */}
        {(editingRule || showNewRule) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">
                  {showNewRule ? 'Nouvelle Règle' : 'Modifier la Règle'}
                </h3>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de la règle
                    </label>
                    <input
                      type="text"
                      value={editingRule?.name || ''}
                      onChange={(e) => setEditingRule(prev => prev ? {...prev, name: e.target.value} : null)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Structure requêtes POST"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dossier cible
                    </label>
                    <select
                      value={editingRule?.trigger || selectedFolder}
                      onChange={(e) => setEditingRule(prev => prev ? {...prev, trigger: e.target.value} : null)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {folders.map(folder => (
                        <option key={folder.value} value={folder.value}>
                          {folder.icon} {folder.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optionnelle)
                  </label>
                  <input
                    type="text"
                    value={editingRule?.description || ''}
                    onChange={(e) => setEditingRule(prev => prev ? {...prev, description: e.target.value} : null)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Règle pour structurer les requêtes POST"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Règle / Template
                  </label>
                  <textarea
                    value={editingRule?.action || ''}
                    onChange={(e) => setEditingRule(prev => prev ? {...prev, action: e.target.value} : null)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    rows={8}
                    placeholder={`Ex: Ranger dans /requetes/post/ avec ce template:

# Requête POST - [DESCRIPTION]

## URL
https://example.com/endpoint

## Headers
Cookie: session=abc123
User-Agent: Mozilla/5.0...

## POST Data
{
  "email": "test@test.com",
  "password": "123456"
}

## Réponse
Status: 200
Content: {...}

## Notes
- Faille potentielle: ...
- À tester: ...`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priorité
                    </label>
                    <select
                      value={editingRule?.priority || 1}
                      onChange={(e) => setEditingRule(prev => prev ? {...prev, priority: parseInt(e.target.value)} : null)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={1}>1 - Critique (Structure obligatoire)</option>
                      <option value={2}>2 - Important (Contenu requis)</option>
                      <option value={3}>3 - Utile (Style et présentation)</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingRule?.enabled !== false}
                        onChange={(e) => setEditingRule(prev => prev ? {...prev, enabled: e.target.checked} : null)}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Règle activée</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => {
                    setEditingRule(null)
                    setShowNewRule(false)
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => editingRule && saveRule(editingRule)}
                  disabled={!editingRule?.name.trim() || !editingRule?.action.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
