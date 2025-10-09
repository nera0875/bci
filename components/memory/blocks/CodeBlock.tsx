'use client'

import { CodeBlock as CodeBlockType } from '@/types/memory'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  block: CodeBlockType
  onEdit?: () => void
}

export function CodeBlock({ block, onEdit }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(block.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700',
        onEdit && 'cursor-pointer'
      )}
      onClick={onEdit}
      onDoubleClick={onEdit}
    >
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
          {block.language}
        </span>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Code content */}
      <pre className="p-3 overflow-x-auto bg-white dark:bg-gray-900 text-sm">
        <code className="font-mono text-gray-900 dark:text-gray-100">
          {block.code}
        </code>
      </pre>
    </div>
  )
}
