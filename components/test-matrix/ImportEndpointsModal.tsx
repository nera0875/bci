'use client'

import { useState } from 'react'
import { X, Upload, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ImportEndpointsModalProps {
  projectId: string
  onClose: () => void
  onSuccess: () => void
  existingEndpoints: string[]
}

export default function ImportEndpointsModal({
  projectId,
  onClose,
  onSuccess,
  existingEndpoints
}: ImportEndpointsModalProps) {
  const [importing, setImporting] = useState(false)
  const [fileContent, setFileContent] = useState<string>('')
  const [preview, setPreview] = useState<string[]>([])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setFileContent(content)

      try {
        // Try JSON first
        const json = JSON.parse(content)
        let endpoints: string[] = []

        if (Array.isArray(json)) {
          // Array of endpoints or test results
          endpoints = json.map(item =>
            typeof item === 'string' ? item : item.endpoint
          ).filter(Boolean)
        } else if (json.endpoint) {
          endpoints = [json.endpoint]
        }

        setPreview([...new Set(endpoints)])
      } catch {
        // Try CSV/plain text
        const lines = content.split(/[\n,]/).map(l => l.trim()).filter(Boolean)
        setPreview([...new Set(lines)])
      }
    }

    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (preview.length === 0) {
      toast.error('No endpoints to import')
      return
    }

    // Filter out duplicates
    const newEndpoints = preview.filter(ep => !existingEndpoints.includes(ep))

    if (newEndpoints.length === 0) {
      toast.error('All endpoints already exist')
      return
    }

    setImporting(true)

    try {
      const techniques = ['SQLi', 'XSS', 'IDOR', 'CSRF', 'Auth', 'BizLogic', 'SSRF', 'RCE', 'LFI', 'XXE', 'Priv.Esc', 'FileUpload']

      const records = newEndpoints.flatMap(endpoint =>
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

      toast.success(`Imported ${newEndpoints.length} new endpoint(s)`)
      if (preview.length > newEndpoints.length) {
        toast.info(`${preview.length - newEndpoints.length} duplicate(s) skipped`)
      }

      onSuccess()
      onClose()

    } catch (error: any) {
      console.error('Error importing endpoints:', error)
      toast.error('Failed to import endpoints')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Import Endpoints
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Upload JSON or CSV file with endpoints
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
          {/* Upload area */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8">
            <input
              type="file"
              accept=".json,.csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center cursor-pointer"
            >
              <Upload className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Click to upload or drag & drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                JSON, CSV, or TXT files
              </p>
            </label>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Preview ({preview.length} endpoints)
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {preview.filter(ep => existingEndpoints.includes(ep)).length} duplicates
                </span>
              </div>
              <div className="max-h-48 overflow-auto space-y-1">
                {preview.map((endpoint, index) => {
                  const isDuplicate = existingEndpoints.includes(endpoint)
                  return (
                    <div
                      key={index}
                      className={`
                        text-xs px-2 py-1.5 rounded
                        ${isDuplicate
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 line-through'
                          : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        }
                      `}
                    >
                      {isDuplicate && '❌ '}
                      {!isDuplicate && '✅ '}
                      {endpoint}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Format examples */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              📄 Supported Formats:
            </h4>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 font-mono">
              <div>
                <strong>JSON Array:</strong>
                <div className="bg-gray-900 dark:bg-gray-950 text-green-400 p-2 rounded mt-1">
                  ["/api/users", "/api/posts", "/admin/dashboard"]
                </div>
              </div>
              <div>
                <strong>CSV/Text:</strong>
                <div className="bg-gray-900 dark:bg-gray-950 text-green-400 p-2 rounded mt-1">
                  /api/users, /api/posts, /admin/dashboard
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || preview.length === 0}
          >
            {importing ? 'Importing...' : `Import ${preview.filter(ep => !existingEndpoints.includes(ep)).length} Endpoint(s)`}
          </Button>
        </div>
      </div>
    </div>
  )
}
