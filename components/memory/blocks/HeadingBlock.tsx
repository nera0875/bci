'use client'

import { HeadingBlock as HeadingBlockType } from '@/types/memory'
import { cn } from '@/lib/utils'

interface HeadingBlockProps {
  block: HeadingBlockType
  onEdit?: () => void
}

export function HeadingBlock({ block, onEdit }: HeadingBlockProps) {
  const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3'

  const styles = {
    1: 'text-2xl font-bold text-gray-900 dark:text-gray-100',
    2: 'text-xl font-semibold text-gray-900 dark:text-gray-100',
    3: 'text-lg font-medium text-gray-900 dark:text-gray-100'
  }

  return (
    <Tag
      className={cn(
        styles[block.level],
        'py-2',
        onEdit && 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors'
      )}
      onClick={onEdit}
      onDoubleClick={onEdit}
    >
      {block.content}
    </Tag>
  )
}
