'use client'

import { useState } from 'react'
import { TextBlock } from '@/types/memory'
import { Button } from '@/components/ui/button'
import { Save, X } from 'lucide-react'

interface TextBlockEditorProps {
  block: TextBlock
  onSave: (block: TextBlock) => void
  onCancel: () => void
}

export function TextBlockEditor({ block, onSave, onCancel }: TextBlockEditorProps) {
  const [content, setContent] = useState(block.content)

  const handleSave = () => {
    if (!content.trim()) return
    onSave({ ...block, content: content.trim() })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
    // Allow Shift+Enter for new lines, Ctrl+Enter to save
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-blue-500">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter text... (Ctrl+Enter to save, Esc to cancel)"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 min-h-[80px] mb-2"
        autoFocus
      />

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
