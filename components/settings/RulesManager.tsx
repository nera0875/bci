'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit3, Trash2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import Editor from '@monaco-editor/react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Rule {
  id: string
  project_id: string
  name: string
  trigger: string
  action: string
  priority: number
  enabled: boolean
  created_at: string
  updated_at: string
}

interface RulesManagerProps {
  projectId: string
}

export default function RulesManager({ projectId }: RulesManagerProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    trigger: '',
    action: '',
    priority: 1
  })

  useEffect(() => {
    loadRules()
  }, [projectId])

  const loadRules = async () => {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: true })

    if (data && !error) {
      setRules(data as any)
    }
  }

  const openEditor = (rule?: Rule) => {
    if (rule) {
      setEditingRule(rule)
      setFormData({
        name: rule.name,
        trigger: rule.trigger,
        action: rule.action,
        priority: rule.priority
      })
    } else {
      setEditingRule(null)
      setFormData({
        name: '',
        trigger: '*',
        action: '// Instructions pour l\'IA\n\n',
        priority: 1
      })
    }
    setShowEditor(true)
  }

  const saveRule = async () => {
    if (!formData.name || !formData.trigger || !formData.action) {
      toast.error('Tous les champs sont requis')
      return
    }

    if (editingRule) {
      // Update existing
      const { error } = await supabase
        .from('rules')
        .update({
          name: formData.name,
          trigger: formData.trigger,
          action: formData.action,
          priority: formData.priority,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', editingRule.id)

      if (!error) {
        toast.success('✅ Rule mise à jour')
        loadRules()
        setShowEditor(false)
      } else {
        toast.error('Erreur de sauvegarde')
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('rules')
        .insert([{
          project_id: projectId,
          name: formData.name,
          trigger: formData.trigger,
          action: formData.action,
          priority: formData.priority,
          enabled: true
        }] as any)

      if (!error) {
        toast.success('✅ Rule créée')
        loadRules()
        setShowEditor(false)
      } else {
        toast.error('Erreur de création')
      }
    }
  }

  const toggleEnabled = async (rule: Rule) => {
    const { error } = await supabase
      .from('rules')
      .update({ enabled: !rule.enabled } as any)
      .eq('id', rule.id)

    if (!error) {
      toast.success(rule.enabled ? '❌ Rule désactivée' : '✅ Rule activée')
      loadRules()
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Supprimer cette rule ?')) return

    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', ruleId)

    if (!error) {
      toast.success('🗑️ Rule supprimée')
      loadRules()
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Rules</h2>
          <p className="text-sm text-gray-600">Gérez les instructions pour l'IA. Jusqu'à 20 rules.</p>
        </div>
        <Button onClick={() => openEditor()} className="bg-black hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Rules Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trigger
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created at
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                  <div className="text-xs text-gray-500 truncate max-w-xs" title={rule.action}>
                    {rule.action.substring(0, 60)}...
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {rule.trigger}
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(rule.created_at).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleEnabled(rule)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rule.enabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rule.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditor(rule)}
                      className="p-2 hover:bg-gray-100 rounded transition-colors"
                      title="Éditer"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-2 hover:bg-red-100 rounded transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rules.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">Aucune rule</p>
            <p className="text-sm">Cliquez sur "+ Add Rule" pour commencer</p>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500">
        {rules.length} of 2 results
      </div>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Éditer Rule' : 'Nouvelle Rule'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex: Auth Check"
              />
            </div>

            {/* Trigger */}
            <div>
              <label className="block text-sm font-medium mb-2">Trigger (pattern de dossier)</label>
              <Input
                value={formData.trigger}
                onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                placeholder="ex: auth/* ou business/* ou *"
              />
              <p className="text-xs text-gray-500 mt-1">
                * = toutes les sections | auth/* = dossiers auth uniquement
              </p>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
              />
            </div>

            {/* Action (Monaco Editor) */}
            <div>
              <label className="block text-sm font-medium mb-2">Action (Instructions pour l'IA)</label>
              <div className="border rounded-lg overflow-hidden">
                <Editor
                  height="300px"
                  language="markdown"
                  value={formData.action}
                  onChange={(value) => setFormData({ ...formData, action: value || '' })}
                  theme="vs-light"
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ces instructions seront ajoutées au prompt de l'IA quand elle travaille dans le dossier ciblé
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditor(false)}>
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={saveRule} className="bg-black hover:bg-gray-800">
                <Save className="w-4 h-4 mr-2" />
                {editingRule ? 'Sauvegarder' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}