'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, FolderPlus, FileText, Edit, Trash2, Eye } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MemoryActionDisplayProps {
  action: {
    operation: 'create' | 'update' | 'delete'
    data: {
      type?: 'folder' | 'document'
      name: string
      content?: string
      parent_name?: string
    }
  }
}

export default function MemoryActionDisplay({ action }: MemoryActionDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getActionIcon = () => {
    switch (action.operation) {
      case 'create':
        return action.data.type === 'folder' ? FolderPlus : FileText
      case 'update':
        return Edit
      case 'delete':
        return Trash2
      default:
        return Eye
    }
  }

  const getActionColor = () => {
    switch (action.operation) {
      case 'create':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'update':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'delete':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getActionText = () => {
    switch (action.operation) {
      case 'create':
        return `${action.data.type === 'folder' ? 'Dossier' : 'Document'} "${action.data.name}" créé`
      case 'update':
        return `Document "${action.data.name}" modifié`
      case 'delete':
        return `Élément "${action.data.name}" supprimé`
      default:
        return `Action sur "${action.data.name}"`
    }
  }

  const ActionIcon = getActionIcon()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${getActionColor()} font-medium text-sm cursor-pointer hover:shadow-sm transition-all duration-200`}
      onClick={() => setShowDetails(!showDetails)}
    >
      <ActionIcon className="w-4 h-4" />
      <span>{getActionText()}</span>
      
      {action.data.parent_name && (
        <span className="text-xs opacity-70">
          dans {action.data.parent_name}
        </span>
      )}
      
      <motion.div
        animate={{ rotate: showDetails ? 90 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronRight className="w-3 h-3" />
      </motion.div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
          >
            <div className="space-y-2 text-xs">
              <div><strong>Opération:</strong> {action.operation}</div>
              <div><strong>Type:</strong> {action.data.type || 'document'}</div>
              <div><strong>Nom:</strong> {action.data.name}</div>
              {action.data.parent_name && (
                <div><strong>Dossier parent:</strong> {action.data.parent_name}</div>
              )}
              {action.data.content && (
                <div>
                  <strong>Contenu:</strong>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-gray-700 max-h-20 overflow-y-auto">
                    {action.data.content}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
