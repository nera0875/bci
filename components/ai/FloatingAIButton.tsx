'use client'

import { useState, useEffect, useRef } from 'react'
import { Wand2, Copy, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import MarkdownEditorPro from '@/components/editor/MarkdownEditorPro'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface FloatingAIButtonProps {
  projectId: string
  enabled: boolean
  shortcut?: string
  initialPosition?: { x: number; y: number }
  onPositionChange?: (position: { x: number; y: number }) => void
}

export default function FloatingAIButton({
  projectId,
  enabled,
  shortcut = 'Ctrl+Shift+P',
  initialPosition = { x: 20, y: 80 },
  onPositionChange
}: FloatingAIButtonProps) {
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalText, setModalText] = useState('')
  const buttonRef = useRef<HTMLDivElement>(null)
  const dragStartPos = useRef({ x: 0, y: 0 })

  // Detect text selection
  useEffect(() => {
    if (!enabled) return

    const handleSelection = () => {
      const selected = window.getSelection()?.toString() || ''
      setSelectedText(selected)
      setIsActive(!!selected)
    }

    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [enabled])

  // Keyboard shortcut - DISABLED (causes conflicts)
  // useEffect(() => {
  //   if (!enabled || !shortcut) return
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     // ... shortcut logic
  //   }
  //   document.addEventListener('keydown', handleKeyDown)
  //   return () => document.removeEventListener('keydown', handleKeyDown)
  // }, [enabled, shortcut, selectedText])

  // Drag handlers
  const [clickStartPos, setClickStartPos] = useState({ x: 0, y: 0 })
  const [hasMoved, setHasMoved] = useState(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    setClickStartPos({ x: e.clientX, y: e.clientY })
    setHasMoved(false)
    setIsDragging(true)
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const dx = Math.abs(e.clientX - clickStartPos.x)
    const dy = Math.abs(e.clientY - clickStartPos.y)

    if (dx > 3 || dy > 3) {
      setHasMoved(true)
    }

    const newX = e.clientX - dragStartPos.current.x
    const newY = e.clientY - dragStartPos.current.y

    // Keep button within viewport
    const maxX = window.innerWidth - 60
    const maxY = window.innerHeight - 60

    const clampedPosition = {
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    }

    setPosition(clampedPosition)
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      if (hasMoved) {
        onPositionChange?.(position)
      }
    }
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, position, clickStartPos, hasMoved])

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    // Only open modal if user didn't drag
    if (!hasMoved) {
      setModalText(selectedText || '')
      setModalOpen(true)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(modalText)
    toast.success('Texte copié dans le presse-papier')
  }

  if (!enabled) return null

  return (
    <>
      {/* Floating Button */}
      <motion.div
        ref={buttonRef}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 9999,
          cursor: isDragging ? 'grabbing' : 'pointer'
        }}
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={handleButtonClick}
          className={cn(
            "relative p-3 rounded-full shadow-lg transition-all duration-300",
            "hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing",
            isActive
              ? "bg-gradient-to-r from-gray-700 to-gray-900 text-white animate-pulse"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          )}
          title="AI Text Assistant - Drag to move, Click to open"
        >
          <Wand2 size={20} />

          {/* Glow effect when active */}
          {isActive && (
            <motion.div
              className="absolute inset-0 rounded-full bg-gray-400 opacity-50 blur-xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </button>

        {/* Hint tooltip */}
        {!isDragging && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none"
          >
            {isActive ? 'Cliquez pour améliorer le texte' : 'Cliquez pour ouvrir l\'éditeur'}
          </motion.div>
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 bg-black/50 z-[9998]"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700 pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <div className="flex items-center gap-2">
                      <Wand2 className="text-gray-700 dark:text-gray-400" size={20} />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        AI Text Assistant
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Améliorez votre texte sélectionné avec l'IA
                    </p>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Editor */}
                <div className="flex-1 overflow-hidden">
                  <MarkdownEditorPro
                    content={modalText}
                    onChange={setModalText}
                    placeholder="Texte sélectionné..."
                    projectId={projectId}
                    showPreview={true}
                    showAIImprove={true}
                    minHeight="400px"
                    improvementContext="This is user-selected text to be improved. Make it clearer, more professional, and well-structured."
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700">
                    <Copy size={14} className="mr-2" />
                    Copier
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
