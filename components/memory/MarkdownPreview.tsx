'use client'

import React, { useState } from 'react'
import { X, Maximize2, Minimize2, Copy, Check } from 'lucide-react'
import RichMarkdown from '@/components/chat/RichMarkdown'

interface MarkdownPreviewProps {
  content: string
  title: string
  onClose: () => void
}

export default function MarkdownPreview({ content, title, onClose }: MarkdownPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`fixed bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 flex flex-col ${
        isFullscreen
          ? 'inset-0'
          : 'top-0 right-0 bottom-0 w-[600px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[400px]">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy button */}
          <button
            onClick={copyToClipboard}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Copier le contenu"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={isFullscreen ? "Fenêtre" : "Plein écran"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Fermer"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-red-600" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900">
        <RichMarkdown content={content} />
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span>{content.length} caractères</span>
          <span>{content.split('\n').length} lignes</span>
          <span>{content.split(/\s+/).filter(Boolean).length} mots</span>
        </div>
      </div>
    </div>
  )
}
