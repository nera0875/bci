'use client'

import { Block } from '@/types/memory'
import { HeadingBlock } from './HeadingBlock'
import { TextBlock } from './TextBlock'
import { ChecklistBlock } from './ChecklistBlock'
import { TestResultBlock } from './TestResultBlock'
import { HttpRequestBlock } from './HttpRequestBlock'
import { CodeBlock } from './CodeBlock'
import { NoteBlock } from './NoteBlock'
import { DividerBlock } from './DividerBlock'

interface BlockRendererProps {
  block: Block
  onEdit?: (block: Block) => void
  onDelete?: (blockId: string) => void
  onToggleChecklistItem?: (blockId: string, itemId: string) => void
}

/**
 * BlockRenderer - Routes to the correct block component based on type
 *
 * This is the main entry point for rendering any block in view mode.
 */
export function BlockRenderer({
  block,
  onEdit,
  onDelete,
  onToggleChecklistItem
}: BlockRendererProps) {
  const handleEdit = onEdit ? () => onEdit(block) : undefined

  switch (block.type) {
    case 'heading':
      return <HeadingBlock block={block} onEdit={handleEdit} />

    case 'text':
      return <TextBlock block={block} onEdit={handleEdit} />

    case 'checklist':
      return (
        <ChecklistBlock
          block={block}
          onEdit={handleEdit}
          onToggleItem={
            onToggleChecklistItem
              ? (itemId) => onToggleChecklistItem(block.id, itemId)
              : undefined
          }
        />
      )

    case 'test_result':
      return <TestResultBlock block={block} onEdit={handleEdit} />

    case 'http_request':
      return <HttpRequestBlock block={block} onEdit={handleEdit} />

    case 'code':
      return <CodeBlock block={block} onEdit={handleEdit} />

    case 'note':
      return <NoteBlock block={block} onEdit={handleEdit} />

    case 'divider':
      return <DividerBlock block={block} onEdit={handleEdit} />

    default:
      // Fallback for unknown block types
      console.warn('Unknown block type:', (block as any).type)
      return (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Unknown block type: {(block as any).type}
          </p>
        </div>
      )
  }
}
