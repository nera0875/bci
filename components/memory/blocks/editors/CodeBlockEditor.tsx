'use client'

import { useState } from 'react'
import { CodeBlock } from '@/types/memory'
import { Button } from '@/components/ui/button'
import { Save, X } from 'lucide-react'

interface CodeBlockEditorProps {
  block: CodeBlock
  onSave: (block: CodeBlock) => void
  onCancel: () => void
}

const COMMON_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'json',
  'bash',
  'sql',
  'html',
  'css',
  'yaml',
  'markdown',
  'go',
  'rust',
  'java',
  'php',
  'ruby',
  'csharp',
  'plaintext'
]

export function CodeBlockEditor({ block, onSave, onCancel }: CodeBlockEditorProps) {
  const [code, setCode] = useState(block.code)
  const [language, setLanguage] = useState(block.language)

  const handleSave = () => {
    if (!code.trim()) return
    onSave({ ...block, code: code.trim(), language })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
    // Allow Tab in textarea
    if (e.key === 'Tab') {
      e.preventDefault()
      const target = e.target as HTMLTextAreaElement
      const start = target.selectionStart
      const end = target.selectionEnd
      setCode(code.substring(0, start) + '  ' + code.substring(end))
      // Move cursor after the inserted spaces
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2
      }, 0)
    }
  }

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-blue-500">
      <div className="mb-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Language
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm"
        >
          {COMMON_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Code
        </label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste or type your code here..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 min-h-[200px] font-mono text-sm"
          autoFocus
          spellCheck={false}
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={!code.trim()}>
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
