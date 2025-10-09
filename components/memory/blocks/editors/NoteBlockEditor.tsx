'use client'

import { useState } from 'react'
import { NoteBlock } from '@/types/memory'
import { Button } from '@/components/ui/button'
import { Save, X } from 'lucide-react'

interface NoteBlockEditorProps {
  block: NoteBlock
  onSave: (block: NoteBlock) => void
  onCancel: () => void
}

export function NoteBlockEditor({ block, onSave, onCancel }: NoteBlockEditorProps) {
  const [content, setContent] = useState(block.content)
  const [variant, setVariant] = useState<'info' | 'warning' | 'success' | 'error'>(
    block.variant || 'info'
  )

  const handleSave = () => {
    if (!content.trim()) return
    onSave({ ...block, content: content.trim(), variant })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
    // Ctrl+Enter to save
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-blue-500">
      <div className="mb-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Type
        </label>
        <select
          value={variant}
          onChange={(e) => setVariant(e.target.value as 'info' | 'warning' | 'success' | 'error')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm"
        >
          <option value="info">ℹ️ Info (Blue)</option>
          <option value="warning">⚠️ Warning (Yellow)</option>
          <option value="success">✅ Success (Green)</option>
          <option value="error">❌ Error (Red)</option>
        </select>
      </div>

      <div className="mb-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Note Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your note... (Ctrl+Enter to save)"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 min-h-[80px]"
          autoFocus
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={!content.trim()}>
          <Save className="w-3 h-3 mr-1" />
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
