'use client'

import { useState } from 'react'
import { Block, BlockType } from '@/types/memory'
import { BlockRenderer } from './blocks/BlockRenderer'
import { BlockEditor } from './blocks/BlockEditor'
import { BlockTypeSelector } from './blocks/BlockTypeSelector'
import { Edit2, Trash2, Copy, ChevronUp, ChevronDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditableBlockListProps {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
}

/**
 * EditableBlockList - Editable list of blocks with full CRUD + reorder
 *
 * Features:
 * - View mode: Renders blocks with action buttons (edit, delete, duplicate, reorder)
 * - Edit mode: Shows editor when double-clicking or clicking edit
 * - Add: Insert new blocks between existing ones or at the end
 */
export function EditableBlockList({ blocks, onChange }: EditableBlockListProps) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [insertAfterBlockId, setInsertAfterBlockId] = useState<string | null>(null)

  // Create new empty block of specified type
  const createEmptyBlock = (type: BlockType): Block => {
    const baseBlock = {
      id: crypto.randomUUID(),
      type
    }

    switch (type) {
      case 'heading':
        return { ...baseBlock, type: 'heading', content: '', level: 2 } as Block
      case 'text':
        return { ...baseBlock, type: 'text', content: '' } as Block
      case 'checklist':
        return { ...baseBlock, type: 'checklist', items: [] } as Block
      case 'test_result':
        return { ...baseBlock, type: 'test_result', name: '', status: 'pending' } as Block
      case 'http_request':
        return { ...baseBlock, type: 'http_request', method: 'GET', url: '' } as Block
      case 'code':
        return { ...baseBlock, type: 'code', language: 'javascript', code: '' } as Block
      case 'note':
        return { ...baseBlock, type: 'note', content: '', variant: 'info' } as Block
      case 'divider':
        return { ...baseBlock, type: 'divider' } as Block
      default:
        return { ...baseBlock, type: 'text', content: '' } as Block
    }
  }

  const handleAddBlock = (type: BlockType, afterBlockId?: string) => {
    const newBlock = createEmptyBlock(type)

    if (!afterBlockId) {
      // Add at the end
      onChange([...blocks, newBlock])
    } else {
      // Insert after specific block
      const index = blocks.findIndex((b) => b.id === afterBlockId)
      const newBlocks = [...blocks]
      newBlocks.splice(index + 1, 0, newBlock)
      onChange(newBlocks)
    }

    // Start editing the new block
    setEditingBlockId(newBlock.id)
    setInsertAfterBlockId(null)
  }

  const handleSaveBlock = (updatedBlock: Block) => {
    onChange(blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)))
    setEditingBlockId(null)
  }

  const handleDeleteBlock = (blockId: string) => {
    if (!confirm('Delete this block?')) return
    onChange(blocks.filter((b) => b.id !== blockId))
  }

  const handleDuplicateBlock = (blockId: string) => {
    const blockToDuplicate = blocks.find((b) => b.id === blockId)
    if (!blockToDuplicate) return

    const duplicated = {
      ...blockToDuplicate,
      id: crypto.randomUUID()
    }

    const index = blocks.findIndex((b) => b.id === blockId)
    const newBlocks = [...blocks]
    newBlocks.splice(index + 1, 0, duplicated)
    onChange(newBlocks)
  }

  const handleMoveUp = (blockId: string) => {
    const index = blocks.findIndex((b) => b.id === blockId)
    if (index === 0) return

    const newBlocks = [...blocks]
    ;[newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]]
    onChange(newBlocks)
  }

  const handleMoveDown = (blockId: string) => {
    const index = blocks.findIndex((b) => b.id === blockId)
    if (index === blocks.length - 1) return

    const newBlocks = [...blocks]
    ;[newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]]
    onChange(newBlocks)
  }

  const handleToggleChecklistItem = (blockId: string, itemId: string) => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block || block.type !== 'checklist') return

    const updatedBlock = {
      ...block,
      items: block.items.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    }

    onChange(blocks.map((b) => (b.id === blockId ? updatedBlock : b)))
  }

  if (blocks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No content blocks yet</p>
        <BlockTypeSelector onSelect={(type) => handleAddBlock(type)} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <div key={block.id} className="group relative">
          {/* Block Content */}
          <div className="relative">
            {editingBlockId === block.id ? (
              // Edit Mode
              <BlockEditor
                block={block}
                onSave={handleSaveBlock}
                onCancel={() => setEditingBlockId(null)}
              />
            ) : (
              // View Mode with hover actions
              <div className="relative">
                <BlockRenderer
                  block={block}
                  onEdit={() => setEditingBlockId(block.id)}
                  onToggleChecklistItem={handleToggleChecklistItem}
                />

                {/* Action Buttons (visible on hover) */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={() => setEditingBlockId(block.id)}
                    className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                  </button>

                  <button
                    onClick={() => handleDuplicateBlock(block.id)}
                    className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                  </button>

                  {index > 0 && (
                    <button
                      onClick={() => handleMoveUp(block.id)}
                      className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                    </button>
                  )}

                  {index < blocks.length - 1 && (
                    <button
                      onClick={() => handleMoveDown(block.id)}
                      className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="p-1.5 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Insert Block Button (between blocks) */}
          {insertAfterBlockId === block.id ? (
            <div className="my-2 flex justify-center">
              <BlockTypeSelector
                onSelect={(type) => handleAddBlock(type, block.id)}
                className="inline-block"
              />
            </div>
          ) : (
            <button
              onClick={() => setInsertAfterBlockId(block.id)}
              className={cn(
                'absolute left-1/2 -translate-x-1/2 -bottom-2 z-10',
                'w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900',
                'flex items-center justify-center',
                'opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-600',
                'transition-all duration-150'
              )}
              title="Insert block below"
            >
              <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          )}
        </div>
      ))}

      {/* Add Block at the end */}
      {insertAfterBlockId === null && (
        <div className="flex justify-center pt-2">
          <BlockTypeSelector onSelect={(type) => handleAddBlock(type)} />
        </div>
      )}
    </div>
  )
}
