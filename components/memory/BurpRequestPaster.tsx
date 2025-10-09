'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Check, FileText, Zap } from 'lucide-react'
import { parseBurpRequest, type HttpRequestMetadata } from '@/lib/types/http-metadata'
import { HttpRequestViewer } from './HttpRequestViewer'

interface BurpRequestPasterProps {
  onParsed: (request: HttpRequestMetadata) => void
  className?: string
}

export function BurpRequestPaster({ onParsed, className = '' }: BurpRequestPasterProps) {
  const [rawRequest, setRawRequest] = useState('')
  const [parsedRequest, setParsedRequest] = useState<HttpRequestMetadata | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const handleParse = () => {
    setParseError(null)
    setParsedRequest(null)

    if (!rawRequest.trim()) {
      setParseError('Please paste a request first')
      return
    }

    const parsed = parseBurpRequest(rawRequest)

    if (!parsed) {
      setParseError('Failed to parse request. Make sure it\'s a valid HTTP request from Burp Suite.')
      return
    }

    setParsedRequest(parsed)
  }

  const handleConfirm = () => {
    if (parsedRequest) {
      onParsed(parsedRequest)
      // Reset
      setRawRequest('')
      setParsedRequest(null)
      setParseError(null)
    }
  }

  const handleClear = () => {
    setRawRequest('')
    setParsedRequest(null)
    setParseError(null)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Paste Area */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Paste Burp Suite Request
          </label>
          {rawRequest && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </Button>
          )}
        </div>
        <textarea
          value={rawRequest}
          onChange={(e) => setRawRequest(e.target.value)}
          placeholder={`POST /api/endpoint HTTP/2
Host: example.com
User-Agent: Mozilla/5.0...
Content-Type: application/json
Authorization: Bearer xxx

{"key": "value"}`}
          className="w-full h-64 px-3 py-2 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">
          Copy the full HTTP request from Burp Suite (right-click → Copy to file / or select all in Request tab)
        </p>
      </div>

      {/* Parse Button */}
      {!parsedRequest && (
        <Button
          onClick={handleParse}
          disabled={!rawRequest.trim()}
          className="w-full bg-gradient-to-r from-gray-700 to-gray-900 text-white hover:from-gray-800 hover:to-black"
        >
          <Zap className="w-4 h-4 mr-2" />
          Parse Request
        </Button>
      )}

      {/* Error Display */}
      {parseError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900 dark:text-red-100">Parse Error</p>
            <p className="text-sm text-red-700 dark:text-red-300">{parseError}</p>
          </div>
        </div>
      )}

      {/* Preview Parsed Request */}
      {parsedRequest && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Request parsed successfully!
            </span>
            <Badge className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20">
              {Object.keys(parsedRequest.headers).length} headers
            </Badge>
            {parsedRequest.body && (
              <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                Body included
              </Badge>
            )}
          </div>

          {/* Preview */}
          <HttpRequestViewer request={parsedRequest} />

          {/* Confirm Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
            >
              <Check className="w-4 h-4 mr-2" />
              Use This Request
            </Button>
            <Button
              onClick={handleClear}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
