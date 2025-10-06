'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AddEndpointModalProps {
  projectId: string
  onClose: () => void
  onSuccess: () => void
  existingEndpoints?: string[]
}

export default function AddEndpointModal({
  projectId,
  onClose,
  onSuccess,
  existingEndpoints = []
}: AddEndpointModalProps) {
  const [endpoints, setEndpoints] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)

  const addEndpointField = () => {
    setEndpoints([...endpoints, ''])
  }

  const removeEndpointField = (index: number) => {
    setEndpoints(endpoints.filter((_, i) => i !== index))
  }

  const updateEndpoint = (index: number, value: string) => {
    const newEndpoints = [...endpoints]
    newEndpoints[index] = value
    setEndpoints(newEndpoints)
  }

  const handleSave = async () => {
    // Validate
    const validEndpoints = endpoints.filter(e => e.trim().length > 0)

    if (validEndpoints.length === 0) {
      toast.error('Please enter at least one endpoint')
      return
    }

    // Check duplicates
    const duplicates = validEndpoints.filter(e => existingEndpoints.includes(e.trim()))
    if (duplicates.length > 0) {
      toast.error(`Endpoints already exist: ${duplicates.join(', ')}`)
      return
    }

    setSaving(true)

    try {
      // Create test_results entries for each endpoint × technique combination
      const techniques = ['SQLi', 'XSS', 'IDOR', 'CSRF', 'Auth', 'BizLogic', 'SSRF', 'RCE', 'LFI', 'XXE', 'Priv.Esc', 'FileUpload']

      const records = validEndpoints.flatMap(endpoint =>
        techniques.map(technique => ({
          project_id: projectId,
          endpoint: endpoint.trim(),
          technique,
          status: 'not_tested',
          result: {}
        }))
      )

      const { error } = await supabase
        .from('test_results')
        .insert(records)

      if (error) throw error

      toast.success(`${validEndpoints.length} endpoint(s) added with ${techniques.length} techniques each`)
      onSuccess()
      onClose()

    } catch (error: any) {
      console.error('Error adding endpoints:', error)
      toast.error('Failed to add endpoints')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Add New Endpoints
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Add one or more API endpoints to test. Each endpoint will be tested with all 12 techniques.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {endpoints.map((endpoint, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="/api/users, /admin/dashboard, etc."
                value={endpoint}
                onChange={(e) => updateEndpoint(index, e.target.value)}
                className="flex-1"
              />
              {endpoints.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeEndpointField(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={addEndpointField}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Endpoint
          </Button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Adding...' : `Add ${endpoints.filter(e => e.trim()).length} Endpoint(s)`}
          </Button>
        </div>
      </div>
    </div>
  )
}
