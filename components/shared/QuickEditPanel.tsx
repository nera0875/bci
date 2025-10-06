'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { X, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface QuickEditPanelProps {
  isOpen: boolean
  title: string
  icon?: string
  onClose: () => void
  onSave?: () => void
  onDelete?: () => void
  children: ReactNode
  position?: 'right' | 'bottom'
  width?: string
  saveLabel?: string
  deleteLabel?: string
  showDelete?: boolean
  className?: string
}

export function QuickEditPanel({
  isOpen,
  title,
  icon,
  onClose,
  onSave,
  onDelete,
  children,
  position = 'right',
  width = '500px',
  saveLabel = 'Save',
  deleteLabel = 'Delete',
  showDelete = true,
  className = ''
}: QuickEditPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 100)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const positionClasses = {
    right: `fixed top-0 right-0 h-full ${width} transform transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`,
    bottom: `fixed bottom-0 left-0 right-0 h-[70vh] transform transition-transform duration-300 ${
      isOpen ? 'translate-y-0' : 'translate-y-full'
    }`
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          positionClasses[position],
          "bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col",
          position === 'right' && 'border-l border-gray-200 dark:border-gray-800',
          position === 'bottom' && 'border-t border-gray-200 dark:border-gray-800 rounded-t-2xl',
          className
        )}
        style={{ width: position === 'right' ? width : '100%' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            {icon && <span className="text-2xl">{icon}</span>}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer Actions */}
        {(onSave || onDelete) && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div>
              {showDelete && onDelete && (
                <Button
                  onClick={onDelete}
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={16} className="mr-2" />
                  {deleteLabel}
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
              {onSave && (
                <Button onClick={onSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save size={16} className="mr-2" />
                  {saveLabel}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
