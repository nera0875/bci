'use client'

import { useState } from 'react'
import { HttpRequestBlock as HttpRequestBlockType } from '@/types/memory'
import { ChevronDown, ChevronRight, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface HttpRequestBlockProps {
  block: HttpRequestBlockType
  onEdit?: () => void
}

export function HttpRequestBlock({ block, onEdit }: HttpRequestBlockProps) {
  const [expanded, setExpanded] = useState(false)

  const methodColors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    POST: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    PATCH: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }

  const statusColor = block.response
    ? block.response.status < 400
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    : ''

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        onDoubleClick={onEdit}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}

        <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />

        <Badge className={cn('font-mono text-xs', methodColors[block.method] || 'bg-gray-100')}>
          {block.method}
        </Badge>

        <code className="text-sm font-mono text-gray-900 dark:text-gray-100 flex-1 truncate">
          {block.url}
        </code>

        {block.response && (
          <Badge className={cn('font-mono text-xs', statusColor)}>
            {block.response.status}
          </Badge>
        )}
      </button>

      {/* Details - Collapsible */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-3 space-y-3">
          {/* Request Headers */}
          {block.headers && Object.keys(block.headers).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Request Headers
              </h4>
              <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                {JSON.stringify(block.headers, null, 2)}
              </pre>
            </div>
          )}

          {/* Request Body */}
          {block.body && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Request Body
              </h4>
              <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                {typeof block.body === 'string'
                  ? block.body
                  : JSON.stringify(block.body, null, 2)}
              </pre>
            </div>
          )}

          {/* Response */}
          {block.response && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Response ({block.response.status})
              </h4>

              {block.response.headers && Object.keys(block.response.headers).length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Headers:</p>
                  <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    {JSON.stringify(block.response.headers, null, 2)}
                  </pre>
                </div>
              )}

              {block.response.body && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Body:</p>
                  <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto max-h-96">
                    {typeof block.response.body === 'string'
                      ? block.response.body
                      : JSON.stringify(block.response.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
