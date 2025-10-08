'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Edit2, FolderPlus, Lightbulb, AlertCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface StorageSuggestion {
  type: 'storage'
  confidence: number
  suggestedPath: string
  suggestedName: string
  context: string
  technique?: string
  icon: string
  content: string
  metadata: any
}

export interface RuleSuggestion {
  type: 'rule'
  confidence: number
  pattern: string
  suggestedName: string
  trigger: string
  action: string
  priority: number
  occurrences: number
}

export interface ImprovementSuggestion {
  type: 'improvement'
  ruleId: string
  ruleName: string
  currentAction: string
  suggestedAction: string
  improvements: string[]
  frequency: number
}

type Suggestion = StorageSuggestion | RuleSuggestion | ImprovementSuggestion

interface AutoSuggestionProps {
  suggestion: Suggestion
  onAccept: (suggestion: Suggestion) => void
  onModify: (suggestion: Suggestion) => void
  onReject: (suggestion: Suggestion) => void
}

export default function AutoSuggestion({
  suggestion,
  onAccept,
  onModify,
  onReject
}: AutoSuggestionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 dark:text-green-400'
    if (confidence >= 0.7) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-orange-600 dark:text-orange-400'
  }

  const renderStorageSuggestion = (s: StorageSuggestion) => (
    <>
      <div className="flex items-start gap-3">
        <div className="text-2xl">{s.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <FolderPlus size={16} className="text-blue-600" />
            <span className="font-medium">Storage Suggestion</span>
            <span className={cn("text-sm", getConfidenceColor(s.confidence))}>
              {Math.round(s.confidence * 100)}% confidence
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            I suggest storing this in:
          </p>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                {s.suggestedPath}
              </span>
              <ChevronRight size={14} className="text-gray-400" />
              <span className="font-medium">{s.suggestedName}</span>
            </div>

            {s.technique && (
              <div className="mt-2 text-xs text-gray-500">
                Technique: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{s.technique}</code>
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
              <div className="text-sm font-mono whitespace-pre-wrap line-clamp-3">
                {s.content}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )

  const renderRuleSuggestion = (s: RuleSuggestion) => (
    <>
      <div className="flex items-start gap-3">
        <Lightbulb size={20} className="text-gray-700 dark:text-gray-400 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">Rule Suggestion</span>
            <span className="text-sm text-gray-700 dark:text-gray-400">
              Pattern detected ({s.occurrences} times)
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            I've noticed a recurring pattern. Create this rule?
          </p>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Name:</span>
                <span className="text-sm font-medium">{s.suggestedName}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Trigger:</span>
                <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">{s.trigger}</code>
              </div>

              {isExpanded && (
                <>
                  <div className="pt-2 border-t border-gray-300 dark:border-gray-700">
                    <span className="text-xs font-medium text-gray-500">Action:</span>
                    <div className="mt-1 text-sm bg-white dark:bg-gray-900 rounded p-2">
                      {s.action}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Priority:</span>
                    <span className="text-sm">{s.priority}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )

  const renderImprovementSuggestion = (s: ImprovementSuggestion) => (
    <>
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="text-amber-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">Rule Improvement</span>
            <span className="text-sm text-amber-600 dark:text-amber-400">
              Based on {s.frequency} uses
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Your rule "{s.ruleName}" could be enhanced:
          </p>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-gray-500">Current:</span>
                <div className="mt-1 text-sm bg-white dark:bg-gray-900 rounded p-2 line-clamp-2">
                  {s.currentAction}
                </div>
              </div>

              {isExpanded && (
                <>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Suggested:</span>
                    <div className="mt-1 text-sm bg-green-50 dark:bg-green-900/20 rounded p-2">
                      {s.suggestedAction}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-gray-500">Improvements:</span>
                    <ul className="mt-1 text-sm space-y-1">
                      {s.improvements.map((imp, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="text-green-600">+</span>
                          {imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )

  const renderSuggestionContent = () => {
    switch (suggestion.type) {
      case 'storage':
        return renderStorageSuggestion(suggestion as StorageSuggestion)
      case 'rule':
        return renderRuleSuggestion(suggestion as RuleSuggestion)
      case 'improvement':
        return renderImprovementSuggestion(suggestion as ImprovementSuggestion)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-white dark:bg-gray-900 rounded-lg border shadow-sm p-4 mb-4"
      >
        {renderSuggestionContent()}

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(suggestion)}
              className="flex items-center gap-1"
            >
              <X size={14} />
              Ignore
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onModify(suggestion)}
              className="flex items-center gap-1"
            >
              <Edit2 size={14} />
              Modify
            </Button>

            <Button
              size="sm"
              onClick={() => onAccept(suggestion)}
              className="flex items-center gap-1"
            >
              <Check size={14} />
              Accept
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}