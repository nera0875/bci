import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Folder, Plus, X, Save, Edit2, Shield, FileText } from 'lucide-react'
import { FolderRule, FolderRuleSet, defaultFolderRules } from '@/lib/memory/folderRules'

interface FolderRulesManagerProps {
  projectId: string
  onRulesUpdate?: (rules: FolderRuleSet[]) => void
}

export function FolderRulesManager({ projectId, onRulesUpdate }: FolderRulesManagerProps) {
  const [folderRules, setFolderRules] = useState<FolderRuleSet[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [availableFolders, setAvailableFolders] = useState<any[]>([])
  const [editingRule, setEditingRule] = useState<FolderRule | null>(null)
  const [showNewRule, setShowNewRule] = useState(false)

  // Charger les dossiers disponibles
  useEffect(() => {
    loadFolders()
    loadRules()
  }, [projectId])

  const loadFolders = async () => {
    const { data } = await supabase
      .from('memory_nodes')
      .select('id, name')
      .eq('project_id', projectId)
      .eq('type', 'folder')
      .order('name')

    if (data) {
      setAvailableFolders(data)
    }
  }

  const loadRules = async () => {
    // TODO: Charger depuis la base
    // Pour l'instant, utiliser les règles par défaut
    setFolderRules(defaultFolderRules)
  }

  const addNewRule = () => {
    if (!selectedFolder) {
      alert('Sélectionnez d\'abord un dossier')
      return
    }

    const newRule: FolderRule = {
      name: 'nouvelle-regle',
      trigger: 'create',
      action: 'validate',
      description: 'Nouvelle règle à configurer',
      requiredConfirmation: true
    }

    setEditingRule(newRule)
    setShowNewRule(true)
  }

  const saveRule = async (rule: FolderRule) => {
    const existingSet = folderRules.find(rs => rs.folderName === selectedFolder)

    if (existingSet) {
      // Ajouter à l'ensemble existant
      existingSet.rules.push(rule)
      setFolderRules([...folderRules])
    } else {
      // Créer un nouvel ensemble
      const newSet: FolderRuleSet = {
        folderName: selectedFolder,
        rules: [rule]
      }
      setFolderRules([...folderRules, newSet])
    }

    setEditingRule(null)
    setShowNewRule(false)

    // TODO: Sauvegarder dans la base
    if (onRulesUpdate) {
      onRulesUpdate(folderRules)
    }
  }

  const deleteRule = (folderName: string, ruleIndex: number) => {
    const ruleSet = folderRules.find(rs => rs.folderName === folderName)
    if (ruleSet) {
      ruleSet.rules.splice(ruleIndex, 1)
      setFolderRules([...folderRules])
    }
  }

  const currentFolderRules = folderRules.find(rs => rs.folderName === selectedFolder)

  return (
    <div className="p-4 bg-[#F7F7F8] rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-[#202123]" />
        <h3 className="text-lg font-semibold text-[#202123]">Règles par Dossier</h3>
      </div>

      {/* Sélection du dossier */}
      <div className="mb-4">
        <label className="block text-sm text-[#6E6E80] mb-2">
          Sélectionner un dossier
        </label>
        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          className="w-full p-2 bg-white rounded border border-[#202123]/20 focus:border-[#202123] text-[#202123]"
        >
          <option value="">-- Choisir un dossier --</option>
          <option value="*">Tous les dossiers (règles globales)</option>
          {availableFolders.map(folder => (
            <option key={folder.id} value={folder.name}>
              📁 {folder.name}
            </option>
          ))}
        </select>
      </div>

      {/* Liste des règles pour le dossier sélectionné */}
      {selectedFolder && (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-[#202123]">
              Règles pour : {selectedFolder}
            </h4>
            <button
              onClick={addNewRule}
              className="flex items-center gap-1 px-2 py-1 bg-[#202123] hover:bg-[#202123]/80 rounded text-xs text-white"
            >
              <Plus className="w-3 h-3" />
              Ajouter
            </button>
          </div>

          {currentFolderRules?.rules.map((rule, index) => (
            <div key={index} className="p-3 bg-white rounded border border-[#202123]/20">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[#202123]">{rule.name}</span>
                    <span className="px-2 py-0.5 bg-[#F7F7F8] rounded text-xs text-[#6E6E80]">
                      {rule.trigger}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E6E80]">{rule.description}</p>

                  {/* Actions autorisées */}
                  {rule.allowedOperations && (
                    <div className="mt-2 flex gap-1">
                      {rule.allowedOperations.map(op => (
                        <span key={op} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          {op}
                        </span>
                      ))}
                    </div>
                  )}

                  {rule.requiredConfirmation && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                      Confirmation requise
                    </span>
                  )}
                </div>

                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => setEditingRule(rule)}
                    className="p-1 hover:bg-[#F7F7F8] rounded text-[#6E6E80] hover:text-[#202123]"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteRule(selectedFolder, index)}
                    className="p-1 hover:bg-red-100 rounded text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {(!currentFolderRules || currentFolderRules.rules.length === 0) && (
            <p className="text-sm text-[#6E6E80] text-center py-4">
              Aucune règle définie pour ce dossier
            </p>
          )}
        </div>
      )}

      {/* Éditeur de règle */}
      {(editingRule || showNewRule) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4 text-[#202123]">
              {showNewRule ? 'Nouvelle règle' : 'Modifier la règle'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#6E6E80] mb-1">
                  Nom de la règle
                </label>
                <input
                  type="text"
                  value={editingRule?.name || ''}
                  onChange={(e) => setEditingRule({
                    ...editingRule!,
                    name: e.target.value
                  })}
                  className="w-full p-2 bg-[#F7F7F8] rounded border border-[#202123]/20 text-[#202123]"
                  placeholder="ex: format-markdown"
                />
              </div>

              <div>
                <label className="block text-sm text-[#6E6E80] mb-1">
                  Déclencheur
                </label>
                <select
                  value={editingRule?.trigger || ''}
                  onChange={(e) => setEditingRule({
                    ...editingRule!,
                    trigger: e.target.value
                  })}
                  className="w-full p-2 bg-[#F7F7F8] rounded border border-[#202123]/20 text-[#202123]"
                >
                  <option value="create">Création</option>
                  <option value="update">Modification</option>
                  <option value="append">Ajout</option>
                  <option value="delete">Suppression</option>
                  <option value="any">Toute action</option>
                  <option value="custom">Personnalisé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#6E6E80] mb-1">
                  Action
                </label>
                <select
                  value={editingRule?.action || ''}
                  onChange={(e) => setEditingRule({
                    ...editingRule!,
                    action: e.target.value
                  })}
                  className="w-full p-2 bg-[#F7F7F8] rounded border border-[#202123]/20 text-[#202123]"
                >
                  <option value="validate">Valider le format</option>
                  <option value="confirm">Demander confirmation</option>
                  <option value="block">Bloquer</option>
                  <option value="transform">Transformer le contenu</option>
                  <option value="parse_http">Parser HTTP</option>
                  <option value="custom">Action personnalisée</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#6E6E80] mb-1">
                  Description
                </label>
                <textarea
                  value={editingRule?.description || ''}
                  onChange={(e) => setEditingRule({
                    ...editingRule!,
                    description: e.target.value
                  })}
                  className="w-full p-2 bg-[#F7F7F8] rounded border border-[#202123]/20 text-[#202123]"
                  rows={3}
                  placeholder="Décrivez ce que fait cette règle..."
                />
              </div>

              <div>
                <label className="block text-sm text-[#6E6E80] mb-1">
                  Opérations autorisées
                </label>
                <div className="flex gap-2">
                  {(['create', 'update', 'append', 'delete'] as const).map(op => (
                    <label key={op} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={editingRule?.allowedOperations?.includes(op) || false}
                        onChange={(e) => {
                          const ops = editingRule?.allowedOperations || []
                          if (e.target.checked) {
                            setEditingRule({
                              ...editingRule!,
                              allowedOperations: [...ops, op]
                            })
                          } else {
                            setEditingRule({
                              ...editingRule!,
                              allowedOperations: ops.filter(o => o !== op)
                            })
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-[#202123]">{op}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingRule?.requiredConfirmation || false}
                    onChange={(e) => setEditingRule({
                      ...editingRule!,
                      requiredConfirmation: e.target.checked
                    })}
                    className="rounded"
                  />
                  <span className="text-sm text-[#202123]">Confirmation obligatoire</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setEditingRule(null)
                  setShowNewRule(false)
                }}
                className="px-4 py-2 bg-[#F7F7F8] hover:bg-[#6E6E80]/20 rounded text-[#202123]"
              >
                Annuler
              </button>
              <button
                onClick={() => editingRule && saveRule(editingRule)}
                className="px-4 py-2 bg-[#202123] hover:bg-[#202123]/80 rounded flex items-center gap-2 text-white"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}