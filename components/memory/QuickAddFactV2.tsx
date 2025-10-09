'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, Save, X, Layout, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { BlockList } from './BlockList'
import { EditableBlockList } from './EditableBlockList'
import { TemplateSelector } from './BlockTemplates'
import { Block } from '@/types/memory'
import { cn } from '@/lib/utils'

interface QuickAddFactV2Props {
  projectId: string
  onSave: (fact: {
    fact: string
    category: string
    tags: string[]
    blocks: Block[]
  }) => Promise<void>
  onCancel?: () => void
  className?: string
}

type Mode = 'ai' | 'template' | 'manual'

/**
 * QuickAddFactV2 - Unified fact creation with 3 modes
 *
 * Modes:
 * - AI: Paste raw text → AI parses to blocks
 * - Template: Select pre-configured template
 * - Manual: Direct block editing
 */
export function QuickAddFactV2({ projectId, onSave, onCancel, className }: QuickAddFactV2Props) {
  const [mode, setMode] = useState<Mode>('template')
  const [input, setInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [fact, setFact] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])

  const [isEditingBlocks, setIsEditingBlocks] = useState(false)

  const handleParse = async () => {
    if (!input.trim()) {
      toast.error('Please enter some content')
      return
    }

    setParsing(true)
    try {
      const response = await fetch('/api/memory/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input.trim(),
          projectId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to parse')
      }

      const result = await response.json()

      setFact(result.fact)
      setCategory(result.category)
      setTags(result.tags)
      setBlocks(result.blocks)
      setMode('manual')  // Switch to edit mode

      toast.success('✨ Content parsed successfully!')
    } catch (error: any) {
      console.error('Parse error:', error)
      toast.error(error.message || 'Failed to parse content')
    } finally {
      setParsing(false)
    }
  }

  const handleTemplateSelect = (templateBlocks: Block[]) => {
    setBlocks(templateBlocks)
    setMode('manual')  // Switch to edit mode

    // Auto-generate title from first heading
    const firstHeading = templateBlocks.find(b => b.type === 'heading')
    if (firstHeading && firstHeading.type === 'heading') {
      setFact(firstHeading.content)
    }
  }

  const handleSave = async () => {
    if (!fact.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (blocks.length === 0) {
      toast.error('Please add at least one content block')
      return
    }

    setSaving(true)
    try {
      await onSave({
        fact,
        category: category || 'general',
        tags,
        blocks
      })

      // Reset state
      setInput('')
      setFact('')
      setCategory('')
      setTags([])
      setBlocks([])
      setMode('template')
      setIsEditingBlocks(false)
    } catch (error: any) {
      console.error('Save error:', error)
      toast.error('Failed to save fact')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (blocks.length > 0 || input) {
      if (!confirm('Discard changes?')) return
    }
    setInput('')
    setFact('')
    setCategory('')
    setTags([])
    setBlocks([])
    setMode('template')
    setIsEditingBlocks(false)
    onCancel?.()
  }

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4', className)}>
      {/* Mode Selector */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => setMode('template')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded transition-colors',
              mode === 'template'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <Layout className="w-4 h-4 inline-block mr-1.5" />
            Templates
          </button>
          <button
            onClick={() => setMode('ai')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded transition-colors',
              mode === 'ai'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <Sparkles className="w-4 h-4 inline-block mr-1.5" />
            AI Parse
          </button>
          <button
            onClick={() => setMode('manual')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded transition-colors',
              mode === 'manual'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <Edit2 className="w-4 h-4 inline-block mr-1.5" />
            Manual
          </button>
        </div>

        {blocks.length > 0 && (
          <Badge variant="outline" className="ml-auto">
            {blocks.length} block{blocks.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Content based on mode */}
      {mode === 'ai' && blocks.length === 0 && (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Paste pentesting notes in any format. AI will parse and structure them automatically.
          </p>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Example:\n\nIDOR /game/complete - Tests bonus\nWorkflow:\n- LANCER BONUS\n- CLICK COLLECT\nTest 1 (JWT demo→real) : échec confirmé`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 min-h-[150px] font-mono text-sm mb-3"
            disabled={parsing}
          />

          <div className="flex gap-2">
            <Button
              onClick={handleParse}
              disabled={!input.trim() || parsing}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {parsing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Parse with AI
                </>
              )}
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {mode === 'template' && blocks.length === 0 && (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Select a template to get started quickly:
          </p>

          <TemplateSelector onSelect={handleTemplateSelect} />

          {onCancel && (
            <div className="mt-3">
              <Button variant="outline" onClick={handleCancel} className="w-full">
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {mode === 'manual' && blocks.length === 0 && (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Start with a template or create blocks manually:
          </p>

          <TemplateSelector onSelect={handleTemplateSelect} />

          {onCancel && (
            <div className="mt-3">
              <Button variant="outline" onClick={handleCancel} className="w-full">
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Edit Mode (when blocks exist) */}
      {blocks.length > 0 && (
        <>
          {/* Fact Title */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={fact}
              onChange={(e) => setFact(e.target.value)}
              placeholder="Short title for this fact..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            />
          </div>

          {/* Category & Tags (optional) */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., api, vuln, recon"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={tags.join(', ')}
                onChange={(e) => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                placeholder="tag1, tag2, tag3"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm"
              />
            </div>
          </div>

          {/* Blocks Preview/Edit */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Content Blocks ({blocks.length})
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingBlocks(!isEditingBlocks)}
              >
                <Edit2 className="w-3 h-3 mr-1" />
                {isEditingBlocks ? 'Preview' : 'Edit'}
              </Button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50 max-h-[400px] overflow-y-auto">
              {isEditingBlocks ? (
                <EditableBlockList
                  blocks={blocks}
                  onChange={setBlocks}
                />
              ) : (
                <BlockList blocks={blocks} />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || !fact.trim()}
              className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Fact
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
