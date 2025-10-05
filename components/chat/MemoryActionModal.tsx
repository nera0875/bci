'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import MarkdownEditorPro from '@/components/editor/MarkdownEditorPro'

interface MemoryAction {
  type: 'create_document' | 'create_folder' | 'edit_document' | 'organize'
  name: string
  content?: string
  targetFolder?: string
  confidence: number
}

interface MemoryActionModalProps {
  action: MemoryAction | null
  projectId: string
  onConfirm: (modifiedAction: MemoryAction) => void
  onCancel: () => void
}

export default function MemoryActionModal({
  action,
  projectId,
  onConfirm,
  onCancel
}: MemoryActionModalProps) {
  const [editedContent, setEditedContent] = useState(action?.content || '')
  const [editedName, setEditedName] = useState(action?.name || '')

  if (!action) return null

  const getActionTitle = () => {
    switch (action.type) {
      case 'create_document':
        return '📄 Créer un document'
      case 'create_folder':
        return '📁 Créer un dossier'
      case 'edit_document':
        return '✏️ Modifier un document'
      case 'organize':
        return '🗂️ Organiser'
      default:
        return 'Action'
    }
  }

  const getActionDescription = () => {
    switch (action.type) {
      case 'create_document':
        return `Créer "${action.name}" dans Memory`
      case 'create_folder':
        return `Créer le dossier "${action.name}"`
      case 'edit_document':
        return `Modifier le document "${action.name}"`
      case 'organize':
        return `Ranger dans "${action.targetFolder}"`
      default:
        return ''
    }
  }

  const handleConfirm = () => {
    onConfirm({
      ...action,
      name: editedName,
      content: editedContent
    })
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {getActionTitle()}
                <span className="text-sm font-normal text-gray-500">
                  (Confiance: {Math.round(action.confidence * 100)}%)
                </span>
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {getActionDescription()}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Name Editor (only for create/edit) */}
          {(action.type === 'create_document' || action.type === 'create_folder' || action.type === 'edit_document') && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom
              </label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="Nom du document/dossier"
              />
            </div>
          )}

          {/* Content Editor (only for documents) */}
          {(action.type === 'create_document' || action.type === 'edit_document') && action.content && (
            <div className="flex-1 overflow-hidden">
              <MarkdownEditorPro
                content={editedContent}
                onChange={setEditedContent}
                placeholder="Contenu du document (markdown)..."
                projectId={projectId}
                showAIImprove={true}
                showPreview={true}
                minHeight="400px"
                improvementContext="This content will be stored in Memory for AI reference. Keep it clear and well-structured."
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
            >
              ✅ Confirmer
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
