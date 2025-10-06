'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Play, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { TestResult } from './TestMatrixView'

interface PriorityQueuePanelProps {
  projectId: string
  testResults: TestResult[]
  onTestComplete: () => void
}

interface SuggestedTest {
  endpoint: string
  technique: string
  confidence: number
  reason: string
  payload: string
  priority: 'critical' | 'high' | 'medium' | 'low'
}

export default function PriorityQueuePanel({ projectId, testResults, onTestComplete }: PriorityQueuePanelProps) {
  const [suggestions, setSuggestions] = useState<SuggestedTest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    calculatePriorityQueue()
  }, [testResults, projectId])

  const calculatePriorityQueue = async () => {
    try {
      setLoading(true)

      // Charger les suggestions depuis suggestions_queue (schéma existant)
      const { data: queueSuggestions } = await supabase
        .from('suggestions_queue')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'pending')
        .eq('type', 'pattern') // Filtrer uniquement les suggestions de tests
        .order('confidence', { ascending: false })
        .limit(10)

      if (queueSuggestions && queueSuggestions.length > 0) {
        // Transformer au format SuggestedTest
        const suggested: SuggestedTest[] = queueSuggestions.map((sug: any) => ({
          endpoint: sug.suggestion.endpoint || '',
          technique: sug.suggestion.technique || '',
          confidence: (sug.confidence || 0) * 100, // 0-1 → 0-100
          reason: sug.suggestion.reason || '',
          payload: sug.suggestion.suggested_payload || '',
          priority: sug.suggestion.priority || 'low',
        }))

        setSuggestions(suggested)
        setLoading(false)
        return
      }

      // FALLBACK: Si pas de suggestions en queue, calculer localement (ancien système)
      const { data: patterns } = await supabase
        .from('attack_patterns')
        .select('technique, success_count, usage_count')
        .eq('project_id', projectId)

      const successRates: Record<string, number> = {}
      patterns?.forEach(p => {
        if (p.usage_count > 0) {
          successRates[p.technique] = (p.success_count / p.usage_count) * 100
        }
      })

      const suggested: SuggestedTest[] = []
      const endpoints = [...new Set(testResults.map(t => t.endpoint))]

      endpoints.forEach(endpoint => {
        const techniques = ['SQLi', 'IDOR', 'XSS', 'CSRF', 'Auth', 'BizLogic']

        techniques.forEach(technique => {
          const existing = testResults.find(t => t.endpoint === endpoint && t.technique === technique)

          if (existing && existing.status !== 'not_tested') return

          const successRate = successRates[technique] || 50
          let confidence = successRate

          if (endpoint.includes('/admin') || endpoint.includes('/checkout') || endpoint.includes('/payment')) {
            confidence = Math.min(confidence * 1.2, 100)
          }

          let priority: 'critical' | 'high' | 'medium' | 'low' = 'low'
          if (confidence > 85 || endpoint.includes('/admin')) priority = 'critical'
          else if (confidence > 70 || endpoint.includes('/api')) priority = 'high'
          else if (confidence > 50) priority = 'medium'

          const payload = generatePayload(technique, endpoint)

          suggested.push({
            endpoint,
            technique,
            confidence,
            reason: getReason(technique, successRate, endpoint),
            payload,
            priority
          })
        })
      })

      suggested.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        return b.confidence - a.confidence
      })

      setSuggestions(suggested.slice(0, 10))

    } catch (error: any) {
      console.error('Error calculating priority queue:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePayload = (technique: string, endpoint: string): string => {
    const payloads: Record<string, string> = {
      SQLi: "admin' OR 1=1--",
      IDOR: endpoint.includes('{id}') ? endpoint.replace('{id}', '999999') : `${endpoint}/999999`,
      XSS: '<script>alert(1)</script>',
      CSRF: 'Test without CSRF token',
      Auth: 'Access without authentication',
      BizLogic: 'Test with negative values or extreme inputs'
    }
    return payloads[technique] || 'Test payload'
  }

  const getReason = (technique: string, successRate: number, endpoint: string): string => {
    if (endpoint.includes('/admin')) {
      return `Critical endpoint - ${technique} highly recommended`
    }
    if (successRate > 80) {
      return `${technique} has ${successRate.toFixed(0)}% success rate on this project`
    }
    if (endpoint.includes('/api')) {
      return `API endpoint - ${technique} commonly successful`
    }
    return `${technique} test recommended`
  }

  const copyPayload = (payload: string) => {
    navigator.clipboard.writeText(payload)
    toast.success('Payload copied to clipboard')
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/20 border-red-500 dark:border-red-700'
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/20 border-orange-500 dark:border-orange-700'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-700'
      case 'low':
        return 'bg-blue-100 dark:bg-blue-900/20 border-blue-500 dark:border-blue-700'
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
    }
  }

  return (
    <div className="w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          🤖 AI Priority Queue
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Recommended tests based on success patterns
        </p>
      </div>

      {/* Suggestions list */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Calculating priorities...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No suggestions available
            </p>
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.endpoint}-${suggestion.technique}`}
              className={`
                p-3 rounded-lg border-2 transition-all
                ${getPriorityColor(suggestion.priority)}
              `}
            >
              {/* Priority badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  #{index + 1} {suggestion.priority.toUpperCase()}
                </span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {suggestion.confidence.toFixed(0)}% confidence
                </span>
              </div>

              {/* Test info */}
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {suggestion.technique} on {suggestion.endpoint}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                {suggestion.reason}
              </p>

              {/* Payload */}
              <div className="bg-gray-900 dark:bg-gray-950 rounded p-2 mb-3">
                <p className="text-xs font-mono text-green-400 break-all">
                  {suggestion.payload}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyPayload(suggestion.payload)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Test Now
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
