import React from 'react'
import { Check, X, Save, FolderPlus } from 'lucide-react'

interface MemoryAction {
  operation: 'create' | 'update' | 'append' | 'delete'
  data: {
    name?: string
    type?: 'document' | 'folder'
    content?: string
    parent_name?: string
    path?: string
    new_name?: string
  }
}

interface MemoryActionButtonsProps {
  action: MemoryAction
  onConfirm: () => void
  onReject: () => void
  confidence?: number
}

export function MemoryActionButtons({ action, onConfirm, onReject, confidence }: MemoryActionButtonsProps) {
  const getActionText = () => {
    switch (action.operation) {
      case 'create':
        if (action.data.type === 'folder') {
          return `Créer le dossier "${action.data.name}"`
        }
        return `Ajouter "${action.data.name || 'cette information'}" dans la mémoire`
      case 'update':
        return `Mettre à jour "${action.data.name}"`
      case 'append':
        return `Ajouter du contenu à "${action.data.name}"`
      case 'delete':
        return `Supprimer "${action.data.name}"`
      default:
        return 'Action mémoire'
    }
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
        <Save className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="font-medium">{getActionText()}</span>
        {confidence && (
          <span className="text-xs text-gray-600 dark:text-gray-300">
            ({Math.round(confidence * 100)}% sûr)
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={onConfirm}
          className="p-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-md transition-all hover:scale-105"
          title="Accepter"
        >
          <Check className="w-4 h-4 text-green-400" />
        </button>
        <button
          onClick={onReject}
          className="p-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-md transition-all hover:scale-105"
          title="Refuser"
        >
          <X className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  )
}