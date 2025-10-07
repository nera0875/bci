'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Target, TrendingUp } from 'lucide-react'

interface LearnedPattern {
  id: string
  project_id: string
  pattern_data: any
  confidence: number
  evidence_count: number
  context: string
  created_at: string
}

interface AttackPattern {
  id: string
  project_id: string
  technique: string
  success_rate: number
  total_attempts: number
  context: string
  metadata: any
  created_at: string
}

interface PatternsPanelProps {
  projectId: string
}

export default function PatternsPanel({ projectId }: PatternsPanelProps) {
  const [learnedPatterns, setLearnedPatterns] = useState<LearnedPattern[]>([])
  const [attackPatterns, setAttackPatterns] = useState<AttackPattern[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPatterns()
  }, [projectId])

  const loadPatterns = async () => {
    try {
      setLoading(true)

      // Load learned patterns
      const { data: learned, error: learnedError } = await supabase
        .from('learned_patterns')
        .select('*')
        .eq('project_id', projectId)
        .order('confidence', { ascending: false })
        .limit(20)

      if (learnedError) throw learnedError

      // Load attack patterns
      const { data: attack, error: attackError } = await supabase
        .from('attack_patterns')
        .select('*')
        .eq('project_id', projectId)
        .order('success_rate', { ascending: false })
        .limit(20)

      if (attackError) throw attackError

      setLearnedPatterns(learned || [])
      setAttackPatterns(attack || [])
    } catch (error) {
      console.error('Error loading patterns:', error)
      toast.error('Erreur chargement patterns')
    } finally {
      setLoading(false)
    }
  }

  const createRuleFromLearnedPattern = async (pattern: LearnedPattern) => {
    try {
      const triggerData = pattern.pattern_data.trigger || pattern.context
      const actionData = pattern.pattern_data.action || `Apply pattern: ${JSON.stringify(pattern.pattern_data).substring(0, 100)}`

      const { error } = await supabase
        .from('rules')
        .insert({
          project_id: projectId,
          name: `Auto: Pattern ${pattern.context}`,
          trigger: triggerData,
          action: actionData,
          enabled: false,
          metadata: {
            auto_generated: true,
            pattern_id: pattern.id,
            confidence: pattern.confidence,
            evidence_count: pattern.evidence_count
          }
        })

      if (error) throw error

      toast.success('⚙️ Règle créée depuis le pattern! Active-la dans Rules tab.')

      // Dispatch event to reload rules
      window.dispatchEvent(new CustomEvent('board-reload', {
        detail: { projectId, section: 'rules' }
      }))
    } catch (error) {
      console.error('Error creating rule:', error)
      toast.error('Erreur création règle')
    }
  }

  const createRuleFromAttackPattern = async (pattern: AttackPattern) => {
    try {
      const { error } = await supabase
        .from('rules')
        .insert({
          project_id: projectId,
          name: `Auto: ${pattern.technique}`,
          trigger: pattern.context,
          action: `Always apply ${pattern.technique}. Success rate: ${Math.round(pattern.success_rate * 100)}% (${pattern.total_attempts} attempts)`,
          enabled: false,
          metadata: {
            auto_generated: true,
            attack_pattern_id: pattern.id,
            success_rate: pattern.success_rate,
            total_attempts: pattern.total_attempts
          }
        })

      if (error) throw error

      toast.success('⚙️ Règle créée depuis la technique! Active-la dans Rules tab.')

      // Dispatch event to reload rules
      window.dispatchEvent(new CustomEvent('board-reload', {
        detail: { projectId, section: 'rules' }
      }))
    } catch (error) {
      console.error('Error creating rule:', error)
      toast.error('Erreur création règle')
    }
  }

  const getConfidenceBadge = (confidence: number) => {
    const percentage = Math.round(confidence * 100)
    let colorClass = ''

    if (percentage >= 80) {
      colorClass = 'bg-green-100 text-green-800 border-green-200'
    } else if (percentage >= 60) {
      colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200'
    } else {
      colorClass = 'bg-orange-100 text-orange-800 border-orange-200'
    }

    return (
      <span className={`text-xs px-2 py-0.5 rounded border ${colorClass}`}>
        {percentage}% confiance
      </span>
    )
  }

  const getSuccessRateBadge = (rate: number) => {
    const percentage = Math.round(rate * 100)
    let colorClass = ''

    if (percentage >= 70) {
      colorClass = 'bg-green-100 text-green-800 border-green-200'
    } else if (percentage >= 50) {
      colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200'
    } else {
      colorClass = 'bg-red-100 text-red-800 border-red-200'
    }

    return (
      <span className={`text-xs px-2 py-0.5 rounded border ${colorClass}`}>
        {percentage}% succès
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Learned Patterns Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            🎯 Patterns Détectés
            <span className="text-sm font-normal text-gray-500">
              ({learnedPatterns.length})
            </span>
          </h3>

          {learnedPatterns.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                Aucun pattern détecté pour le moment
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Les patterns seront détectés automatiquement depuis vos décisions
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {learnedPatterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🎯</span>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {pattern.context}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getConfidenceBadge(pattern.confidence)}
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-200">
                          {pattern.evidence_count} preuves
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs">
                    <pre className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
                      {pattern.pattern_data
                        ? JSON.stringify(pattern.pattern_data, null, 2).substring(0, 150) + '...'
                        : 'No pattern data available'}
                    </pre>
                  </div>

                  {pattern.confidence >= 0.7 && (
                    <Button
                      size="sm"
                      onClick={() => createRuleFromLearnedPattern(pattern)}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Target size={16} />
                      Créer Règle
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attack Patterns Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            ⚡ Techniques d'Attaque
            <span className="text-sm font-normal text-gray-500">
              ({attackPatterns.length})
            </span>
          </h3>

          {attackPatterns.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                Aucune technique enregistrée pour le moment
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Les techniques seront trackées automatiquement depuis vos tests
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attackPatterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">⚡</span>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {pattern.technique}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getSuccessRateBadge(pattern.success_rate)}
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200">
                          {pattern.total_attempts} tentatives
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Contexte:</span> {pattern.context}
                    </p>
                  </div>

                  {pattern.success_rate >= 0.7 && (
                    <Button
                      size="sm"
                      onClick={() => createRuleFromAttackPattern(pattern)}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <TrendingUp size={16} />
                      Créer Règle ({Math.round(pattern.success_rate * 100)}% succès)
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
