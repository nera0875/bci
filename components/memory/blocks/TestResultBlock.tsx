'use client'

import { TestResultBlock as TestResultBlockType } from '@/types/memory'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TestResultBlockProps {
  block: TestResultBlockType
  onEdit?: () => void
}

export function TestResultBlock({ block, onEdit }: TestResultBlockProps) {
  const statusConfig = {
    success: {
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800'
    },
    failed: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800'
    },
    pending: {
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
      border: 'border-yellow-200 dark:border-yellow-800'
    }
  }

  const config = statusConfig[block.status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        config.bg,
        config.border,
        onEdit && 'cursor-pointer hover:shadow-sm transition-shadow'
      )}
      onClick={onEdit}
      onDoubleClick={onEdit}
    >
      <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {block.name}
          </span>
          {block.timestamp && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(block.timestamp).toLocaleString()}
            </span>
          )}
        </div>
        {block.details && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {block.details}
          </p>
        )}
      </div>
    </div>
  )
}
