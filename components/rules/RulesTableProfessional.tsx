'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, Shield, CheckCircle, XCircle, Folder, Settings, Target, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import { motion, AnimatePresence } from 'framer-motion'

type Rule = Database['public']['Tables']['rules']['Row'] & {
  folder?: string
}

interface RulesTableProps {
  projectId: string
}

export default function RulesTableProfessional({ projectId }: RulesTableProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    trigger: '',
    action: '',
    description: '',
    folder: '*'
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [availableFolders, setAvailableFolders] = useState<string[]>([])

  useEffect(() => {
    loadRules()
    loadFolders()
    const cleanup = subscribeToRules()

    const interval = setInterval(() => {
      loadRules()
    }, 2000)

    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [projectId, refreshKey])

  const loadFolders = async () => {
    const { data } = await supabase
      .from('memory_nodes')
      .select('name')
      .eq('project_id', projectId)
      .eq('type', 'folder')
      .order('name')

    if (data) {
      setAvailableFolders(data.map(f => f.name))
    }
  }

  const loadRules = async () => {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: false })

    if (data && !error) {
      const rulesWithFolder = data.map(rule => ({
        ...rule,
        folder: (rule.config as any)?.folder || '*'
      }))
      setRules(rulesWithFolder)
    }
  }

  const subscribeToRules = () => {
    const channel = supabase
      .channel(`rules_${projectId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rules',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Rules change detected:', payload)
          loadRules()
          setRefreshKey(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const toggleRule = async (rule: Rule) => {
    await supabase
      .from('rules')
      .update({ enabled: !rule.enabled })
      .eq('id', rule.id)

    setTimeout(() => loadRules(), 100)
  }

  const deleteRule = async (id: string) => {
    if (confirm('Supprimer cette règle ?')) {
      await supabase
        .from('rules')
        .delete()
        .eq('id', id)

      setTimeout(() => loadRules(), 100)
    }
  }

  const saveRule = async () => {
    if (editingId) {
      await supabase
        .from('rules')
        .update({
          name: editForm.name,
          trigger: editForm.trigger,
          action: editForm.action,
          description: editForm.description,
          config: { folder: editForm.folder },
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId)
    } else {
      await supabase
        .from('rules')
        .insert({
          project_id: projectId,
          name: editForm.name,
          trigger: editForm.trigger,
          action: editForm.action,
          description: editForm.description,
          priority: rules.length,
          config: { folder: editForm.folder },
          enabled: true
        })
    }

    setEditingId(null)
    setIsCreating(false)
    setEditForm({ name: '', trigger: '', action: '', description: '', folder: '*' })
    setTimeout(() => loadRules(), 100)
  }

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id)
    setEditForm({
      name: rule.name,
      trigger: rule.trigger,
      action: rule.action,
      description: rule.description || '',
      folder: (rule.config as any)?.folder || rule.folder || '*'
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsCreating(false)
    setEditForm({ name: '', trigger: '', action: '', description: '', folder: '*' })
  }

  const renderRule = (rule: Rule) => {
    const isEditing = editingId === rule.id

    return (
      <motion.div
        key={rule.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`p-4 rounded-xl border transition-all duration-200 ${
          rule.enabled
            ? 'bg-white border-[#E5E5E7] shadow-sm'
            : 'bg-[#F7F7F8] border-[#E5E5E7] opacity-60'
        }`}
      >
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#6E6E80] mb-2">Nom de la règle</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Ex: Analyse de sécurité"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E5E5E7] rounded-lg focus:outline-none focus:border-[#202123] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6E6E80] mb-2">Dossier cible</label>
                <select
                  value={editForm.folder}
                  onChange={(e) => setEditForm({ ...editForm, folder: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E5E5E7] rounded-lg focus:outline-none focus:border-[#202123] transition-colors"
                >
                  <option value="*">🌐 Tous les dossiers</option>
                  {availableFolders.map(folder => (
                    <option key={folder} value={folder}>📁 {folder}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6E6E80] mb-2">Déclencheur</label>
              <input
                type="text"
                value={editForm.trigger}
                onChange={(e) => setEditForm({ ...editForm, trigger: e.target.value })}
                placeholder="Ex: on_message, /analyze, always"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E5E5E7] rounded-lg focus:outline-none focus:border-[#202123] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6E6E80] mb-2">Action</label>
              <input
                type="text"
                value={editForm.action}
                onChange={(e) => setEditForm({ ...editForm, action: e.target.value })}
                placeholder="Ex: analyze_security, store_finding, generate_report"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E5E5E7] rounded-lg focus:outline-none focus:border-[#202123] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6E6E80] mb-2">Description (optionnel)</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Décrivez le comportement attendu de cette règle..."
                className="w-full px-3 py-2 text-sm bg-white border border-[#E5E5E7] rounded-lg focus:outline-none focus:border-[#202123] transition-colors resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={cancelEdit}
                className="px-4 py-2 text-sm border border-[#E5E5E7] text-[#6E6E80] rounded-lg hover:bg-[#F7F7F8] transition-colors"
              >
                Annuler
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={saveRule}
                disabled={!editForm.name || !editForm.trigger || !editForm.action}
                className="px-4 py-2 text-sm bg-[#202123] text-white rounded-lg hover:bg-[#202123]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sauvegarder
              </motion.button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-[#202123]">{rule.name}</h4>
                  {rule.folder && rule.folder !== '*' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#F7F7F8] text-[#6E6E80] rounded-md border border-[#E5E5E7]">
                      <Folder className="w-3 h-3" />
                      {rule.folder}
                    </span>
                  )}
                </div>
                {rule.description && (
                  <p className="text-sm text-[#6E6E80] mb-3 leading-relaxed">{rule.description}</p>
                )}
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleRule(rule)}
                className={`p-2 rounded-lg transition-all ${
                  rule.enabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-[#F7F7F8] text-[#6E6E80] hover:bg-[#E5E5E7]'
                }`}
                title={rule.enabled ? 'Désactiver' : 'Activer'}
              >
                {rule.enabled ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
              </motion.button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E5E7]">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-3 h-3 text-[#6E6E80]" />
                  <span className="text-xs font-medium text-[#6E6E80] uppercase tracking-wide">Déclencheur</span>
                </div>
                <span className="text-sm font-mono text-[#202123]">{rule.trigger}</span>
              </div>
              <div className="p-3 bg-[#F7F7F8] rounded-lg border border-[#E5E5E7]">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-3 h-3 text-[#6E6E80]" />
                  <span className="text-xs font-medium text-[#6E6E80] uppercase tracking-wide">Action</span>
                </div>
                <span className="text-sm font-mono text-[#202123]">{rule.action}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startEdit(rule)}
                className="px-3 py-1.5 text-xs text-[#6E6E80] hover:text-[#202123] hover:bg-[#F7F7F8] rounded-md transition-colors flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Modifier
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => deleteRule(rule.id)}
                className="px-3 py-1.5 text-xs text-[#6E6E80] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Supprimer
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header Professionnel */}
      <div className="p-6 border-b border-[#E5E5E7]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#202123] rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[#202123] text-lg">Règles Intelligentes</h3>
              <p className="text-sm text-[#6E6E80]">
                {rules.filter(r => r.enabled).length} active{rules.filter(r => r.enabled).length > 1 ? 's' : ''} sur {rules.length}
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsCreating(true)
              setEditForm({ name: '', trigger: '', action: '', description: '', folder: '*' })
            }}
            className="px-4 py-2 bg-[#202123] hover:bg-[#202123]/90 text-white rounded-xl transition-colors flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Règle
          </motion.button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Settings className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Système de Règles par Dossier</h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                Chaque règle peut être associée à un dossier spécifique. L'IA respectera automatiquement 
                ces règles lors de la modification du contenu de chaque dossier, garantissant une cohérence 
                et un comportement adapté au contexte.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu Principal */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* Formulaire de Création */}
          <AnimatePresence>
            {isCreating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-6 bg-gradient-to-br from-[#F7F7F8] to-white rounded-xl border border-[#E5E5E7] shadow-sm"
              >
                <h4 className="font-semibold text-[#202123] mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Créer une Nouvelle Règle
                </h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#202123] mb-2">Nom de la règle</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Ex: Analyse de sécurité"
                        className="w-full px-4 py-3 text-sm bg-white border border-[#E5E5E7] rounded-lg focus:outline-none focus:border-[#202123] focus:ring-2 focus:ring-[#202123]/10 transition-all"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#202123] mb-2">Dossier cible</label>
                      <select
                        value={editForm.folder}
                        onChange={(e) => setEditForm({ ...editForm, folder: e.target.value })}
                        className="w-full px-4 py-3 text-sm bg-white border border-[#E5E5E7] rounded-lg focus:outline-none focus:border-[#202123] focus:ring-2 focus:ring-[#202123]/10 transition-all"
                      >
                        <option value="*">🌐 Tous les dossiers</option>
                        {availableFolders.map(folder => (
                          <option key={folder} value={folder}>📁 {folder}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#202123] mb-2">Déclencheur</label>
                      <input
                        type="text"
                        value={editForm.trigger}
                        onChange={(e) => setEditForm({ ...editForm, trigger: e.target.value })}
                        placeholder="Ex: on_message, /analyze, always"
                        className="w-full px-4 py-3 text-sm bg-white border border-[#E5E5E7] rounded-lg focus:outline-none focus:border-[#202123] focus:ring-2 focus:ring-[#202123]/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#202123] mb-2">Action</label>
                      <input
                        type="text"
                        value={editForm.action}
                        onChange={(e) => setEditForm({ ...editForm, action: e.target.value })}
                        placeholder="Ex: analyze_security, store_memory"
                        className="w-full px-4 py-3 text-sm bg-white border border-[#E5E5E7] rounded-lg focus:outline-none focus:border-[#202123] focus:ring-2 focus:ring-[#202123]/10 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#202123] mb-2">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Décrivez le comportement attendu de cette règle..."
                      className="w-full px-4 py-3 text-sm bg-white border border-[#E5E5E7] rounded-lg focus:outline-none focus:border-[#202123] focus:ring-2 focus:ring-[#202123]/10 transition-all resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={cancelEdit}
                      className="px-6 py-2 text-sm border border-[#E5E5E7] text-[#6E6E80] rounded-lg hover:bg-[#F7F7F8] transition-colors"
                    >
                      Annuler
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={saveRule}
                      disabled={!editForm.name || !editForm.trigger || !editForm.action}
                      className="px-6 py-2 text-sm bg-[#202123] text-white rounded-lg hover:bg-[#202123]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                    >
                      Créer la Règle
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Liste des Règles */}
          <AnimatePresence>
            {rules.map(rule => renderRule(rule))}
          </AnimatePresence>

          {/* État Vide */}
          {rules.length === 0 && !isCreating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-[#F7F7F8] rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-[#6E6E80]" />
              </div>
              <h4 className="font-medium text-[#202123] mb-2">Aucune règle définie</h4>
              <p className="text-sm text-[#6E6E80] mb-4">
                Créez votre première règle pour contrôler le comportement de l'IA
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsCreating(true)
                  setEditForm({ name: '', trigger: '', action: '', description: '', folder: '*' })
                }}
                className="px-6 py-3 bg-[#202123] text-white rounded-xl hover:bg-[#202123]/90 transition-colors flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Créer ma première règle
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
