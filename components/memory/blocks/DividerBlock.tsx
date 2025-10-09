'use client'

import { DividerBlock as DividerBlockType } from '@/types/memory'

interface DividerBlockProps {
  block: DividerBlockType
  onEdit?: () => void
}

export function DividerBlock({ block, onEdit }: DividerBlockProps) {
  return (
    <hr
      className="my-4 border-gray-300 dark:border-gray-700 cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
      onClick={onEdit}
      onDoubleClick={onEdit}
    />
  )
}
