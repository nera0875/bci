m'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Folder, FileText, Target, Code, Palette, Download, Upload, Check, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Editor from '@monaco-editor/react'

interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'document'
  section: string
  targetFolder?: string
  children?: TreeNode[]
  data?: any[]
  icon?: string
  color?: string
}

interface UnifiedBoardFinalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

interface PendingAction {
  id: string
  type: 'create_rule' | 'modify_memory' | 'config_folder'
  description: string
  data: any
  confidence: number
}

export function UnifiedBoardFinal({ projectId, isOpen, onClose }: UnifiedBoardFinalProps) {
  const [selectedFolder, setSelectedFolder] = useState<TreeNode | null>(null)
  const [selectedRule, setSelectedRule] = useState<TreeNode | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editorContent, setEditorContent] = useState('')
  const [editorTitle, setEditorTitle] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [configNode, setConfigNode] = useState<TreeNode | null>(null)
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([])

  // Données par défaut
  const rulesData = [
    {
      id: 'rule-french',
      name: 'Règle French',
      targetFolder: 'Tous les dossiers',
      trigger: 'Commande /french détectée',
      instructions: `# Règle French 🇫🇷

## Quand appliquer :
L'utilisateur mentionne des failles ou veut organiser

## Instructions pour l'IA :
• Organise toutes les failles avec # devant
• Range proprement dans les dossiers appropriés
• Utilise un format structuré et lisible
• Ajoute des détails techniques

## Format attendu :
\`\`\`
# Faille SQL Injection
- URL: /login
- Paramètre: username  
- Impact: Critique
- Preuve: [payload]
\`\`\``,
      priority: 1,
      enabled: true
    },
    {
      id: 'rule-success',
      name: 'Règle Success', 
      targetFolder: 'Dossier Success',
      trigger: 'Commande /success détectée',
      instructions: `# Règle Success ✅

## Quand appliquer :
L'utilisateur confirme une réussite

## Instructions pour l'IA :
• Marque les éléments comme réussis
• Range automatiquement dans le dossier Success  
• Ajoute timestamp et méthode utilisée
• Génère un résumé des succès

## Format Success :
\`\`\`
✅ [RÉUSSI] - Test XSS
- Date: \${timestamp}
- Méthode: Injection script
- Résultat: Exécution réussie
\`\`\``,
      priority: 2,
      enabled: true
    }
  ]

  const memoryFolders = [
    { id: 'failed', name: 'Failed', icon: '❌', color: '#ef4444', count: 3 },
    { id: 'success', name: 'Success', icon: '✅', color: '#22c55e', count: 5 },
    { id: 'banane', name: 'banane', icon: '🍌', color: '#f59e0b', count: 2 }
  ]

  // Fonctions d'édition
  const openEditor = (content: string, title: string) => {
    setEditorContent(content)
    setEditorTitle(title)
    setShowEditor(true)
  }

  const closeEditor = () => {
    setShowEditor(false)
    setEditorContent('')
    setEditorTitle('')
  }

  const openConfiguration = (node: TreeNode) => {
    setConfigNode(node)
    setShowConfig(true)
  }

  const closeConfiguration = () => {
    setShowConfig(false)
    setConfigNode(null)
  }

  // Système de validation des actions IA
  const addPendingAction = (action: PendingAction) => {
    setPendingActions(prev => [...prev, action])
  }

  const confirmAction = (actionId: string) => {
    setPendingActions(prev => prev.filter(a => a.id !== actionId))
    // Ici on applique vraiment l'action
  }

  const rejectAction = (actionId: string) => {
    setPendingActions(prev => prev.filter(a => a.id !== actionId))
  }

  // Import/Export système
  const exportData = () => {
    const exportData = {
      rules: rulesData,
      memory: memoryFolders,
      timestamp: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bci-backup-${Date.now()}.json`
    a.click()
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        // Ici on restaure les données
        alert('Données importées avec succès !')
      } catch (error) {
        alert('Erreur lors de l\'import')
      }
    }
    reader.readAsText(file)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#FFFFFF] rounded-xl w-full max-w-[98vw] mx-2 h-[95vh] overflow-hidden flex flex-col shadow-xl border border-[#F7F7F8]">
        
        {/* Header avec Import/Export */}
        <div className="flex justify-between items-center px-6 py-3 border-b border-[#F7F7F8]">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#202123] rounded-full"></div>
            <div>
              <h2 className="text-lg font-semibold text-[#202123]">Board Modulaire Final</h2>
              <p className="text-[#6E6E80] text-xs">Système intelligent avec validation IA</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={exportData} className="flex items-center gap-2 px-3 py-1.5 bg-[#F7F7F8] text-[#202123] rounded-lg hover:bg-[#202123] hover:text-[#FFFFFF] text-xs transition-all">
              <Download className="w-4 h-4" />
              Export
            </button>
            <label className="flex items-center gap-2 px-3 py-1.5 bg-[#F7F7F8] text-[#202123] rounded-lg hover:bg-[#202123] hover:text-[#FFFFFF] text-xs transition-all cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
            <button onClick={onClose} className="p-1.5 hover:bg-[#F7F7F8] rounded-lg transition-all duration-200">
              <X className="w-5 h-5 text-[#6E6E80]" />
            </button>
          </div>
        </div>

        {/* Actions IA en attente */}
        {pendingActions.length > 0 && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-800">Actions IA en attente</h4>
                <p className="text-xs text-amber-700">{pendingActions.length} modification(s) proposée(s)</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => pendingActions.forEach(a => confirmAction(a.id))}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-xs transition-all"
                >
                  <Check className="w-3 h-3" />
                  Tout accepter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Layout 3 Zones - ORDRE PRIORITÉ IA */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Zone 1: RÈGLES (Priorité 1) */}
          <div className="w-80 border-r border-[#F7F7F8] bg-[#F7F7F8] flex flex-col">
            <div className="px-4 py-3 border-b border-[#FFFFFF]/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#202123] flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Règles IA
                </h3>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">PRIORITÉ 1</span>
              </div>
              <p className="text-xs text-[#6E6E80] mt-1">Injectées AVANT la mémoire</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {rulesData.map(rule => (
                <div 
                  key={rule.id}
                  onClick={() => openEditor(rule.instructions, rule.name)}
                  className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-[#FFFFFF] cursor-pointer transition-all border-l-2 border-blue-500"
                >
                  <Target className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#202123] truncate">{rule.name}</p>
                    <p className="text-xs text-[#6E6E80]">→ {rule.targetFolder}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {rule.enabled ? '✓ Activée' : '○ Désactivée'} • Priorité {rule.priority}
                    </p>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => openEditor(`# Nouvelle Règle

## Dossier ciblé : 
Choisissez le dossier...

## Déclencheur :
Quand l'IA doit...

## Instructions pour l'IA :
• Instruction 1...
• Instruction 2...
• Format attendu...`, 'Nouvelle Règle')}
                className="w-full flex items-center gap-2 px-3 py-2 bg-[#FFFFFF] text-[#202123] rounded-lg hover:bg-[#202123] hover:text-[#FFFFFF] text-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Nouvelle règle
              </button>
            </div>
          </div>

          {/* Zone 2: Éditeur Central Monaco (50%) */}
          <div className="flex-1 flex flex-col bg-[#FFFFFF]">
            {showEditor ? (
              <>
                <div className="px-6 py-3 border-b border-[#F7F7F8] flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Code className="w-5 h-5 text-[#202123]" />
                    <h3 className="text-lg font-semibold text-[#202123]">{editorTitle}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        // Simuler action IA proposée
                        addPendingAction({
                          id: `action-${Date.now()}`,
                          type: 'create_rule',
                          description: `L'IA veut sauvegarder la règle "${editorTitle}"`,
                          data: { content: editorContent, title: editorTitle },
                          confidence: 0.95
                        })
                      }}
                      className="px-4 py-2 bg-[#202123] text-[#FFFFFF] rounded-lg hover:bg-[#202123]/90 text-sm transition-all"
                    >
                      Sauvegarder
                    </button>
                    <button onClick={closeEditor} className="px-4 py-2 bg-[#F7F7F8] text-[#202123] rounded-lg hover:bg-red-100 hover:text-red-600 text-sm transition-all">
                      Fermer
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 p-4">
                  <Editor
                    height="100%"
                    language="markdown"
                    value={editorContent}
                    onChange={(value) => setEditorContent(value || '')}
                    theme="vs-light"
                    options={{
                      fontSize: 14,
                      lineHeight: 20,
                      fontFamily: 'Monaco, "Courier New", monospace',
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      padding: { top: 16, bottom: 16 },
                      lineNumbers: 'off',
                      folding: false,
                      lineDecorationsWidth: 0,
                      lineNumbersMinChars: 0,
                      renderLineHighlight: 'none'
                    }}
                  />
                </div>
              </>
            ) : selectedFolder ? (
              <>
                <div className="px-6 py-3 border-b border-[#F7F7F8]">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-[#202123] mb-1">
                        <span className="mr-2">{selectedFolder.icon || '📁'}</span>
                        {selectedFolder.name}
                      </h3>
                      <p className="text-[#6E6E80] text-sm">Dossier de pentesting • {selectedFolder.section === 'memory' ? 'RAG + Chunking' : 'Règles IA'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openConfiguration(selectedFolder)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#F7F7F8] text-[#202123] rounded-lg hover:bg-[#202123] hover:text-[#FFFFFF] text-sm transition-all"
                      >
                        <Palette className="w-4 h-4" />
                        Personnaliser
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tableau Airtable-like */}
                <div className="flex-1 p-4">
                  <div className="bg-[#FFFFFF] rounded-lg border border-[#F7F7F8] overflow-hidden">
                    <div className="bg-[#F7F7F8] px-4 py-3 border-b border-[#FFFFFF]">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-[#202123]">Contenu du dossier</h4>
                        <button className="flex items-center gap-1 px-3 py-1 bg-[#FFFFFF] text-[#202123] rounded-md hover:bg-[#202123] hover:text-[#FFFFFF] text-xs transition-all">
                          <Plus className="w-3 h-3" />
                          Ajouter
                        </button>
                      </div>
                    </div>
                    
                    <div className="max-h-96 overflow-auto">
                      <table className="w-full">
                        <thead className="bg-[#F7F7F8] sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-[#202123] border-b border-[#FFFFFF]">Nom</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-[#202123] border-b border-[#FFFFFF]">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-[#202123] border-b border-[#FFFFFF]">Contenu</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-[#202123] border-b border-[#FFFFFF]">Créé</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F7F7F8]">
                          <tr className="hover:bg-[#F7F7F8]/50 transition-colors">
                            <td className="px-4 py-2 text-sm">Test SQL Injection</td>
                            <td className="px-4 py-2 text-xs text-[#6E6E80]">Document</td>
                            <td className="px-4 py-2 text-xs text-[#6E6E80] max-w-md truncate">Tentative d'injection SQL sur /login</td>
                            <td className="px-4 py-2 text-xs text-[#6E6E80]">27/09/2025</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-lg">
                  <div className="w-20 h-20 bg-[#F7F7F8] rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Code className="w-10 h-10 text-[#6E6E80]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#202123] mb-3">Éditeur Central</h3>
                  <p className="text-[#6E6E80] text-sm leading-relaxed mb-4">
                    Sélectionnez une règle pour l'éditer avec Monaco<br/>
                    ou un dossier pour voir son contenu
                  </p>
                  <div className="text-xs text-[#6E6E80] bg-[#F7F7F8] rounded-lg p-3">
                    <p className="font-medium mb-1">💡 L'IA utilise automatiquement :</p>
                    <p>• Les règles pour structurer ses réponses</p>
                    <p>• La mémoire pour le contexte (RAG)</p>
                    <p>• Validation avant modification</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zone 3: MÉMOIRE (25%) */}
          <div className="w-80 border-l border-[#F7F7F8] bg-[#F7F7F8] flex flex-col">
            <div className="px-4 py-3 border-b border-[#FFFFFF]/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#202123] flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  Mémoire
                </h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">PRIORITÉ 2</span>
              </div>
              <p className="text-xs text-[#6E6E80] mt-1">RAG + Similarité + Chunking</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {memoryFolders.map(folder => (
                <div 
                  key={folder.id}
                  onClick={() => setSelectedFolder({ 
                    id: folder.id, 
                    name: folder.name, 
                    type: 'folder', 
                    section: 'memory',
                    icon: folder.icon,
                    color: folder.color
                  })}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#FFFFFF] cursor-pointer transition-all"
                >
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ backgroundColor: `${folder.color}20`, color: folder.color }}
                  >
                    {folder.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#202123] truncate">{folder.name}</p>
                    <p className="text-xs text-[#6E6E80]">{folder.count} élément{folder.count > 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
              
              <div className="mt-4 p-3 bg-[#FFFFFF] rounded-lg">
                <h4 className="text-xs font-semibold text-[#202123] mb-2">Fonctionnement IA :</h4>
                <ul className="text-xs text-[#6E6E80] space-y-1">
                  <li>1. IA lit les règles</li>
                  <li>2. IA cherche dans mémoire</li>
                  <li>3. IA propose action</li>
                  <li>4. Vous validez/refusez</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Panel Configuration */}
          {showConfig && configNode && (
            <div className="w-80 border-l border-[#F7F7F8] bg-[#F7F7F8] flex flex-col">
              <div className="px-4 py-3 border-b border-[#FFFFFF]/50">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-[#202123]">Configuration</h3>
                  <button onClick={closeConfiguration} className="p-1 hover:bg-[#FFFFFF] rounded-md">
                    <X className="w-4 h-4 text-[#6E6E80]" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 p-4 space-y-4">
                <div>
                  <label className="block text-xs text-[#6E6E80] mb-2">Nom du dossier</label>
                  <input 
                    type="text" 
                    defaultValue={configNode.name}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#202123]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202123]/20"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-[#6E6E80] mb-2">Icône</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['📁', '❌', '✅', '🍌', '🔧', '📋', '🎯', '⚡'].map(emoji => (
                      <button 
                        key={emoji}
                        className="p-2 bg-[#FFFFFF] rounded-lg hover:bg-[#202123] hover:text-[#FFFFFF] transition-all text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-[#6E6E80] mb-2">Couleur d'accentuation</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#202123'].map(color => (
                      <button 
                        key={color}
                        className="w-8 h-8 rounded-lg hover:scale-110 transition-all border-2 border-white shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#FFFFFF]">
                  <button className="w-full px-4 py-2 bg-[#202123] text-[#FFFFFF] rounded-lg hover:bg-[#202123]/90 text-sm transition-all">
                    Appliquer les changements
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions IA proposées (overlay) */}
        <AnimatePresence>
          {pendingActions.map(action => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-[#FFFFFF] rounded-lg border border-[#F7F7F8] shadow-xl p-4 min-w-96"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-[#202123] mb-1">Action IA proposée</h4>
                  <p className="text-sm text-[#6E6E80] mb-2">{action.description}</p>
                  <p className="text-xs text-[#6E6E80]">Confiance: {Math.round(action.confidence * 100)}%</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmAction(action.id)}
                    className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all"
                    title="Accepter"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => rejectAction(action.id)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all"
                    title="Refuser"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
