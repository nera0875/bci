'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, AlertCircle, TrendingUp, Database, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

interface ImplicitRule {
  id: string
  pattern_id: string
  name: string
  condition: any
  action: any
  confidence: number
  sample_size: number
  success_rate: number | null
  status: 'suggestion' | 'active' | 'deprecated'
  created_at: string
  validation_count: number
  rejection_count: number
}

interface LearnedPattern {
  id: string
  pattern_type: string
  condition: any
  action: any
  confidence: number
  sample_size: number
  drift_score: number
  created_at: string
}

interface SuggestionsReviewProps {
  projectId: string
  onRulePromoted?: (ruleId: string) => void
  onRuleRejected?: (ruleId: string) => void
}

export default function SuggestionsReview({ projectId, onRulePromoted, onRuleRejected }: SuggestionsReviewProps) {
  const [suggestions, setSuggestions] = useState<ImplicitRule[]>([])
  const [patterns, setPatterns] = useState<LearnedPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'suggestions' | 'patterns'>('suggestions')

  useEffect(() => {
    loadSuggestions()
    loadPatterns()
  }, [projectId])

  const loadSuggestions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('implicit_rules')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'suggestion')
        .order('confidence', { ascending: false })

      if (error) throw error
      setSuggestions(data || [])
    } catch (error) {
      console.error('Error loading suggestions:', error)
      toast.error('Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }

  const loadPatterns = async () => {
    try {
      const { data, error } = await supabase
        .from('learned_patterns')
        .select('*')
        .eq('project_id', projectId)
        .order('confidence', { ascending: false })
        .limit(20)

      if (error) throw error
      setPatterns(data || [])
    } catch (error) {
      console.error('Error loading patterns:', error)
    }
  }

  const handlePromote = async (rule: ImplicitRule) => {
    try {
      const { error } = await supabase
        .from('implicit_rules')
        .update({
          status: 'active',
          promoted_at: new Date().toISOString(),
          validation_count: rule.validation_count + 1
        })
        .eq('id', rule.id)

      if (error) throw error

      toast.success('Rule promoted to active!', { icon: '✅' })
      loadSuggestions()
      onRulePromoted?.(rule.id)
    } catch (error) {
      console.error('Error promoting rule:', error)
      toast.error('Failed to promote rule')
    }
  }

  const handleReject = async (rule: ImplicitRule) => {
    try {
      const { error } = await supabase
        .from('implicit_rules')
        .update({
          status: 'deprecated',
          deprecated_at: new Date().toISOString(),
          rejection_count: rule.rejection_count + 1
        })
        .eq('id', rule.id)

      if (error) throw error

      toast.success('Rule rejected', { icon: '❌' })
      loadSuggestions()
      onRuleRejected?.(rule.id)
    } catch (error) {
      console.error('Error rejecting rule:', error)
      toast.error('Failed to reject rule')
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50'
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-50'
    if (confidence >= 0.4) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    if (confidence >= 0.4) return 'Low'
    return 'Very Low'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Learning Suggestions
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Review and approve rules learned from your behavior
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {suggestions.length} pending
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedTab('suggestions')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              selectedTab === 'suggestions'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Suggestions ({suggestions.length})
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('patterns')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              selectedTab === 'patterns'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Patterns ({patterns.length})
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      {selectedTab === 'suggestions' && (
        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No suggestions yet. Keep using the system to generate insights!</p>
            </div>
          ) : (
            suggestions.map(rule => (
              <div
                key={rule.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {rule.name}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(rule.confidence)}`}>
                        {getConfidenceBadge(rule.confidence)} ({Math.round(rule.confidence * 100)}%)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Condition</p>
                        <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                          {JSON.stringify(rule.condition, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Action</p>
                        <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                          {JSON.stringify(rule.action, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Sample size: {rule.sample_size}</span>
                      </div>
                      {rule.success_rate !== null && (
                        <div className="flex items-center gap-1">
                          <span>Success rate: {Math.round(rule.success_rate * 100)}%</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span>Created: {new Date(rule.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handlePromote(rule)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2 text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Promote
                    </button>
                    <button
                      onClick={() => handleReject(rule)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2 text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedTab === 'patterns' && (
        <div className="space-y-4">
          {patterns.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No patterns detected yet. Make more decisions to generate patterns!</p>
            </div>
          ) : (
            patterns.map(pattern => (
              <div
                key={pattern.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {pattern.pattern_type}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(pattern.confidence)}`}>
                        {Math.round(pattern.confidence * 100)}%
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        Drift: {Math.round(pattern.drift_score * 100)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Condition</p>
                        <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                          {JSON.stringify(pattern.condition, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Action</p>
                        <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                          {JSON.stringify(pattern.action, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Sample size: {pattern.sample_size}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Created: {new Date(pattern.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
