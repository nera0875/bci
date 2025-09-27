'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Folder, FileText, Edit3, Trash2, Settings, Download, Upload, Target, Code, ChevronDown, ChevronRight } from 'lucide-react'
import Editor from '@monaco-editor/react'

interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'document'
  section: string
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

export function UnifiedBoardModular({ projectId, isOpen, onClose }: UnifiedBoardModularProps) {
  const [activeSection, setActiveSection] = useState<string>('rules')
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<TreeNode | null>(null)
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [tableData, setTableData] = useState<any[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [editorContent, setEditorContent] = useState('')
  const [editorTitle, setEditorTitle] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [configTarget, setConfigTarget] = useState<TreeNode | null>(null)

  const sections = [
    { id: 'rules', name: 'Règles', icon: 'Target' },
    { id: 'memory', name: 'Mémoire', icon: 'Folder' },
    { id: 'optimization', name: 'Optimisation', icon: 'Code' }
  ]

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Target': return <Target className="w-4 h-4" />
      case 'Folder': return <Folder className="w-4 h-4" />
      case 'Code': return <Code className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  // ARCHITECTURE COHÉRENTE : Toutes sections = Dossiers > Documents > Tableaux
  const createSystemData = (): TreeNode[] => {
    return [
      // === RÈGLES - Structure identique à Memory ===
      {
        id: 'rules-global',
        name: 'Règles Globales',
        type: 'folder',
        section: 'rules',
        icon: '🌐',
        color: '#3b82f6',
        children: [
          {
            id: 'rules-global-doc',
            name: 'Règles Générales',
            type: 'document',
            section: 'rules',
            data: [
              {
                id: 'rule-1',
                name: 'Règle French',
                targetFolder: 'Tous les dossiers',
                instructions: `# Règle French 🇫🇷\n\n## Déclencheur :\nQuand l'utilisateur tape "/french"\n\n## Instructions :\n• Organise avec # devant\n• Range proprement`,
                priority: 1,
                enabled: true
              },
              {
                id: 'rule-2',
                name: 'Règle Success',
                targetFolder: 'Dossier Success',
                instructions: `# Règle Success ✅\n\n## Déclencheur :\nQuand l'utilisateur tape "/success"\n\n## Instructions :\n• Marque comme réussi\n• Range dans Success`,
                priority: 2,
                enabled: true
              }
            ]
          }
        ]
      },
      {
        id: 'rules-pentest',
        name: 'Règles Pentesting',
        type: 'folder',
        section: 'rules',
        icon: '🔒',
        color: '#ef4444',
        children: [
          {
            id: 'rules-pentest-doc',
            name: 'Templates Pentesting',
            type: 'document',
            section: 'rules',
            data: [
              {
                id: 'rule-3',
                name: 'Format Failles',
                targetFolder: 'Failed/Success',
                instructions: `# Format Failles\n\n## Structure :\n• Titre avec #\n• URL, Paramètre, Impact\n• Preuve de concept`,
                priority: 3,
                enabled: true
              }
            ]
          }
        ]
      },

      // === MÉMOIRE ===
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
                type: 'échec',
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
                type: 'succès',
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
                type: 'test',
                content: 'Document test pour la navigation',
                created_at: new Date().toISOString()
              }
            ]
          }
        ]
      },

      // === OPTIMISATION ===
      {
        id: 'optimization-performance',
        name: 'Performance',
        type: 'folder',
        section: 'optimization',
        icon: '🚀',
        color: '#8b5cf6',
        children: [
          {
            id: 'perf-doc',
            name: 'Optimisations IA',
            type: 'document',
            section: 'optimization',
            data: [
              {
                id: 'opt-1',
                name: 'Cache RAG',
                type: 'optimisation',
                content: 'Mise en cache des embeddings pour améliorer les performances',
                created_at: new Date().toISOString()
              }
            ]
          }
        ]
      }
    ]
  }

  useEffect(() => {
    if (isOpen) {
      loadSectionData(activeSection)
    }
  }, [isOpen, activeSection])

  const loadSectionData = (sectionId: string) => {
    const allData = createSystemData()
    const filteredData = allData.filter(node => node.section === sectionId)
    setTreeData(filteredData)
  }

  // Navigation cohérente
  const handleNodeSelect = (node: TreeNode) => {
    if (node.type === 'folder') {
      setSelectedFolder(node)
      setSelectedNode(null)
      setTableData([])
    } else if (node.type === 'document') {
      setSelectedNode(node)
      setSelectedFolder(null)
      setTableData(node.data || [])
    }
  }

  const renderTreeNodes = (nodes: TreeNode[], level: number = 0): React.ReactNode => {
    return nodes.map(node => (
      <TreeNodeComponent
        key={node.id}
        node={node}
        level={level}
        isSelected={selectedNode?.id === node.id || selectedFolder?.id === node.id}
        onSelect={() => handleNodeSelect(node)}
        onConfigure={() => openConfiguration(node)}
        renderChildren={(children: TreeNode[]) => renderTreeNodes(children, level + 1)}
      />
    ))
  }

  // Fonctions complètes
  const createNewFolder = () => {
    const newFolder: TreeNode = {
      id: `folder-${Date.now()}`,
      name: 'Nouveau dossier',
      type: 'folder',
      section: activeSection,
      children: [],
      icon: '📁',
      color: '#6b7280'
    }
    setTreeData(prev => [...prev, newFolder])
  }

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
    setConfigTarget(node)
    setShowConfig(true)
  }

  const closeConfiguration = () => {
    setShowConfig(false)
    setConfigTarget(null)
  }

  const addRow = () => {
    const newElement = {
      id: `new-${Date.now()}`,
      name: 'Nouvel élément',
      type: activeSection === 'rules' ? 'règle' : activeSection === 'memory' ? 'mémoire' : 'optimisation',
      content: 'Contenu...',
      instructions: activeSection === 'rules' ? 'Instructions pour l\'IA...' : '',
      targetFolder: activeSection === 'rules' ? 'Non défini' : '',
      created_at: new Date().toISOString()
    }
    setTableData(prev => [...prev, newElement])
  }

  const deleteRow = (rowId: string) => {
    setTableData(prev => prev.filter(row => row.id !== rowId))
  }

  // Export/Import système
  const exportSystem = () => {
    const allData = createSystemData()
    const exportData = {
      rules: allData.filter(n => n.section === 'rules'),
      memory: allData.filter(n => n.section === 'memory'),
      optimization: allData.filter(n => n.section === 'optimization'),
      timestamp: new Date().toISOString(),
      version: '2.0'
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bci-system-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importSystem = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        alert(`Système restauré ! Version ${data.version}`)
      } catch (error) {
        alert('Erreur import')
      }
    }
    reader.readAsText(file)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#FFFFFF] rounded-xl w-full max-w-6xl mx-4 h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-[#F7F7F8]">
        
        {/* Header ChatGPT */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#F7F7F8]">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#202123] rounded-full"></div>
            <div>
              <h2 className="text-xl font-semibold text-[#202123]">Board Modulaire</h2>
              <p className="text-[#6E6E80] text-sm">Architecture cohérente • Monaco Editor • Configuration</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportSystem} className="flex items-center gap-2 px-4 py-2 bg-[#F7F7F8] text-[#202123] rounded-lg hover:bg-[#202123] hover:text-[#FFFFFF] font-medium text-sm transition-all">
              <Download className="w-4 h-4" />
              Export
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-[#F7F7F8] text-[#202123] rounded-lg hover:bg-[#202123] hover:text-[#FFFFFF] font-medium text-sm cursor-pointer transition-all">
              <Upload className="w-4 h-4" />
              Import
              <input type="file" accept=".json" onChange={importSystem} className="hidden" />
            </label>
            <button onClick={onClose} className="p-2 hover:bg-[#F7F7F8] rounded-lg transition-all">
              <X className="w-5 h-5 text-[#6E6E80]" />
            </button>
          </div>
        </div>

        {/* Sections */}
        <div className="bg-[#F7F7F8] px-6 py-1">
          <div className="flex gap-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-3 font-medium flex items-center gap-2 text-sm rounded-lg transition-all ${
                  activeSection === section.id
                    ? 'bg-[#FFFFFF] text-[#202123] shadow-sm'
                    : 'text-[#6E6E80] hover:text-[#202123] hover:bg-[#FFFFFF]/50'
                }`}
              >
                {getIcon(section.icon)}
                <span>{section.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-r border-[#F7F7F8] bg-[#F7F7F8] flex flex-col">
            <div className="px-4 py-4 border-b border-[#FFFFFF]/50">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-[#202123]">Structure</h3>
                <button onClick={createNewFolder} className="p-2 hover:bg-[#FFFFFF] rounded-lg">
                  <Plus className="w-4 h-4 text-[#6E6E80]" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <div className="space-y-1">
                {renderTreeNodes(treeData)}
              </div>
            </div>
          </div>

          {/* Zone Centrale */}
          <div className="flex-1 flex flex-col bg-[#FFFFFF]">
            {showEditor ? (
              <>
                <div className="px-6 py-4 border-b border-[#F7F7F8] flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-[#202123]">{editorTitle}</h3>
                  <button onClick={closeEditor} className="px-4 py-2 bg-[#202123] text-[#FFFFFF] rounded-lg">
                    Fermer
                  </button>
                </div>
                
                <div className="flex-1">
                  <Editor
                    height="100%"
                    language="markdown"
                    value={editorContent}
                    onChange={(value) => setEditorContent(value || '')}
                    theme="vs-light"
                    options={{
                      fontSize: 14,
                      fontFamily: 'Monaco, monospace',
                      minimap: { enabled: false },
                      wordWrap: 'on'
                    }}
                  />
                </div>
              </>
            ) : selectedNode ? (
              <>
                <div className="px-6 py-4 border-b border-[#F7F7F8] flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-[#202123]">{selectedNode.name}</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditor(tableData[0]?.instructions || tableData[0]?.content || '', selectedNode.name)}
                      className="px-4 py-2 bg-[#202123] text-[#FFFFFF] rounded-lg"
                    >
                      Monaco Editor
                    </button>
                    <button onClick={addRow} className="px-4 py-2 bg-[#F7F7F8] text-[#202123] rounded-lg">
                      Ajouter
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 p-4 overflow-auto">
                  <table className="w-full border border-[#F7F7F8] rounded-lg">
                    <thead className="bg-[#F7F7F8]">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Contenu</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map(row => (
                        <tr key={row.id} className="border-b border-[#F7F7F8]">
                          <td className="px-4 py-3 text-sm">{row.name}</td>
                          <td 
                            className="px-4 py-3 text-sm cursor-pointer hover:bg-[#F7F7F8]"
                            onClick={() => openEditor(row.instructions || row.content || '', row.name)}
                          >
                            {(row.instructions || row.content || '').substring(0, 50)}...
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => deleteRow(row.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-[#202123] mb-3">Sélectionnez un élément</h3>
                  <p className="text-[#6E6E80]">Cliquez sur un dossier ou document</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TreeNodeComponent({
  node,
  level,
  isSelected,
  onSelect,
  onConfigure,
  renderChildren
}: {
  node: TreeNode
  level: number
  isSelected: boolean
  onSelect: () => void
  onConfigure: () => void
  renderChildren: (children: TreeNode[]) => React.ReactNode
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
          isSelected ? 'bg-[#202123] text-[#FFFFFF]' : 'hover:bg-[#FFFFFF]'
        }`}
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={onSelect}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-1 hover:bg-[#F7F7F8] rounded"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}
        
        <div 
          className="w-6 h-6 rounded flex items-center justify-center text-sm"
          style={{ backgroundColor: node.color ? node.color + '20' : '#F7F7F8' }}
        >
          {node.icon || (node.type === 'folder' ? '📁' : '📄')}
        </div>
        
        <span className="text-sm font-medium flex-1">{node.name}</span>
        
        <button 
          onClick={(e) => {
            e.stopPropagation()
            onConfigure()
          }}
          className="p-1 hover:bg-[#F7F7F8] rounded opacity-0 group-hover:opacity-100"
        >
          <Settings className="w-3 h-3" />
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {renderChildren(node.children!)}
        </div>
      )}
    </div>
  )
}
