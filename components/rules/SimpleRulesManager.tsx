import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Save, X } from 'lucide-react'

interface SimpleRule {
  id: string
  folder_name: string
  rule_text: string
  active: boolean
  priority: number
}

interface SimpleRulesManagerProps {
  projectId: string
}

export function SimpleRulesManager({ projectId }: SimpleRulesManagerProps) {
  const [rules, setRules] = useState<SimpleRule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRule, setEditingRule] = useState<SimpleRule | null>(null)
  const [showNewRule, setShowNewRule] = useState(false)
  const [availableFolders, setAvailableFolders] = useState<string[]>([])

  useEffect(() => {
    loadRules()
    loadFolders()
  }, [projectId])

  const loadRules = async () => {
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

  const loadFolders = async () => {
    try {
      // Récupérer les dossiers existants depuis la mémoire
      const response = await fetch(`/api/memory/nodes?projectId=${projectId}&type=folder`)
      if (response.ok) {
        const data = await response.json()
        const folderNames = data.nodes?.map((node: any) => node.name) || []
        setAvailableFolders(['*', ...folderNames])
      } else {
        // Fallback avec des dossiers par défaut
        setAvailableFolders(['*', 'Documentation', 'Code', 'Sécurité', 'Projets'])
      }
    } catch (error) {
      console.error('Erreur chargement dossiers:', error)
      setAvailableFolders(['*', 'Documentation', 'Code', 'Sécurité', 'Projets'])
    }
  }

  const saveRule = async (rule: Partial<SimpleRule>) => {
    try {
      const action = rule.id ? 'update' : 'create'
      const response = await fetch('/api/rules/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          projectId,
          rule
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

  const toggleRule = async (rule: SimpleRule) => {
    try {
      const response = await fetch('/api/rules/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          rule: { id: rule.id, active: !rule.active }
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
      folder_name: '*',
      rule_text: '',
      active: true,
      priority: 1
    })
    setShowNewRule(true)
  }

  if (loading) {
    return <div className="p-4">Chargement des règles...</div>
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Règles Simples
        </h2>
        <button
          onClick={startNewRule}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Règle
        </button>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`p-4 border rounded-lg ${
              rule.active ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                    {rule.folder_name === '*' ? 'Tous les dossiers' : rule.folder_name}
                  </span>
                  <span className="text-sm text-gray-500">
                    Priorité: {rule.priority}
                  </span>
                </div>
                <p className="text-gray-900 font-medium">
                  {rule.rule_text}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => toggleRule(rule)}
                  className={`p-1 rounded ${
                    rule.active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={rule.active ? 'Désactiver' : 'Activer'}
                >
                  {rule.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={() => setEditingRule(rule)}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucune règle définie. Cliquez sur "Nouvelle Règle" pour commencer.
          </div>
        )}
      </div>

      {/* Modal d'édition */}
      {(editingRule || showNewRule) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {showNewRule ? 'Nouvelle Règle' : 'Modifier la Règle'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dossier
                </label>
                <select
                  value={editingRule?.folder_name || '*'}
                  onChange={(e) => setEditingRule(prev => prev ? {...prev, folder_name: e.target.value} : null)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableFolders.map(folder => (
                    <option key={folder} value={folder}>
                      {folder === '*' ? 'Tous les dossiers' : folder}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Règle (instruction simple)
                </label>
                <textarea
                  value={editingRule?.rule_text || ''}
                  onChange={(e) => setEditingRule(prev => prev ? {...prev, rule_text: e.target.value} : null)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Ex: Toujours créer des fichiers .md avec des titres # bien structurés"
                />
              </div>

              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priorité
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editingRule?.priority || 1}
                    onChange={(e) => setEditingRule(prev => prev ? {...prev, priority: parseInt(e.target.value)} : null)}
                    className="w-20 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingRule?.active !== false}
                      onChange={(e) => setEditingRule(prev => prev ? {...prev, active: e.target.checked} : null)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Activée</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingRule(null)
                  setShowNewRule(false)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <X className="w-4 h-4 inline mr-1" />
                Annuler
              </button>
              <button
                onClick={() => editingRule && saveRule(editingRule)}
                disabled={!editingRule?.rule_text.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 inline mr-1" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
