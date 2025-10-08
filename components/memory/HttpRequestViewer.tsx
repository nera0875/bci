'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronDown, ChevronRight, Copy, Check,
  Lock, Key, AlertTriangle, Globe, Clock
} from 'lucide-react'
import { toast } from 'sonner'
import type { HttpRequestMetadata, HttpResponseMetadata } from '@/lib/types/http-metadata'
import { formatHttpRequest, extractSensitiveInfo } from '@/lib/types/http-metadata'

interface HttpRequestViewerProps {
  request: HttpRequestMetadata
  response?: HttpResponseMetadata
  className?: string
}

export function HttpRequestViewer({ request, response, className = '' }: HttpRequestViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']))
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(section)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const sensitiveInfo = extractSensitiveInfo(request)
  const hasBody = request.body && (typeof request.body === 'string' ? request.body.length > 0 : Object.keys(request.body).length > 0)

  // Format body pour affichage
  const formatBody = (body: any) => {
    if (!body) return ''
    if (typeof body === 'string') return body
    return JSON.stringify(body, null, 2)
  }

  // Méthode color coding
  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-blue-500 text-white'
      case 'POST': return 'bg-green-500 text-white'
      case 'PUT': return 'bg-orange-500 text-white'
      case 'DELETE': return 'bg-red-500 text-white'
      case 'PATCH': return 'bg-purple-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  // Status color coding
  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-500 text-white'
    if (status >= 300 && status < 400) return 'bg-blue-500 text-white'
    if (status >= 400 && status < 500) return 'bg-orange-500 text-white'
    if (status >= 500) return 'bg-red-500 text-white'
    return 'bg-gray-500 text-white'
  }

  return (
    <div className={`bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Overview Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('overview')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.has('overview') ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">HTTP Request</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getMethodColor(request.method)}>
              {request.method}
            </Badge>
            {request.protocol && (
              <Badge variant="outline" className="text-xs">
                {request.protocol}
              </Badge>
            )}
          </div>
        </button>

        {expandedSections.has('overview') && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-750">
            {/* URL */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500">URL</span>
                <button
                  onClick={() => copyToClipboard(request.url, 'url')}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {copiedSection === 'url' ? (
                    <><Check className="w-3 h-3" /> Copied</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Copy</>
                  )}
                </button>
              </div>
              <div className="bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
                <code className="text-sm text-gray-900 dark:text-gray-100 break-all font-mono">
                  {request.url}
                </code>
              </div>
            </div>

            {/* Sensitive Info Alerts */}
            {(sensitiveInfo.hasAuth || sensitiveInfo.hasSessionId || sensitiveInfo.hasApiKey || sensitiveInfo.hasPassword) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {sensitiveInfo.hasAuth && (
                  <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                    <Lock className="w-3 h-3 mr-1" />
                    Auth Token
                  </Badge>
                )}
                {sensitiveInfo.hasSessionId && (
                  <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                    <Key className="w-3 h-3 mr-1" />
                    Session ID
                  </Badge>
                )}
                {sensitiveInfo.hasApiKey && (
                  <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20">
                    <Key className="w-3 h-3 mr-1" />
                    API Key
                  </Badge>
                )}
                {sensitiveInfo.hasPassword && (
                  <Badge className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Password
                  </Badge>
                )}
              </div>
            )}

            {/* Host & Path */}
            {request.host && request.path && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs font-medium text-gray-500">Host</span>
                  <p className="text-gray-900 dark:text-gray-100 font-mono">{request.host}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Path</span>
                  <p className="text-gray-900 dark:text-gray-100 font-mono break-all">{request.path}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Headers Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
          <button
            onClick={() => toggleSection('headers')}
            className="flex-1 flex items-center gap-3 text-left"
          >
            {expandedSections.has('headers') ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
            <span className="font-medium text-gray-900 dark:text-gray-100">Headers</span>
            <Badge variant="outline" className="text-xs">
              {Object.keys(request.headers).length}
            </Badge>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              const headersText = Object.entries(request.headers)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join('\n')
              copyToClipboard(headersText, 'headers')
            }}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-2"
          >
            {copiedSection === 'headers' ? (
              <><Check className="w-3 h-3" /> Copied</>
            ) : (
              <><Copy className="w-3 h-3" /> Copy</>
            )}
          </button>
        </div>

        {expandedSections.has('headers') && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-750 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {Object.entries(request.headers).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-sm font-mono">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold whitespace-nowrap">
                    {key}:
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 break-all">
                    {Array.isArray(value) ? value.join(', ') : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Body Section */}
      {hasBody && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <button
              onClick={() => toggleSection('body')}
              className="flex-1 flex items-center gap-3 text-left"
            >
              {expandedSections.has('body') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <span className="font-medium text-gray-900 dark:text-gray-100">Request Body</span>
              {typeof request.body === 'object' && (
                <Badge variant="outline" className="text-xs">JSON</Badge>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                copyToClipboard(formatBody(request.body), 'body')
              }}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-2"
            >
              {copiedSection === 'body' ? (
                <><Check className="w-3 h-3" /> Copied</>
              ) : (
                <><Copy className="w-3 h-3" /> Copy</>
              )}
            </button>
          </div>

          {expandedSections.has('body') && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-750">
              <div className="bg-gray-900 dark:bg-black px-3 py-2 rounded border border-gray-700 max-h-96 overflow-auto">
                <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                  {formatBody(request.body)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cookies Section */}
      {request.cookies && Object.keys(request.cookies).length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleSection('cookies')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-center gap-3">
              {expandedSections.has('cookies') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <span className="font-medium text-gray-900 dark:text-gray-100">Cookies</span>
              <Badge variant="outline" className="text-xs">
                {Object.keys(request.cookies).length}
              </Badge>
            </div>
          </button>

          {expandedSections.has('cookies') && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-750">
              <div className="space-y-2">
                {Object.entries(request.cookies).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-sm font-mono">
                    <span className="text-orange-600 dark:text-orange-400 font-semibold">
                      {key}:
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 break-all">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Response Section */}
      {response && (
        <div className="bg-white dark:bg-gray-800">
          <button
            onClick={() => toggleSection('response')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-center gap-3">
              {expandedSections.has('response') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <span className="font-medium text-gray-900 dark:text-gray-100">Response</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(response.status)}>
                {response.status} {response.statusText}
              </Badge>
              {response.time && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {response.time}ms
                </Badge>
              )}
            </div>
          </button>

          {expandedSections.has('response') && response.body && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-750">
              <div className="bg-gray-900 dark:bg-black px-3 py-2 rounded border border-gray-700 max-h-96 overflow-auto">
                <pre className="text-sm text-blue-400 font-mono whitespace-pre-wrap">
                  {formatBody(response.body)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Copy Full Request Button */}
      <div className="bg-gray-50 dark:bg-gray-850 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <Button
          size="sm"
          variant="outline"
          onClick={() => copyToClipboard(formatHttpRequest(request), 'full')}
          className="w-full"
        >
          {copiedSection === 'full' ? (
            <><Check className="w-4 h-4 mr-2" /> Copied Full Request</>
          ) : (
            <><Copy className="w-4 h-4 mr-2" /> Copy Full Request</>
          )}
        </Button>
      </div>
    </div>
  )
}
