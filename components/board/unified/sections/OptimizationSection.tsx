'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles, Check, X, Edit, Clock, TrendingUp,
  AlertCircle, Zap, Brain, Target, Shield,
  ChevronRight, Filter, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface Suggestion {
  id: string
  type: 'storage' | 'rule' | 'improvement' | 'pattern'
  status: 'pending' | 'accepted' | 'rejected' | 'modified'
  confidence: number
  suggestion: {
    title: string
    description: string
    category?: string
    impact?: 'high' | 'medium' | 'low'
    data?: any
  }
  metadata?: {
    source?: string
    timestamp?: string
    related?: string[]
  }
  created_at: string
  processed_at?: string
}

interface Prediction {
  id: string
  vulnerability_type: string
  probability: number
  endpoint: string
  tested: boolean
  successful?: boolean
  feedback?: string
}

interface OptimizationSectionProps {
  projectId: string
  onSuggestionProcessed?: () => void
}

const TYPE_ICONS = {
  storage: Brain,
  rule: Target,
  improvement: TrendingUp,
  pattern: Sparkles
}

const TYPE_COLORS = {
  storage: 'text-blue-600 bg-blue-50',
  rule: 'text-purple-600 bg-purple-50',
  improvement: 'text-green-600 bg-green-50',
  pattern: 'text-amber-600 bg-amber-50'
}

const IMPACT_INDICATORS = {
  high: { color: 'text-red-600', label: 'High Impact' },
  medium: { color: 'text-orange-600', label: 'Medium Impact' },
  low: { color: 'text-gray-600', label: 'Low Impact' }
}

