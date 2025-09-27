'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Folder, FileText, ChevronDown, ChevronRight, Edit3, Trash2, MoreVertical, Settings, Target, Code, Palette, Move } from 'lucide-react'

interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'document'
  section: string
  targetFolder?: string // NOUVEAU : Dossier ciblé par la règle
  children?: TreeNode[]
  data?: any[]
  icon?: string
  color?: string
}

interface UnifiedBoardModularProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export function UnifiedBoardModularV2({ projectId, isOpen, onClose }: UnifiedBoardModularProps) {
  const [activeSection, setActiveSection] = useState<string>('memory')
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<TreeNode | null>(null)
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [tableData, setTableData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  
  // NOUVEAU : États pour l'éditeur central
  const [showEditor, setShowEditor] = useState(false)
  const [editorContent, setEditorContent] = useState('')
  const [editorTitle, setEditorTitle] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [configNode, setConfigNode] = useState<TreeNode | null>(null)

  const sections = [
    { id: 'memory', name: 'Mémoire', icon: 'FileText' },
    { id: 'rules', name: 'Règles', icon: 'Settings' },
    { id: 'optimization', name: 'Optimisation', icon: 'Plus' }
  ]

  const availableFolders = [
    { id: 'failed', name: 'Failed', icon: '❌' },
    { id: 'success', name: 'Success', icon: '✅' },
    { id: 'banane', name: 'banane', icon: '🍌' },
    { id: 'all', name: 'Tous les dossiers', icon: '🌐' }
  ]

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileText': return <FileText className="w-4 h-4" />
      case 'Settings': return <Settings className="w-4 h-4" />
      case 'Plus': return <Plus className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  // NOUVEAU : Système de règles clarifié
  const createDefaultRulesTree = (): TreeNode[] => {
    return [
      // RÈGLES avec dossiers ciblés
      {
        id: 'rule-french',
        name: 'Règle French',
        type: 'document',
        section: 'rules',
        targetFolder: 'all', // Cible tous les dossiers
        data: [
          {
            id: 'rule-1',
            name: 'Règle French',
            targetFolder: 'Tous les dossiers',
            trigger: 'Commande /french',
            action: 'Organise les failles avec # devant',
            priority: 1,
            enabled: true
          }
        ]
      },
      {
        id: 'rule-success',
        name: 'Règle Success', 
        type: 'document',
        section: 'rules',
        targetFolder: 'success', // Cible dossier Success
        data: [
          {
            id: 'rule-2',
            name: 'Règle Success',
            targetFolder: 'Dossier Success',
            trigger: 'Commande /success',
            action: 'Marque comme succès et range proprement',
            priority: 2,
            enabled: true
          }
        ]
      },
      
      // MÉMOIRE par dossiers
      {
        id: 'memory-failed',
        name: 'Failed',
        type: 'folder',
        section: 'memory',
        icon: '❌',
        color: '#ef4444',
        children: [
          {
            id: 'failed-doc',
            name: 'Échecs de Pentesting',
            type: 'document',
            section: 'memory',
            data: [
              {
                id: 'mem-1',
                name: 'Test SQL Injection',
                type: 'document',
                content: 'Tentative d\'injection SQL sur /login - Échec',
                created_at: new Date().toISOString()
              }
            ]
          }
        ]
      },
      {
        id: 'memory-success',
        name: 'Success',
        type: 'folder',
        section: 'memory',
        icon: '✅',
        color: '#22c55e',
        children: [
          {
            id: 'success-doc',
            name: 'Succès de Pentesting',
            type: 'document',
            section: 'memory',
            data: [
              {
                id: 'mem-2',
                name: 'XSS Trouvé',
                type: 'document',
                content: 'Faille XSS détectée sur /search?q=<script>alert(1)</script>',
                created_at: new Date().toISOString()
              }
            ]
          }
        ]
      },
      {
        id: 'memory-banane',
        name: 'banane',
        type: 'folder',
        section: 'memory',
        icon: '🍌',
        color: '#f59e0b',
        children: [
          {
            id: 'banane-doc',
            name: 'grenouille',
            type: 'document',
            section: 'memory',
            data: [
              {
                id: 'mem-3',
                name: 'Test Banane',
                type: 'document',
                content: 'Document test pour la navigation',
                created_at: new Date().toISOString()
              }
            ]
          }
        ]
      }
    ]
  }

  // NOUVEAU : Fonctions pour l'éditeur central
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

  // NOUVEAU : Système de règles clarifié
  const createRuleForFolder = (targetFolderId: string) => {
    const targetFolder = availableFolders.find(f => f.id === targetFolderId)
    const newRule = {
      id: `rule-${Date.now()}`,
      name: `Nouvelle règle pour ${targetFolder?.name || 'dossier'}`,
      targetFolder: targetFolder?.name || 'Inconnu',
      trigger: `Quand l'IA travaille avec le dossier ${targetFolder?.name}`,
      action: 'Instructions pour l\'IA...',
      priority: 1,
      enabled: true
    }
    
    setTableData(prev => [...prev, newRule])
    
    // Ouvrir l'éditeur pour configurer la règle
    openEditor(
      `# Règle pour dossier ${targetFolder?.name}\n\n## Instructions pour l'IA :\n\n• `, 
      `Configuration règle - ${targetFolder?.name}`
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#FFFFFF] rounded-xl w-full max-w-[98vw] mx-2 h-[95vh] overflow-hidden flex flex-col shadow-xl border border-[#F7F7F8]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-3 border-b border-[#F7F7F8]">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#202123] rounded-full"></div>
            <div>
              <h2 className="text-lg font-semibold text-[#202123]">Board Modulaire V2</h2>
              <p className="text-[#6E6E80] text-xs">Système modulaire avec éditeur central</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#F7F7F8] rounded-lg transition-all duration-200">
            <X className="w-5 h-5 text-[#6E6E80]" />
          </button>
        </div>

        {/* Layout 3 Zones - ORDRE CORRIGÉ */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Zone 1: RÈGLES D'ABORD (25%) - Priorité IA */}
          <div className="w-80 border-r border-[#F7F7F8] bg-[#F7F7F8] flex flex-col">
            <div className="px-4 py-3 border-b border-[#FFFFFF]/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#202123] flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Règles IA (Priorité 1)
                </h3>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">AVANT</span>
              </div>
              <p className="text-xs text-[#6E6E80] mt-1">Injectées avant la mémoire</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div 
                onClick={() => openEditor(`# Règle French 🇫🇷

## Dossier ciblé : Tous les dossiers

## Déclencheur :
Quand l'utilisateur tape "/french"

## Instructions pour l'IA :
• Organise toutes les failles avec # devant
• Range proprement dans les dossiers
• Utilise un format structuré
• Priorise la lisibilité

## Exemple :
\`\`\`
# Faille SQL Injection
- URL: /login
- Paramètre: username
- Impact: Critique
\`\`\``, 'Règle French')}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#FFFFFF] cursor-pointer transition-all border-l-2 border-blue-500"
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-[#202123]">Règle French</p>
                    <p className="text-xs text-[#6E6E80]">→ Tous les dossiers</p>
                  </div>
                </div>
              </div>
              
              <div 
                onClick={() => openEditor(`# Règle Success ✅

## Dossier ciblé : Success uniquement

## Déclencheur :
Quand l'utilisateur tape "/success"

## Instructions pour l'IA :
• Marque les éléments comme réussis
• Range automatiquement dans le dossier Success
• Ajoute timestamp de réussite
• Génère un résumé des succès

## Format Success :
\`\`\`
✅ [RÉUSSI] - Test XSS
- Date: \${timestamp}
- Méthode: Injection script
- Résultat: Exécution réussie
\`\`\``, 'Règle Success')}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#FFFFFF] cursor-pointer transition-all border-l-2 border-green-500"
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-[#202123]">Règle Success</p>
                    <p className="text-xs text-[#6E6E80]">→ Dossier Success</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => openEditor(`# Nouvelle Règle

## Dossier ciblé : Choisir...

## Déclencheur :
Quand l'IA doit...

## Instructions :
• Nouvelle instruction...`, 'Nouvelle Règle')}
                className="w-full flex items-center gap-2 px-3 py-2 bg-[#FFFFFF] text-[#202123] rounded-lg hover:bg-[#202123] hover:text-[#FFFFFF] text-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Nouvelle règle
              </button>
            </div>
          </div>

          {/* Zone 2: MÉMOIRE APRÈS (25%) - RAG + Chunking */}
          <div className="w-80 border-r border-[#F7F7F8] bg-[#F7F7F8] flex flex-col">
            <div className="px-4 py-3 border-b border-[#FFFFFF]/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#202123] flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  Mémoire (Priorité 2)
                </h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">APRÈS</span>
              </div>
              <p className="text-xs text-[#6E6E80] mt-1">RAG + Chunking + Similarité</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div 
                onClick={() => setSelectedFolder({ id: 'failed', name: 'Failed', type: 'folder', section: 'memory' })}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FFFFFF] cursor-pointer transition-all"
              >
                <span>❌</span>
                <div>
                  <p className="text-sm font-medium">Failed</p>
                  <p className="text-xs text-[#6E6E80]">Échecs pentesting</p>
                </div>
              </div>
              
              <div 
                onClick={() => setSelectedFolder({ id: 'success', name: 'Success', type: 'folder', section: 'memory' })}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FFFFFF] cursor-pointer transition-all"
              >
                <span>✅</span>
                <div>
                  <p className="text-sm font-medium">Success</p>
                  <p className="text-xs text-[#6E6E80]">Réussites pentesting</p>
                </div>
              </div>
              
              <div 
                onClick={() => setSelectedFolder({ id: 'banane', name: 'banane', type: 'folder', section: 'memory' })}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FFFFFF] cursor-pointer transition-all"
              >
                <span>🍌</span>
                <div>
                  <p className="text-sm font-medium">banane</p>
                  <p className="text-xs text-[#6E6E80]">Tests divers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Zone 2: Éditeur Central (50%) */}
          <div className="flex-1 flex flex-col bg-[#FFFFFF]">
            {showEditor ? (
              <>
                <div className="px-6 py-4 border-b border-[#F7F7F8] flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Code className="w-5 h-5 text-[#202123]" />
                    <h3 className="text-lg font-semibold text-[#202123]">{editorTitle}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-[#F7F7F8] text-[#202123] rounded-lg hover:bg-[#202123] hover:text-[#FFFFFF] text-sm transition-all">
                      Sauvegarder
                    </button>
                    <button onClick={closeEditor} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm transition-all">
                      Fermer
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 p-6">
                  <textarea
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    className="w-full h-full resize-none bg-[#F7F7F8] border border-[#202123]/20 rounded-lg p-4 text-[#202123] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#202123]/20"
                    placeholder="Tapez vos instructions pour l'IA..."
                  />
                </div>
              </>
            ) : selectedFolder ? (
              <>
                <div className="px-6 py-4 border-b border-[#F7F7F8]">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-[#202123] mb-1">📁 {selectedFolder.name}</h3>
                      <p className="text-[#6E6E80] text-sm">Organisez votre dossier de pentesting</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openConfiguration(selectedFolder)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#F7F7F8] text-[#202123] rounded-lg hover:bg-[#202123] hover:text-[#FFFFFF] text-sm transition-all"
                      >
                        <Palette className="w-4 h-4" />
                        Personnaliser
                      </button>
                      <button 
                        onClick={() => createRuleForFolder(selectedFolder.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#202123] text-[#FFFFFF] rounded-lg hover:bg-[#202123]/90 text-sm transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Créer Règle
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-24 h-24 bg-[#F7F7F8] rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <span className="text-3xl">{selectedFolder.icon || '📁'}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-[#202123] mb-3">
                      Dossier "{selectedFolder.name}" sélectionné
                    </h3>
                    <p className="text-[#6E6E80] text-sm mb-6">
                      Vous pouvez créer des règles pour ce dossier<br/>
                      ou personnaliser son apparence
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => createRuleForFolder(selectedFolder.id)}
                        className="bg-[#202123] text-[#FFFFFF] px-4 py-3 rounded-lg font-semibold hover:bg-[#202123]/90 transition-all flex items-center gap-2"
                      >
                        <Target className="w-4 h-4" />
                        Créer règle
                      </button>
                      <button 
                        onClick={() => openConfiguration(selectedFolder)}
                        className="bg-[#F7F7F8] text-[#202123] px-4 py-3 rounded-lg font-semibold hover:bg-[#202123] hover:text-[#FFFFFF] transition-all flex items-center gap-2"
                      >
                        <Palette className="w-4 h-4" />
                        Personnaliser
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-lg">
                  <div className="w-20 h-20 bg-[#F7F7F8] rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Plus className="w-10 h-10 text-[#6E6E80]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#202123] mb-3">Zone d'Édition</h3>
                  <p className="text-[#6E6E80] text-sm leading-relaxed">
                    Sélectionnez un élément pour l'éditer<br/>
                    ou créer une nouvelle règle
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Zone 3: Panel Configuration (25%) */}
          <div className="w-80 border-l border-[#F7F7F8] bg-[#F7F7F8] flex flex-col">
            {showConfig && configNode ? (
              <>
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
                      className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#202123]/20 rounded-lg text-sm"
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
                    <label className="block text-xs text-[#6E6E80] mb-2">Couleur</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#202123'].map(color => (
                        <button 
                          key={color}
                          className="w-8 h-8 rounded-lg hover:scale-110 transition-all"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-[#FFFFFF]/50">
                  <h3 className="text-sm font-semibold text-[#202123] flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Propriétés
                  </h3>
                </div>
                
                <div className="flex-1 p-4">
                  <div className="text-center py-8">
                    <Settings className="w-12 h-12 text-[#6E6E80] mx-auto mb-3" />
                    <p className="text-xs text-[#6E6E80]">
                      Sélectionnez un élément<br/>
                      pour voir ses propriétés
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
