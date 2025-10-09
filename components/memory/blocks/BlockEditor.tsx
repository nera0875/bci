'use client'

import { Block } from '@/types/memory'
import { HeadingBlockEditor } from './editors/HeadingBlockEditor'
import { TextBlockEditor } from './editors/TextBlockEditor'
import { ChecklistBlockEditor } from './editors/ChecklistBlockEditor'
import { TestResultBlockEditor } from './editors/TestResultBlockEditor'
import { HttpRequestBlockEditor } from './editors/HttpRequestBlockEditor'
import { CodeBlockEditor } from './editors/CodeBlockEditor'
import { NoteBlockEditor } from './editors/NoteBlockEditor'
import { DividerBlockEditor } from './editors/DividerBlockEditor'

interface BlockEditorProps {
  block: Block
  onSave: (block: Block) => void
  onCancel: () => void
}

/**
 * BlockEditor - Routes to the correct editor component based on block type
 *
 * This is the main entry point for editing any block.
 */
export function BlockEditor({ block, onSave, onCancel }: BlockEditorProps) {
  switch (block.type) {
    case 'heading':
      return <HeadingBlockEditor block={block} onSave={onSave} onCancel={onCancel} />

    case 'text':
      return <TextBlockEditor block={block} onSave={onSave} onCancel={onCancel} />

    case 'checklist':
      return <ChecklistBlockEditor block={block} onSave={onSave} onCancel={onCancel} />

    case 'test_result':
      return <TestResultBlockEditor block={block} onSave={onSave} onCancel={onCancel} />

    case 'http_request':
      return <HttpRequestBlockEditor block={block} onSave={onSave} onCancel={onCancel} />

    case 'code':
      return <CodeBlockEditor block={block} onSave={onSave} onCancel={onCancel} />

    case 'note':
      return <NoteBlockEditor block={block} onSave={onSave} onCancel={onCancel} />

    case 'divider':
      return <DividerBlockEditor block={block} onSave={onSave} onCancel={onCancel} />

    default:
      // Fallback for unknown block types
      console.warn('Unknown block type for editing:', (block as any).type)
      return (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Cannot edit unknown block type: {(block as any).type}
          </p>
          <button
            onClick={onCancel}
            className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 underline"
          >
            Cancel
          </button>
        </div>
      )
  }
}
