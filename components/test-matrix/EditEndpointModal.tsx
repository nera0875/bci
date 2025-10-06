'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface EditEndpointModalProps {
  projectId: string
  endpoint: string
  onClose: () => void
  onSuccess: () => void
  existingEndpoints: string[]
}

export default function EditEndpointModal({
  projectId,
  endpoint,
  onClose,
  onSuccess,
  existingEndpoints
}: EditEndpointModalProps) {
  const [newEndpoint, setNewEndpoint] = useState(endpoint)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    const trimmed = newEndpoint.trim()

    if (trimmed.length === 0) {
      toast.error('Endpoint cannot be empty')
      return
    }

    if (trimmed === endpoint) {
      toast.info('No changes made')
      onClose()
      return
    }

    // Check duplicate
    if (existingEndpoints.includes(trimmed) && trimmed !== endpoint) {
      toast.error('Endpoint already exists')
      return
    }

    setSaving(true)

    try {
      // Update all test_results for this endpoint
      const { error } = await supabase
        .from('test_results')
        .update({ endpoint: trimmed })
        .eq('project_id', projectId)
        .eq('endpoint', endpoint)

      if (error) throw error

      toast.success('Endpoint updated successfully')
      onSuccess()
      onClose()

    } catch (error: any) {
      console.error('Error updating endpoint:', error)
      toast.error('Failed to update endpoint')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete endpoint "${endpoint}" and all its test results?`)) return

    setDeleting(true)

    try {
      const { error } = await supabase
        .from('test_results')
        .delete()
        .eq('project_id', projectId)
        .eq('endpoint', endpoint)

      if (error) throw error

      toast.success('Endpoint deleted successfully')
      onSuccess()
      onClose()

    } catch (error: any) {
      console.error('Error deleting endpoint:', error)
      toast.error('Failed to delete endpoint')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Edit Endpoint
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Endpoint URL
            </label>
            <Input
              placeholder="/api/users"
              value={newEndpoint}
              onChange={(e) => setNewEndpoint(e.target.value)}
            />
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ Updating will change the endpoint for all {12} techniques
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-800">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
