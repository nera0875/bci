'use client'

import { useState } from 'react'
import { X, Plus, Save, Loader2 } from 'lucide-react'

interface AddMemoryModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (content: string) => Promise<void>
  compartmentName: string
}

export default function AddMemoryModal({
  isOpen,
  onClose,
  onAdd,
  compartmentName
}: AddMemoryModalProps) {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAdd = async () => {
    if (!content.trim()) return

    setIsLoading(true)
    try {
      await onAdd(content.trim())
      setContent('')
      onClose()
    } catch (error) {
      console.error('Error adding memory:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setContent('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            Add Memory to {compartmentName}
          </h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter memory content..."
            className="w-full h-32 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            autoFocus
          />
          <p className="text-sm text-gray-500 mt-2">
            This memory will be stored in your {compartmentName} compartment.
          </p>
        </div>

        <div className="flex gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!content.trim() || isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isLoading ? 'Adding...' : 'Add Memory'}
          </button>
        </div>
      </div>
    </div>
  )
}