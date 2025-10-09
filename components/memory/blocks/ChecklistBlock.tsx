'use client'

import { ChecklistBlock as ChecklistBlockType } from '@/types/memory'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChecklistBlockProps {
  block: ChecklistBlockType
  onEdit?: () => void
  onToggleItem?: (itemId: string) => void
}

export function ChecklistBlock({ block, onEdit, onToggleItem }: ChecklistBlockProps) {
  return (
    <div className="space-y-1.5">
      {block.items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'flex items-start gap-2 group',
            onEdit && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-1 rounded transition-colors'
          )}
          onClick={onEdit}
          onDoubleClick={onEdit}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleItem?.(item.id)
            }}
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors mt-0.5',
              item.checked
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            )}
          >
            {item.checked && <Check className="w-3 h-3" />}
          </button>
          <span
            className={cn(
              'text-gray-700 dark:text-gray-300 flex-1',
              item.checked && 'line-through text-gray-500 dark:text-gray-500'
            )}
          >
            {item.text}
          </span>
        </div>
      ))}
    </div>
  )
}
