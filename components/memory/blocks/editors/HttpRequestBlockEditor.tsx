'use client'

import { useState } from 'react'
import { HttpRequestBlock } from '@/types/memory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, X } from 'lucide-react'

interface HttpRequestBlockEditorProps {
  block: HttpRequestBlock
  onSave: (block: HttpRequestBlock) => void
  onCancel: () => void
}

export function HttpRequestBlockEditor({ block, onSave, onCancel }: HttpRequestBlockEditorProps) {
  const [method, setMethod] = useState(block.method)
  const [url, setUrl] = useState(block.url)
  const [headersText, setHeadersText] = useState(
    block.headers ? JSON.stringify(block.headers, null, 2) : ''
  )
  const [bodyText, setBodyText] = useState(
    block.body ? (typeof block.body === 'string' ? block.body : JSON.stringify(block.body, null, 2)) : ''
  )
  const [responseStatusText, setResponseStatusText] = useState(
    block.response?.status?.toString() || ''
  )
  const [responseBodyText, setResponseBodyText] = useState(
    block.response?.body
      ? typeof block.response.body === 'string'
        ? block.response.body
        : JSON.stringify(block.response.body, null, 2)
      : ''
  )

  const handleSave = () => {
    if (!method.trim() || !url.trim()) return

    // Parse headers
    let headers: Record<string, string> | undefined
    if (headersText.trim()) {
      try {
        headers = JSON.parse(headersText)
      } catch {
        // Fallback: parse as key:value pairs
        headers = {}
        headersText.split('\n').forEach((line) => {
          const [key, ...valueParts] = line.split(':')
          if (key && valueParts.length > 0) {
            headers![key.trim()] = valueParts.join(':').trim()
          }
        })
      }
    }

    // Parse body
    let body: any
    if (bodyText.trim()) {
      try {
        body = JSON.parse(bodyText)
      } catch {
        body = bodyText // Keep as string if not valid JSON
      }
    }

    // Parse response
    let response: HttpRequestBlock['response']
    if (responseStatusText.trim() || responseBodyText.trim()) {
      response = {
        status: parseInt(responseStatusText) || 200
      }

      if (responseBodyText.trim()) {
        try {
          response.body = JSON.parse(responseBodyText)
        } catch {
          response.body = responseBodyText
        }
      }
    }

    onSave({
      ...block,
      method: method.trim(),
      url: url.trim(),
      headers,
      body,
      response
    })
  }

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-blue-500 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
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
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            URL
          </label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/api/endpoint"
            autoFocus
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Headers (JSON or key:value)
        </label>
        <textarea
          value={headersText}
          onChange={(e) => setHeadersText(e.target.value)}
          placeholder='{"Authorization": "Bearer token"}'
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 min-h-[60px] font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Body (JSON or text)
        </label>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          placeholder='{"key": "value"}'
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 min-h-[80px] font-mono text-sm"
        />
      </div>

      <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Response (optional)
        </label>

        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status Code
          </label>
          <Input
            type="number"
            value={responseStatusText}
            onChange={(e) => setResponseStatusText(e.target.value)}
            placeholder="200"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Response Body
          </label>
          <textarea
            value={responseBodyText}
            onChange={(e) => setResponseBodyText(e.target.value)}
            placeholder='{"result": "success"}'
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 min-h-[60px] font-mono text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={!method.trim() || !url.trim()}>
          <Save className="w-3 h-3 mr-1" />
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
