'use client'

import { Block } from '@/types/memory'
import { BlockRenderer } from './blocks/BlockRenderer'

interface BlockListProps {
  blocks: Block[]
  onEditBlock?: (block: Block) => void
  onDeleteBlock?: (blockId: string) => void
  onToggleChecklistItem?: (blockId: string, itemId: string) => void
}

/**
 * BlockList - Displays a list of blocks in view mode
 *
 * Used in FactDetailPanel to render fact content as blocks
 */
export function BlockList({
  blocks,
  onEditBlock,
  onDeleteBlock,
  onToggleChecklistItem
}: BlockListProps) {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="text-sm">No content blocks</p>
        <p className="text-xs mt-1">Click "+" to add your first block</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <BlockRenderer
          key={block.id}
          block={block}
          onEdit={onEditBlock}
          onDelete={onDeleteBlock}
          onToggleChecklistItem={onToggleChecklistItem}
        />
      ))}
    </div>
  )
}
