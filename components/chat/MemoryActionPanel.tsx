'use client'

import { useState } from 'react'
import { CheckSquare, Square, X, Edit2 } from 'lucide-react'

interface MemoryAction {
  operation: 'create_fact' | 'update_fact' | 'delete_fact' | 'add_tags' | 'remove_tags' | 'create' | 'update' | 'append' | 'delete'
  data: {
    // For create_fact
    fact?: string
    category?: string
    tags?: string[]
    severity?: string
    technique?: string
    endpoint?: string

    // For update/delete/tags operations
    find_by_fact_contains?: string
    new_fact?: string
    new_category?: string
    new_severity?: string

    // Legacy (memory_nodes)
    name?: string
    type?: 'document' | 'folder'
    content?: string
    parent_name?: string
  }
}

interface MemoryActionPanelProps {
  actions: MemoryAction[]
  onValidate: (actions: MemoryAction[]) => void
  onReject: () => void
  onModify?: (actions: MemoryAction[]) => void
}

export function MemoryActionPanel({ actions, onValidate, onReject, onModify }: MemoryActionPanelProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set(actions.map((_, i) => i)))

  const toggleAction = (index: number) => {
    const newSelected = new Set(selected)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelected(newSelected)
  }

  const handleValidate = () => {
    const selectedActions = actions.filter((_, i) => selected.has(i))
    onValidate(selectedActions)
  }

  const getOperationLabel = (op: string) => {
    const labels = {
      create_fact: '📝 Créer fact',
      update_fact: '✏️ Modifier fact',
      delete_fact: '🗑️ Supprimer fact',
      add_tags: '🏷️ Ajouter tags',
      remove_tags: '❌ Retirer tags',
      create: '📄 Créer document',
      update: '✏️ Modifier document',
      append: '➕ Ajouter contenu',
      delete: '🗑️ Supprimer document'
    }
    return labels[op as keyof typeof labels] || op
  }

  const getOperationColor = (op: string) => {
    const colors = {
      create_fact: 'border-green-500 bg-green-50 dark:bg-green-900/20',
      update_fact: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
      delete_fact: 'border-red-500 bg-red-50 dark:bg-red-900/20',
      add_tags: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
      remove_tags: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
      create: 'border-green-500 bg-green-50 dark:bg-green-900/20',
      update: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
      append: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
      delete: 'border-red-500 bg-red-50 dark:bg-red-900/20'
    }
    return colors[op as keyof typeof colors] || 'border-gray-300'
  }

  const getActionPreview = (action: MemoryAction) => {
    switch (action.operation) {
      case 'create_fact':
        return (
          <div>
            <div className="text-xs font-semibold mb-1">{action.data.fact}</div>
            <div className="text-xs text-gray-500">
              📁 {action.data.category}
              {action.data.tags && action.data.tags.length > 0 && ` • 🏷️ ${action.data.tags.join(', ')}`}
            </div>
          </div>
        )
      case 'update_fact':
      case 'delete_fact':
        return (
          <div className="text-xs">
            Recherche: "{action.data.find_by_fact_contains}"
            {action.data.new_fact && <div className="mt-1">→ {action.data.new_fact}</div>}
          </div>
        )
      case 'add_tags':
      case 'remove_tags':
        return (
          <div className="text-xs">
            Recherche: "{action.data.find_by_fact_contains}"
            <div className="mt-1">🏷️ {action.data.tags?.join(', ')}</div>
          </div>
        )
      default:
        // Legacy document operations
        return (
          <div>
            <div className="text-xs font-semibold">{action.data.name}</div>
            {action.data.parent_name && (
              <div className="text-xs text-gray-500 mt-1">
                📁 {action.data.parent_name}
              </div>
            )}
            {action.data.content && (
              <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 bg-gray-50 dark:bg-gray-900 rounded p-2 mt-1">
                {action.data.content.substring(0, 100)}
                {action.data.content.length > 100 ? '...' : ''}
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-purple-500 shadow-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            🧠 L'IA propose {actions.length} modification{actions.length > 1 ? 's' : ''}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Sélectionne celles à valider
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
        {actions.map((action, index) => (
          <div
            key={index}
            onClick={() => toggleAction(index)}
            className={`p-3 rounded border-2 cursor-pointer transition-all ${
              selected.has(index)
                ? getOperationColor(action.operation)
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                {selected.has(index) ? (
                  <CheckSquare size={16} className="text-purple-600" />
                ) : (
                  <Square size={16} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {getOperationLabel(action.operation)}
                </div>
                {getActionPreview(action)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleValidate}
          disabled={selected.size === 0}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
        >
          ✅ Valider ({selected.size})
        </button>
        {onModify && (
          <button
            onClick={() => {
              const selectedActions = actions.filter((_, i) => selected.has(i))
              onModify(selectedActions)
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
          >
            <Edit2 size={14} />
            Modifier
          </button>
        )}
        <button
          onClick={onReject}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
        >
          <X size={14} />
          Ignorer
        </button>
      </div>
    </div>
  )
}
