'use client'

import React from 'react'
import { Sliders, Code, Pencil, GraduationCap, Coffee, Lightbulb, Check, Edit3, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface QuickContextBarProps {
  currentStyle: string
  onStyleChange: (style: string) => void
  onContextSelect?: (context: string) => void
  projectId: string
  onCustomStylesChange?: (styles: any[]) => void
}

const QUICK_CONTEXTS = [
  {
    id: 'code',
    label: 'Code',
    icon: Code,
    description: 'Aide au développement'
  },
  {
    id: 'write',
    label: 'Écrire',
    icon: Pencil,
    description: 'Rédaction et édition'
  },
  {
    id: 'learn',
    label: 'Apprendre',
    icon: GraduationCap,
    description: 'Apprentissage et formation'
  },
  {
    id: 'daily',
    label: 'Vie quotidienne',
    icon: Coffee,
    description: 'Questions du quotidien'
  },
  {
    id: 'pentest',
    label: 'Pentest',
    icon: Lightbulb,
    description: 'Sécurité offensive'
  }
]

export function QuickContextBar({ currentStyle, onStyleChange, onContextSelect, projectId, onCustomStylesChange }: QuickContextBarProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedContext, setSelectedContext] = React.useState<string | null>(null)
  const [editingStyleId, setEditingStyleId] = React.useState<string | null>(null)
  const [customStyles, setCustomStyles] = React.useState<any[]>([])

  // États pour le formulaire nouveau style
  const [newStyleName, setNewStyleName] = React.useState('')
  const [newStyleDescription, setNewStyleDescription] = React.useState('')
  const [newStylePrompt, setNewStylePrompt] = React.useState('')

  // États pour éditer un style existant
  const [editingStyleData, setEditingStyleData] = React.useState<any>(null)

  const handleContextClick = (contextId: string) => {
    setSelectedContext(contextId === selectedContext ? null : contextId)
    onContextSelect?.(contextId)
  }

  const currentStyleObj = customStyles.find(s => s.id === currentStyle)

  // Charger les styles personnalisés depuis Supabase au montage
  React.useEffect(() => {
    loadCustomStyles()
  }, [projectId])

  const loadCustomStyles = async () => {
    try {
      // Charger les templates depuis localStorage (comme dans SettingsPro)
      const savedTemplates = localStorage.getItem(`templates_${projectId}`)
      if (savedTemplates) {
        const templates = JSON.parse(savedTemplates)

        // Convertir les templates en format de styles
        const styles = templates.map((t: any) => ({
          id: t.id,
          label: t.name,
          description: t.category,
          systemPrompt: t.prompt,
          custom: true,
          category: t.category
        }))

        setCustomStyles(styles)

        // Notifier le parent du changement
        if (onCustomStylesChange) {
          onCustomStylesChange(styles)
        }
      }
    } catch (err) {
      console.error('Error loading templates:', err)
    }
  }

  const saveCustomStyle = async () => {
    if (!newStyleName.trim() || !newStylePrompt.trim()) {
      toast.error('Le nom et le prompt système sont obligatoires')
      return
    }

    try {
      const newTemplate = {
        id: `${Date.now()}-${newStyleName.toLowerCase().replace(/\s+/g, '-')}`,
        name: newStyleName,
        category: newStyleDescription || 'Custom',
        prompt: newStylePrompt,
        created_at: new Date().toISOString()
      }

      // Charger templates existants
      const savedTemplates = localStorage.getItem(`templates_${projectId}`)
      const existingTemplates = savedTemplates ? JSON.parse(savedTemplates) : []

      // Ajouter le nouveau
      const updatedTemplates = [...existingTemplates, newTemplate]

      // Sauvegarder dans localStorage
      localStorage.setItem(`templates_${projectId}`, JSON.stringify(updatedTemplates))

      // Recharger
      await loadCustomStyles()

      // Reset form
      setNewStyleName('')
      setNewStyleDescription('')
      setNewStylePrompt('')
      setEditingStyleId(null)

      toast.success('✨ Template créé !', {
        description: 'Visible dans Settings > Prompt Templates'
      })
    } catch (err) {
      console.error('Error saving template:', err)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const saveEditedStyle = async () => {
    if (!editingStyleData) return

    try {
      // Charger templates existants
      const savedTemplates = localStorage.getItem(`templates_${projectId}`)
      if (!savedTemplates) return

      const existingTemplates = JSON.parse(savedTemplates)

      // Trouver et mettre à jour le template
      const updatedTemplates = existingTemplates.map((t: any) => {
        if (t.id === editingStyleData.id) {
          return {
            ...t,
            name: editingStyleData.label,
            category: editingStyleData.description,
            prompt: editingStyleData.systemPrompt
          }
        }
        return t
      })

      // Sauvegarder
      localStorage.setItem(`templates_${projectId}`, JSON.stringify(updatedTemplates))

      // Recharger
      await loadCustomStyles()

      setEditingStyleId(null)
      setEditingStyleData(null)

      toast.success('💾 Template modifié !')
    } catch (err) {
      console.error('Error updating template:', err)
      toast.error('Erreur lors de la modification')
    }
  }

  const deleteCustomStyle = async (styleId: string) => {
    try {
      // Charger templates existants
      const savedTemplates = localStorage.getItem(`templates_${projectId}`)
      if (!savedTemplates) return

      const existingTemplates = JSON.parse(savedTemplates)

      // Filtrer le template à supprimer
      const updatedTemplates = existingTemplates.filter((t: any) => t.id !== styleId)

      // Sauvegarder
      localStorage.setItem(`templates_${projectId}`, JSON.stringify(updatedTemplates))

      // Recharger
      await loadCustomStyles()

      toast.success('🗑️ Template supprimé')
    } catch (err) {
      console.error('Error deleting template:', err)
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="relative">
      {/* Compact Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Paramètres de conversation"
      >
        <Sliders className="w-5 h-5 text-gray-600" />
      </button>

      {/* Panel Popup */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute bottom-full left-0 mb-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden max-h-[500px] overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Style de réponse */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Style de réponse</h3>
                  <button
                    onClick={() => setEditingStyleId('new')}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-3 h-3" />
                    Créer un style
                  </button>
                </div>

                <div className="space-y-1">
                  {/* Message si aucun template */}
                  {customStyles.length === 0 && (
                    <div className="text-center py-4 px-3">
                      <p className="text-xs text-gray-500 mb-2">Aucun template disponible</p>
                      <p className="text-xs text-gray-400">Créez-en un ci-dessous ou dans Settings</p>
                    </div>
                  )}

                  {/* Templates depuis Settings uniquement */}
                  {customStyles.map((style) => (
                    <div key={style.id}>
                      {editingStyleId === style.id ? (
                        <div className="border border-orange-300 rounded-md p-3 bg-orange-50">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Éditer le template</h4>
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs font-medium text-gray-700">Nom</label>
                              <input
                                type="text"
                                value={editingStyleData?.label || style.label}
                                onChange={(e) => setEditingStyleData({ ...style, label: e.target.value })}
                                className="w-full text-sm px-2 py-1 border border-gray-300 rounded mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">Catégorie</label>
                              <input
                                type="text"
                                value={editingStyleData?.description || style.description}
                                onChange={(e) => setEditingStyleData({ ...style, description: e.target.value })}
                                className="w-full text-sm px-2 py-1 border border-gray-300 rounded mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">Prompt système</label>
                              <textarea
                                value={editingStyleData?.systemPrompt || style.systemPrompt}
                                onChange={(e) => setEditingStyleData({ ...style, systemPrompt: e.target.value })}
                                className="w-full text-xs px-2 py-1 border border-gray-300 rounded mt-1 h-32"
                              />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={saveEditedStyle}
                                className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={() => deleteCustomStyle(style.id)}
                                className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                              >
                                Supprimer
                              </button>
                              <button
                                onClick={() => {
                                  setEditingStyleId(null)
                                  setEditingStyleData(null)
                                }}
                                className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`w-full text-left px-3 py-2 rounded-md transition-colors group cursor-pointer ${
                            currentStyle === style.id
                              ? 'bg-orange-50 border border-orange-200'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className="flex-1"
                              onClick={() => {
                                onStyleChange(style.id)
                                setIsOpen(false)
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900">{style.label}</span>
                                <span className="text-xs text-orange-600">{style.category || style.description}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 truncate">{style.systemPrompt?.substring(0, 50)}...</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingStyleId(style.id)
                                  setEditingStyleData(style)
                                }}
                                className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Éditer"
                              >
                                <Edit3 className="w-4 h-4 text-gray-600" />
                              </button>
                              {currentStyle === style.id && (
                                <Check className="w-4 h-4 text-orange-600 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Éditeur pour nouveau style */}
                  {editingStyleId === 'new' && (
                    <div className="border border-blue-300 rounded-md p-3 bg-blue-50">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Nouveau style personnalisé</h4>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium text-gray-700">Nom du style</label>
                          <input
                            type="text"
                            value={newStyleName}
                            onChange={(e) => setNewStyleName(e.target.value)}
                            placeholder="Ex: Technique pentest"
                            className="w-full text-sm px-2 py-1 border border-gray-300 rounded mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700">Description</label>
                          <input
                            type="text"
                            value={newStyleDescription}
                            onChange={(e) => setNewStyleDescription(e.target.value)}
                            placeholder="Ex: Réponses orientées sécurité offensive"
                            className="w-full text-sm px-2 py-1 border border-gray-300 rounded mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700">Prompt système</label>
                          <textarea
                            value={newStylePrompt}
                            onChange={(e) => setNewStylePrompt(e.target.value)}
                            placeholder="Ex: Tu es un expert en pentest. Fournis des réponses techniques avec des exemples de commandes..."
                            className="w-full text-xs px-2 py-1 border border-gray-300 rounded mt-1 h-20"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={saveCustomStyle}
                            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                          >
                            Enregistrer
                          </button>
                          <button
                            onClick={() => {
                              setEditingStyleId(null)
                              setNewStyleName('')
                              setNewStyleDescription('')
                              setNewStylePrompt('')
                            }}
                            className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contextes rapides */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Contexte</h3>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_CONTEXTS.map((context) => {
                    const Icon = context.icon
                    const isSelected = selectedContext === context.id

                    return (
                      <button
                        key={context.id}
                        onClick={() => handleContextClick(context.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                          isSelected
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                        title={context.description}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{context.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
