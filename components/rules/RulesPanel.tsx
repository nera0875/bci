'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'react-hot-toast'
import { Trash2, Plus, Edit } from 'lucide-react'

interface Rule {
  id: string
  project_id: string
  name: string
  trigger: string
  action: string
  priority: number
  enabled: boolean
  created_at: string
}

interface RulesPanelProps {
  projectId: string
}

export default function RulesPanel({ projectId }: RulesPanelProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  useEffect(() => {
    loadRules()
  }, [projectId])

  const loadRules = async () => {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: false })

    if (data && !error) {
      setRules(data)
    }
    setLoading(false)
  }

  const createRule = async () => {
    const { data, error } = await supabase
      .from('rules')
      .insert({
        project_id: projectId,
        name: 'Nouvelle règle',
        trigger: '*',
        action: '// Instructions pour l\'IA\n\n',
        priority: 5,
        enabled: true
      })
      .select()
      .single()

    if (error) {
      toast.error('Erreur création règle')
    } else {
      setRules([data, ...rules])
      setEditingRule(data)
      setShowEditor(true)
    }
  }

  const updateRule = async (id: string, updates: Partial<Rule>) => {
    const { error } = await supabase
      .from('rules')
      .update(updates)
      .eq('id', id)

    if (error) {
      toast.error('Erreur mise à jour')
    } else {
      setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r))
    }
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Supprimer cette règle ?')) return

    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Erreur suppression')
    } else {
      setRules(rules.filter(r => r.id !== id))
      toast.success('Règle supprimée')
    }
  }

  if (loading) {
    return <div className="p-6">Chargement...</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rules - Instructions IA</h2>
          <p className="text-sm text-gray-500 mt-1">
            Conditions et comportements injectés dans le prompt Claude
          </p>
        </div>
        <Button onClick={createRule}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle Règle
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucune règle définie</p>
          <Button onClick={createRule} className="mt-4">
            Créer la première règle
          </Button>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trigger</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">Priority</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-20">ON/OFF</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rules.map(rule => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={rule.name}
                      onChange={e => updateRule(rule.id, { name: e.target.value })}
                      className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={rule.trigger}
                      onChange={e => updateRule(rule.id, { trigger: e.target.value })}
                      className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="*">Toujours</option>
                      <option value="business-logic">Business Logic</option>
                      <option value="authentication">Authentication</option>
                      <option value="api">API Testing</option>
                      <option value="xss">XSS</option>
                      <option value="sqli">SQL Injection</option>
                      <option value="idor">IDOR</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setEditingRule(rule)
                        setShowEditor(true)
                      }}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                      Éditer ({rule.action.length} chars)
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      value={rule.priority}
                      onChange={e => updateRule(rule.id, { priority: parseInt(e.target.value) })}
                      className="w-16 px-2 py-1 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="100"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={checked => updateRule(rule.id, { enabled: checked })}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Editor */}
      {showEditor && editingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Éditer Action - {editingRule.name}</h3>
              <button
                onClick={() => setShowEditor(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              <textarea
                value={editingRule.action}
                onChange={e => setEditingRule({ ...editingRule, action: e.target.value })}
                className="w-full h-96 font-mono text-sm border rounded p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Instructions pour l'IA..."
              />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowEditor(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={() => {
                  updateRule(editingRule.id, { action: editingRule.action })
                  setShowEditor(false)
                  toast.success('Action mise à jour')
                }}
              >
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
