'use client'

import { DividerBlock } from '@/types/memory'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface DividerBlockEditorProps {
  block: DividerBlock
  onSave: (block: DividerBlock) => void
  onCancel: () => void
}

/**
 * DividerBlockEditor - Minimal editor for dividers
 * Dividers have no editable properties, but we show a message
 */
export function DividerBlockEditor({ block, onSave, onCancel }: DividerBlockEditorProps) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-blue-500 text-center">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Dividers have no editable properties.
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
        You can delete this divider or keep it as-is.
      </p>
      <Button size="sm" variant="outline" onClick={onCancel}>
        <X className="w-3 h-3 mr-1" />
        Close
      </Button>
    </div>
  )
}
