'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { TestResult } from './TestMatrixView'

interface TestDetailModalProps {
  endpoint: string
  technique: string
  result?: TestResult
  projectId: string
  onClose: () => void
  onUpdate: () => void
}

export default function TestDetailModal({
  endpoint,
  technique,
  result,
  projectId,
  onClose,
  onUpdate
}: TestDetailModalProps) {
  const [status, setStatus] = useState<'not_tested' | 'testing' | 'success' | 'failed'>(
    result?.status || 'not_tested'
  )
  const [payload, setPayload] = useState(result?.result?.payload || '')
  const [response, setResponse] = useState(result?.result?.response || '')
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low' | ''>(
    result?.result?.severity || ''
  )
  const [notes, setNotes] = useState(result?.result?.notes || '')
  const [httpMethod, setHttpMethod] = useState(result?.result?.http_method || 'GET')
  const [httpStatus, setHttpStatus] = useState(result?.result?.http_status || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)

      const testData = {
        project_id: projectId,
        endpoint,
        technique,
        status,
        result: {
          payload,
          response,
          severity: severity || null,
          notes,
          http_method: httpMethod,
          http_status: httpStatus ? parseInt(httpStatus as any) : null,
          vulnerability_confirmed: status === 'success'
        },
        tested_at: status !== 'not_tested' ? new Date().toISOString() : null
      }

      if (result) {
        // Update existing
        const { error } = await supabase
          .from('test_results')
          .update(testData)
          .eq('id', result.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('test_results')
          .insert(testData)

        if (error) throw error
      }

      toast.success('Test result saved successfully')
      onUpdate()

    } catch (error: any) {
      console.error('Error saving test result:', error)
      toast.error('Failed to save test result')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!result) return

    if (!confirm('Delete this test result?')) return

    try {
      const { error } = await supabase
        .from('test_results')
        .delete()
        .eq('id', result.id)

      if (error) throw error

      toast.success('Test result deleted')
      onUpdate()

    } catch (error: any) {
      console.error('Error deleting test result:', error)
      toast.error('Failed to delete test result')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {technique} Test
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {endpoint}
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
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <div className="flex gap-2">
              {['not_tested', 'testing', 'success', 'failed'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s as any)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${status === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {s === 'not_tested' ? '○ Not Tested' : s === 'testing' ? '⏳ Testing' : s === 'success' ? '✅ Success' : '❌ Failed'}
                </button>
              ))}
            </div>
          </div>

          {/* HTTP Method & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                HTTP Method
              </label>
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
                <option value="OPTIONS">OPTIONS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                HTTP Status
              </label>
              <Input
                type="number"
                placeholder="200"
                value={httpStatus}
                onChange={(e) => setHttpStatus(e.target.value)}
              />
            </div>
          </div>

          {/* Severity (if success) */}
          {status === 'success' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Severity
              </label>
              <div className="flex gap-2">
                {['critical', 'high', 'medium', 'low'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverity(s as any)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${severity === s
                        ? s === 'critical' ? 'bg-red-600 text-white' :
                          s === 'high' ? 'bg-orange-500 text-white' :
                          s === 'medium' ? 'bg-yellow-500 text-white' :
                          'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payload
            </label>
            <Textarea
              placeholder="admin' OR 1=1--"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={3}
            />
          </div>

          {/* Response */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Response
            </label>
            <Textarea
              placeholder="Server response..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <Textarea
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-800">
          <div>
            {result && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
