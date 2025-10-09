'use client'

import { TextBlock as TextBlockType } from '@/types/memory'
import { cn } from '@/lib/utils'

interface TextBlockProps {
  block: TextBlockType
  onEdit?: () => void
}

export function TextBlock({ block, onEdit }: TextBlockProps) {
  return (
    <p
      className={cn(
        'text-gray-700 dark:text-gray-300 leading-relaxed',
        onEdit && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded transition-colors'
      )}
      onClick={onEdit}
      onDoubleClick={onEdit}
    >
      {block.content}
    </p>
  )
}
