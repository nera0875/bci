'use client'

import { useState } from 'react'
import { ChecklistBlock } from '@/types/memory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, X, Plus, Trash2 } from 'lucide-react'

interface ChecklistBlockEditorProps {
  block: ChecklistBlock
  onSave: (block: ChecklistBlock) => void
  onCancel: () => void
}

export function ChecklistBlockEditor({ block, onSave, onCancel }: ChecklistBlockEditorProps) {
  const [items, setItems] = useState(block.items)
  const [newItemText, setNewItemText] = useState('')

  const handleAddItem = () => {
    if (!newItemText.trim()) return
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        text: newItemText.trim(),
        checked: false
      }
    ])
    setNewItemText('')
  }

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId))
  }

  const handleUpdateItem = (itemId: string, text: string) => {
    setItems(
      items.map((item) => (item.id === itemId ? { ...item, text } : item))
    )
  }

  const handleSave = () => {
    if (items.length === 0) return
    onSave({ ...block, items })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddItem()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-blue-500">
      <div className="space-y-2 mb-3">
        {items.map((item, index) => (
          <div key={item.id} className="flex gap-2">
            <Input
              value={item.text}
              onChange={(e) => handleUpdateItem(item.id, e.target.value)}
              placeholder={`Item ${index + 1}`}
              className="flex-1"
              autoFocus={index === 0}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRemoveItem(item.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add new item... (Enter to add)"
          className="flex-1"
        />
        <Button size="sm" onClick={handleAddItem} disabled={!newItemText.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={items.length === 0}>
          <Save className="w-3 h-3 mr-1" />
          Save ({items.length} items)
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
