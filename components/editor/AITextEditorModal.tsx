'use client'

import { useState } from 'react'
import { X, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MarkdownEditorPro from './MarkdownEditorPro'
import { AnimatePresence, motion } from 'framer-motion'

interface AITextEditorModalProps {
  value: string
  onChange: (value: string) => void
  projectId: string

  // Customization
  buttonText?: string
  buttonClassName?: string
  label?: string
  placeholder?: string
  context?: string // Context for AI improvement
  minHeight?: string

  // Behavior
  showPreview?: boolean
  showAIImprove?: boolean
}

export default function AITextEditorModal({
  value,
  onChange,
  projectId,
  buttonText = '✏️ Prompt',
  buttonClassName,
  label,
  placeholder = 'Start writing...',
  context = '',
  minHeight = '400px',
  showPreview = true,
  showAIImprove = true
}: AITextEditorModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempValue, setTempValue] = useState(value)

  const handleOpen = () => {
    setTempValue(value)
    setIsOpen(true)
  }

  const handleSave = () => {
    onChange(tempValue)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempValue(value)
    setIsOpen(false)
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className={
          buttonClassName ||
          'flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white text-xs font-medium rounded-lg transition-all'
        }
      >
        <Edit3 size={12} />
        <span>{buttonText}</span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="fixed inset-0 bg-black/50 z-[100]"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {label || 'Éditeur de texte avec IA'}
                  </h3>
                  <button
                    onClick={handleCancel}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Editor */}
                <div className="flex-1 overflow-hidden">
                  <MarkdownEditorPro
                    content={tempValue}
                    onChange={setTempValue}
                    placeholder={placeholder}
                    projectId={projectId}
                    showPreview={showPreview}
                    showAIImprove={showAIImprove}
                    minHeight={minHeight}
                    improvementContext={context}
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="outline" onClick={handleCancel}>
                    Annuler
                  </Button>
                  <Button onClick={handleSave}>
                    Valider
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