export default function OptimizationSection({
  projectId,
  onSuggestionProcessed
}: OptimizationSectionProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [history, setHistory] = useState<Suggestion[]>([])
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'predictions'>('pending')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null)
  const [modifyMode, setModifyMode] = useState(false)
  const [modifiedContent, setModifiedContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoAcceptThreshold, setAutoAcceptThreshold] = useState(0.95)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [showPredictionValidation, setShowPredictionValidation] = useState(false)

  useEffect(() => {
    loadSuggestions()
    loadPredictions()
    const interval = setInterval(() => {
      loadSuggestions()
      loadPredictions()
    }, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [projectId])

  const loadSuggestions = async () => {
    try {
      const response = await fetch(`/api/optimization/suggestions?projectId=${projectId}`)
      if (!response.ok) {
        console.warn('Failed to load suggestions:', response.status)
        return
      }

      const data = await response.json()

      // Ensure data is an array
      const suggestions = Array.isArray(data) ? data : []

      const pending = suggestions.filter((s: Suggestion) => s.status === 'pending')
      const processed = suggestions.filter((s: Suggestion) => s.status !== 'pending')

      setSuggestions(pending)
      setHistory(processed)

      // Auto-accept high confidence suggestions
      pending.forEach((suggestion: Suggestion) => {
        if (suggestion.confidence >= autoAcceptThreshold) {
          handleAutoAccept(suggestion)
        }
      })
    } catch (error) {
      console.error('Error loading suggestions:', error)
    }
  }

  const loadPredictions = async () => {
    try {
      // Mock predictions - replace with actual API call
      const mockPredictions: Prediction[] = [
        {
          id: '1',
          vulnerability_type: 'IDOR',
          probability: 0.85,
          endpoint: '/api/users/123',
          tested: false
        },
        {
          id: '2',
          vulnerability_type: 'SQL Injection',
          probability: 0.75,
          endpoint: '/api/search?query=',
          tested: false
        },
        {
          id: '3',
          vulnerability_type: 'Price Manipulation',
          probability: 0.90,
          endpoint: '/api/checkout',
          tested: true,
          successful: true,
          feedback: 'Confirmed - negative quantity accepted'
        }
      ]
      setPredictions(mockPredictions)
    } catch (error) {
      console.error('Error loading predictions:', error)
    }
  }

  const handlePredictionValidation = async (
    predictionId: string,
    success: boolean,
    feedback: string
  ) => {
    setPredictions(prev => prev.map(p =>
      p.id === predictionId
        ? { ...p, tested: true, successful: success, feedback }
        : p
    ))

    // Store result in learning system
    toast.success(
      success
        ? 'Vulnerability confirmed! System learning improved.'
        : 'False positive noted. System learning adjusted.'
    )
  }

  const handleAutoAccept = async (suggestion: Suggestion) => {
    toast.info(`Auto-accepting high confidence suggestion: ${suggestion.suggestion.title}`)
    await processSuggestion(suggestion.id, 'accepted')
  }

  const processSuggestion = async (
    id: string,
    action: 'accepted' | 'rejected' | 'modified',
    modifiedData?: any
  ) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/optimization/suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          modifiedData,
          processed_at: new Date().toISOString()
        })
      })

      if (response.ok) {
        await loadSuggestions()
        onSuggestionProcessed?.()

        const actionLabel = action === 'accepted' ? 'Accepted' :
                           action === 'rejected' ? 'Rejected' : 'Modified'
        toast.success(`${actionLabel} suggestion successfully`)

        setSelectedSuggestion(null)
        setModifyMode(false)
      }
    } catch (error) {
      console.error('Error processing suggestion:', error)
      toast.error('Failed to process suggestion')
    }
    setLoading(false)
  }

  const SuggestionCard = ({ suggestion }: { suggestion: Suggestion }) => {
    const Icon = TYPE_ICONS[suggestion.type]
    const confidence = Math.round(suggestion.confidence * 100)
    const impact = suggestion.suggestion.impact || 'medium'

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "p-4 bg-white dark:bg-gray-800 rounded-lg border hover:shadow-md transition-all cursor-pointer",
          selectedSuggestion?.id === suggestion.id && "ring-2 ring-blue-500"
        )}
        onClick={() => setSelectedSuggestion(suggestion)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", TYPE_COLORS[suggestion.type])}>
              <Icon size={16} />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                {suggestion.suggestion.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {suggestion.type}
                </span>
                <span className={cn("text-xs", IMPACT_INDICATORS[impact].color)}>
                  {IMPACT_INDICATORS[impact].label}
                </span>
              </div>
            </div>
          </div>

          {/* Confidence Indicator */}
          <div className="flex flex-col items-end">
            <div className={cn(
              "text-sm font-medium",
              confidence >= 90 ? "text-green-600" :
              confidence >= 70 ? "text-amber-600" :
              "text-gray-600"
            )}>
              {confidence}%
            </div>
            <div className="text-xs text-gray-500">confidence</div>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {suggestion.suggestion.description}
        </p>

        {selectedSuggestion?.id === suggestion.id && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            {!modifyMode ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation()
                    processSuggestion(suggestion.id, 'accepted')
                  }}
                  disabled={loading}
                >
                  <Check size={14} className="mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setModifyMode(true)
                    setModifiedContent(JSON.stringify(suggestion.suggestion.data, null, 2))
                  }}
                  disabled={loading}
                >
                  <Edit size={14} className="mr-1" />
                  Modify
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    processSuggestion(suggestion.id, 'rejected')
                  }}
                  disabled={loading}
                >
                  <X size={14} className="mr-1" />
                  Reject
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={modifiedContent}
                  onChange={(e) => setModifiedContent(e.target.value)}
                  className="w-full p-2 border rounded-lg font-mono text-xs"
                  rows={6}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(modifiedContent)
                        processSuggestion(suggestion.id, 'modified', parsed)
                      } catch {
                        toast.error('Invalid JSON format')
                      }
                    }}
                    disabled={loading}
                  >
                    Save Changes
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setModifyMode(false)
                      setModifiedContent('')
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    )
  }

  const filteredSuggestions = suggestions.filter(s =>
    filterType === 'all' || s.type === filterType
  )

  const filteredHistory = history.filter(s =>
    filterType === 'all' || s.type === filterType
  )

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="text-amber-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                AI Optimization Center
              </h2>
              <p className="text-sm text-gray-500">
                Auto-reinforcement suggestions based on usage patterns
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadSuggestions}
            disabled={loading}
          >
            <RefreshCw size={14} className={cn("mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {suggestions.length}
            </div>
            <div className="text-xs text-blue-600/70">Pending</div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {history.filter(h => h.status === 'accepted').length}
            </div>
            <div className="text-xs text-green-600/70">Accepted</div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">
              {history.filter(h => h.status === 'modified').length}
            </div>
            <div className="text-xs text-amber-600/70">Modified</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {history.filter(h => h.status === 'rejected').length}
            </div>
            <div className="text-xs text-gray-600/70 dark:text-gray-400/70">Rejected</div>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button
              variant={activeTab === 'pending' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('pending')}
            >
              Pending ({suggestions.length})
            </Button>
            <Button
              variant={activeTab === 'history' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('history')}
            >
              History ({history.length})
            </Button>
            <Button
              variant={activeTab === 'predictions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('predictions')}
              className="relative"
            >
              Predictions ({predictions.filter(p => !p.tested).length})
              {predictions.filter(p => !p.tested).length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border rounded-lg px-2 py-1"
            >
              <option value="all">All Types</option>
              <option value="storage">Storage</option>
              <option value="rule">Rules</option>
              <option value="improvement">Improvements</option>
              <option value="pattern">Patterns</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'pending' ? (
            <motion.div
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map(suggestion => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Sparkles size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No pending suggestions</p>
                  <p className="text-sm mt-2">AI is analyzing your usage patterns...</p>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'history' ? (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {filteredHistory.length > 0 ? (
                filteredHistory.map(suggestion => (
                  <div
                    key={suggestion.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      suggestion.status === 'accepted' && "bg-green-50 dark:bg-green-950/30 border-green-200",
                      suggestion.status === 'rejected' && "bg-gray-50 dark:bg-gray-900 border-gray-200",
                      suggestion.status === 'modified' && "bg-amber-50 dark:bg-amber-950/30 border-amber-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{suggestion.suggestion.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {suggestion.suggestion.description}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {suggestion.status === 'accepted' && <Check className="text-green-600" size={20} />}
                        {suggestion.status === 'rejected' && <X className="text-gray-600" size={20} />}
                        {suggestion.status === 'modified' && <Edit className="text-amber-600" size={20} />}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Clock size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No processed suggestions yet</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="predictions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                  Vulnerability Prediction Queue
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Test these predictions and validate them to improve the AI's accuracy.
                  Current learning accuracy: ~{Math.round(predictions.filter(p => p.tested && p.successful).length / Math.max(predictions.filter(p => p.tested).length, 1) * 100)}%
                </p>
              </div>

              {predictions.length > 0 ? (
                <div className="grid gap-4">
                  {predictions.map(prediction => (
                    <div
                      key={prediction.id}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        prediction.tested
                          ? prediction.successful
                            ? "bg-green-50 dark:bg-green-950/30 border-green-300"
                            : "bg-red-50 dark:bg-red-950/30 border-red-300"
                          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className={cn(
                              "size-5",
                              prediction.probability > 0.8 ? "text-red-600" :
                              prediction.probability > 0.6 ? "text-orange-600" :
                              "text-yellow-600"
                            )} />
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {prediction.vulnerability_type}
                            </h4>
                            <span className={cn(
                              "px-2 py-0.5 text-xs rounded-full",
                              prediction.probability > 0.8
                                ? "bg-red-100 text-red-700"
                                : prediction.probability > 0.6
                                ? "bg-orange-100 text-orange-700"
                                : "bg-yellow-100 text-yellow-700"
                            )}>
                              {(prediction.probability * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Endpoint: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                              {prediction.endpoint}
                            </code>
                          </p>
                          {prediction.feedback && (
                            <p className="text-sm mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              Feedback: {prediction.feedback}
                            </p>
                          )}
                        </div>

                        {!prediction.tested && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                const feedback = prompt('Vulnerability confirmed! Describe what happened:')
                                if (feedback) {
                                  handlePredictionValidation(prediction.id, true, feedback)
                                }
                              }}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check size={14} className="mr-1" />
                              Confirmed
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const feedback = prompt('False positive. What did you find instead?')
                                if (feedback) {
                                  handlePredictionValidation(prediction.id, false, feedback)
                                }
                              }}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <X size={14} className="mr-1" />
                              False Positive
                            </Button>
                          </div>
                        )}

                        {prediction.tested && (
                          <div className={cn(
                            "px-3 py-1 rounded-full text-sm font-medium",
                            prediction.successful
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          )}>
                            {prediction.successful ? "Confirmed" : "False Positive"}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Target size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No predictions yet</p>
                  <p className="text-sm mt-2">Paste HTTP requests in the chat to get predictions</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Auto-Accept Threshold */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Auto-accept threshold: {Math.round(autoAcceptThreshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="70"
            max="100"
            value={autoAcceptThreshold * 100}
            onChange={(e) => setAutoAcceptThreshold(Number(e.target.value) / 100)}
            className="w-32"
          />
        </div>
      </div>
    </div>
  )
}