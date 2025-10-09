'use client'

import { useState } from 'react'
import { HeadingBlock } from '@/types/memory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, X } from 'lucide-react'

interface HeadingBlockEditorProps {
  block: HeadingBlock
  onSave: (block: HeadingBlock) => void
  onCancel: () => void
}

export function HeadingBlockEditor({ block, onSave, onCancel }: HeadingBlockEditorProps) {
  const [content, setContent] = useState(block.content)
  const [level, setLevel] = useState<1 | 2 | 3>(block.level)

  const handleSave = () => {
    if (!content.trim()) return
    onSave({ ...block, content: content.trim(), level })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-blue-500">
      <div className="flex gap-2 mb-2">
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value) as 1 | 2 | 3)}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm"
        >
          <option value={1}>H1 (Large)</option>
          <option value={2}>H2 (Medium)</option>
          <option value={3}>H3 (Small)</option>
        </select>
      </div>

      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Heading text..."
        className="mb-2"
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
