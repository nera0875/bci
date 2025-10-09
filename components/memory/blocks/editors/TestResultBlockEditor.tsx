'use client'

import { useState } from 'react'
import { TestResultBlock } from '@/types/memory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, X } from 'lucide-react'

interface TestResultBlockEditorProps {
  block: TestResultBlock
  onSave: (block: TestResultBlock) => void
  onCancel: () => void
}

export function TestResultBlockEditor({ block, onSave, onCancel }: TestResultBlockEditorProps) {
  const [name, setName] = useState(block.name)
  const [status, setStatus] = useState<'success' | 'failed' | 'pending'>(block.status)
  const [details, setDetails] = useState(block.details || '')

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      ...block,
      name: name.trim(),
      status,
      details: details.trim() || undefined,
      timestamp: new Date().toISOString()
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-blue-500">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Test Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Test 1 (JWT demo→real)"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'success' | 'failed' | 'pending')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
          >
            <option value="success">✅ Success</option>
            <option value="failed">❌ Failed</option>
            <option value="pending">⏳ Pending</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Details (optional)
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Additional details about the test result..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 min-h-[60px]"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
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
