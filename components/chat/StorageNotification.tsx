'use client'

import React from 'react'
import { CheckCircle2, XCircle, FolderOpen, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'

interface StorageNotificationProps {
  icon: string
  message: string
  path: string
  documentId?: string
  metadata?: {
    context?: string
    technique?: string
    success?: boolean
  }
  onNavigate?: (documentId: string) => void
}

export const StorageNotification: React.FC<StorageNotificationProps> = ({
  icon,
  message,
  path,
  documentId,
  metadata,
  onNavigate
}) => {
  const isSuccess = metadata?.success !== false

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1]
      }}
      className={`
        flex items-start gap-3 p-4 rounded-lg border-l-4 my-2
        ${isSuccess 
          ? 'bg-green-50 border-green-500 dark:bg-green-950/20' 
          : 'bg-red-50 border-red-500 dark:bg-red-950/20'
        }
      `}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{icon}</span>
          <p className={`text-sm font-medium ${
            isSuccess 
              ? 'text-green-900 dark:text-green-100' 
              : 'text-red-900 dark:text-red-100'
          }`}>
            {message}
          </p>
        </div>

        {/* Path with folder icon */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <FolderOpen className="w-3.5 h-3.5" />
          <code className="bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded font-mono">
            {path}
          </code>
        </div>

        {/* Metadata badges */}
        {metadata && (
          <div className="flex flex-wrap gap-2 mt-2">
            {metadata.context && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {metadata.context}
              </span>
            )}
            {metadata.technique && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                {metadata.technique}
              </span>
            )}
          </div>
        )}

        {/* Navigate button */}
        {documentId && onNavigate && (
          <button
            onClick={() => onNavigate(documentId)}
            className={`
              inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-md text-xs font-medium
              transition-colors
              ${isSuccess
                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
              }
            `}
          >
            <ExternalLink className="w-3 h-3" />
            Voir dans le board
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default StorageNotification