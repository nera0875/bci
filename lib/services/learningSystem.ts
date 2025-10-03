// Système d'apprentissage automatique pour optimiser le pentesting
// L'IA apprend de vos succès et échecs pour s'améliorer

import { useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface LearningPattern {
  id: string
  project_id: string
  pattern_type: 'success' | 'failure' | 'technique' | 'rule'
  context: string
  pattern_data: {
    technique?: string
    target?: string
    payload?: string
    result?: string
    effectiveness?: number
    confidence?: number
  }
  usage_count: number
  success_rate: number
  last_used: string
  created_at: string
  metadata: Record<string, unknown>
}

export class LearningSystem {
  private projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
  }

  // Enregistrer un succès pour apprentissage
  async recordSuccess(data: {
    technique: string
    context: string
    target?: string
    payload?: string
    impact?: string
  }): Promise<void> {
    try {
      console.log('🎯 Learning: Recording success pattern', data.technique)

      // Chercher un pattern existant
      const { data: existing } = await supabase
        .from('attack_patterns')
        .select('*')
        .eq('project_id', this.projectId)
        .eq('pattern_type', data.technique)
        .maybeSingle()

      let newSuccessRate: number
      if (existing) {
        // Mettre à jour le pattern existant - Calcul taux d'efficacité basé sur historique récent
        const recentSuccesses = (existing.pattern?.recent_successes || []).length
        const totalAttempts = existing.usage_count + 1
        const recentAttempts = Math.min(5, totalAttempts) // Focus sur récents pour adaptabilité
        newSuccessRate = Math.min(
          ((existing.success_rate * existing.usage_count) + 1) / totalAttempts,
          1.0
        )
        // Ajuster avec poids récent si beaucoup d'usages
        if (existing.usage_count > 10) {
          const recentRate = recentSuccesses / Math.min(5, existing.usage_count)
          newSuccessRate = (newSuccessRate * 0.7) + (recentRate * 0.3)
        }

        await supabase
          .from('attack_patterns')
          .update({
            usage_count: existing.usage_count + 1,
            success_rate: newSuccessRate,
            last_success: new Date().toISOString(),
            pattern: {
              ...existing.pattern,
              recent_successes: [
                ...(existing.pattern?.recent_successes || []).slice(-4),
                { ...data, timestamp: new Date().toISOString() }
              ]
            }
          })
          .eq('id', existing.id)

        console.log('🎯 Learning: Updated success pattern', data.technique, 'new rate:', newSuccessRate)
      } else {
        // Créer nouveau pattern
        await supabase
          .from('attack_patterns')
          .insert({
            project_id: this.projectId,
            pattern_type: data.technique,
            pattern: {
              context: data.context,
              technique: data.technique,
              recent_successes: [{ ...data, timestamp: new Date().toISOString() }]
            },
            success_rate: 1.0,
            usage_count: 1,
            last_success: new Date().toISOString()
          })

        newSuccessRate = 1.0
        console.log('🎯 Learning: Created new success pattern', data.technique)
      }

    } catch (error) {
      console.error('Learning error (success):', error)
    }
  }

  // Enregistrer un échec pour apprentissage
  async recordFailure(data: {
    technique: string
    context: string
    target?: string
    payload?: string
    reason?: string
  }): Promise<void> {
    try {
      console.log('❌ Learning: Recording failure pattern', data.technique)

      const { data: existing } = await supabase
        .from('attack_patterns')
        .select('*')
        .eq('project_id', this.projectId)
        .eq('pattern_type', data.technique)
        .maybeSingle()

      let newSuccessRate: number
      if (existing) {
        // Réduire le taux de succès - Calcul avec focus récent
        const recentFailures = (existing.pattern?.recent_failures || []).length
        const totalAttempts = existing.usage_count + 1
        const recentAttempts = Math.min(5, totalAttempts)
        newSuccessRate = Math.max(
          (existing.success_rate * existing.usage_count) / totalAttempts,
          0.0
        )
        // Ajuster avec poids récent
        if (existing.usage_count > 10) {
          const recentRate = 1 - (recentFailures / Math.min(5, existing.usage_count))
          newSuccessRate = (newSuccessRate * 0.7) + (recentRate * 0.3)
        }

        await supabase
          .from('attack_patterns')
          .update({
            usage_count: existing.usage_count + 1,
            success_rate: newSuccessRate,
            pattern: {
              ...existing.pattern,
              recent_failures: [
                ...(existing.pattern?.recent_failures || []).slice(-4),
                { ...data, timestamp: new Date().toISOString() }
              ]
            }
          })
          .eq('id', existing.id)

        console.log('❌ Learning: Updated failure pattern', data.technique, 'new rate:', newSuccessRate)
      } else {
        // Créer pattern avec taux de succès faible
        await supabase
          .from('attack_patterns')
          .insert({
            project_id: this.projectId,
            pattern_type: data.technique,
            pattern: {
              context: data.context,
              technique: data.technique,
              recent_failures: [{ ...data, timestamp: new Date().toISOString() }]
            },
            success_rate: 0.0,
            usage_count: 1
          })

        newSuccessRate = 0.0
        console.log('❌ Learning: Created new failure pattern', data.technique)
      }

    } catch (error) {
      console.error('Learning error (failure):', error)
    }
  }

  // Obtenir les suggestions basées sur l'apprentissage
  async getSuggestions(context: string): Promise<string[]> {
    try {
      console.log('🧠 Learning: Getting suggestions for context', context)

      // Chercher les patterns avec haut taux de succès
      const { data: successPatterns } = await supabase
        .from('attack_patterns')
        .select('*')
        .eq('project_id', this.projectId)
        .gte('success_rate', 0.6)
        .order('success_rate', { ascending: false })
        .limit(5)

      const suggestions: string[] = []

      if (successPatterns) {
        successPatterns.forEach(pattern => {
          const technique = pattern.pattern_type
          const rate = Math.round(pattern.success_rate * 100)
          suggestions.push(`${technique} (${rate}% de réussite)`)
        })
      }

      // Ajouter des suggestions contextuelles
      if (context === 'business-logic') {
        suggestions.push('Tester les prix négatifs', 'Vérifier les conditions de course')
      } else if (context === 'authentication') {
        suggestions.push('Tester l\'IDOR', 'Vérifier les tokens expirés')
      }

      return suggestions
    } catch (error) {
      console.error('Learning error (suggestions):', error)
      return []
    }
  }

  // Obtenir les patterns les plus efficaces
  async getTopPatterns(limit: number = 10): Promise<LearningPattern[]> {
    try {
      const { data } = await supabase
        .from('attack_patterns')
        .select('*')
        .eq('project_id', this.projectId)
        .order('success_rate', { ascending: false })
        .limit(limit)

      return (data || []).map(pattern => ({
        id: pattern.id,
        project_id: pattern.project_id,
        pattern_type: pattern.pattern_type as any,
        context: pattern.pattern?.context || '',
        pattern_data: pattern.pattern || {},
        usage_count: pattern.usage_count || 0,
        success_rate: pattern.success_rate || 0,
        last_used: pattern.last_success || pattern.created_at,
        created_at: pattern.created_at,
        metadata: pattern.mutations || {}
      }))
    } catch (error) {
      console.error('Learning error (top patterns):', error)
      return []
    }
  }

  // Optimiser les règles basé sur l'apprentissage
  async optimizeRules(): Promise<string[]> {
    try {
      console.log('⚡ Learning: Optimizing rules based on patterns')

      const patterns = await this.getTopPatterns(20)
      const optimizations: string[] = []

      // Grouper par contexte
      const contextGroups = patterns.reduce((groups, pattern) => {
        const context = pattern.context || 'general'
        if (!groups[context]) groups[context] = []
        groups[context].push(pattern)
        return groups
      }, {} as Record<string, LearningPattern[]>)

      // Analyser chaque contexte
      Object.entries(contextGroups).forEach(([context, contextPatterns]) => {
        const avgSuccessRate = contextPatterns.reduce((sum, p) => sum + p.success_rate, 0) / contextPatterns.length
        
        if (avgSuccessRate > 0.7) {
          optimizations.push(`${context}: Très efficace (${Math.round(avgSuccessRate * 100)}%)`)
        } else if (avgSuccessRate < 0.3) {
          optimizations.push(`${context}: Peu efficace, revoir la stratégie`)
        }
      })

      return optimizations
    } catch (error) {
      console.error('Learning error (optimize):', error)
      return []
    }
  }

  // Prédire l'efficacité d'une technique
  async predictEffectiveness(technique: string, context: string): Promise<number> {
    try {
      // D'abord chercher pattern direct
      const { data: directPattern } = await supabase
        .from('attack_patterns')
        .select('success_rate, usage_count')
        .eq('project_id', this.projectId)
        .eq('pattern_type', technique)
        .maybeSingle()

      if (directPattern && directPattern.usage_count >= 3) {
        return directPattern.success_rate
      }

      // Valeur par défaut si pas assez de données
      return 0.5
    } catch (error) {
      console.error('Learning error (predict):', error)
      return 0.5
    }
  }

  // Obtenir prédictions pour UI (efficacité futures + alternatives pour échecs)
  async getPredictions(context: string, limit: number = 5): Promise<Array<{
    technique: string
    confidence: number
    alternatives?: string[]
    success_history?: number
  }>> {
    try {
      console.log('🧠 Learning: Generating predictions for context', context)

      // Obtenir top patterns
      const topPatterns = await this.getTopPatterns(limit * 2)
      const predictions: Array<{
        technique: string
        confidence: number
        alternatives?: string[]
        success_history?: number
      }> = []

      topPatterns.forEach(pattern => {
        if (pattern.success_rate > 0.3) { // Seulement prédire pour potentiellement viables
          const pred = {
            technique: pattern.pattern_type,
            confidence: pattern.success_rate,
            success_history: pattern.usage_count
          }

          // Ajouter alternatives si pattern a des échecs récents (suggérer similaires qui marchent)
          if (pattern.pattern_data.recent_failures && pattern.pattern_data.recent_failures.length > 0) {
            // Trouver alternatives: patterns similaires avec haut rate
            const alternatives = topPatterns
              .filter(p => p.context === context && p.pattern_type !== pattern.pattern_type && p.success_rate > 0.7)
              .slice(0, 2)
              .map(p => p.pattern_type)
            if (alternatives.length > 0) {
              pred.alternatives = alternatives
            }
          }

          predictions.push(pred)
        }
      })

      // Trier par confiance descendante
      predictions.sort((a, b) => b.confidence - a.confidence)
      return predictions.slice(0, limit)

    } catch (error) {
      console.error('Learning error (predictions):', error)
      return []
    }
  }

  // Nettoyer les vieux patterns
  async cleanupOldPatterns(daysOld: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      await supabase
        .from('attack_patterns')
        .delete()
        .eq('project_id', this.projectId)
        .lt('created_at', cutoffDate.toISOString())
        .lt('success_rate', 0.1) // Garder seulement les patterns très inefficaces

      console.log('🧹 Learning: Cleaned up old patterns')
    } catch (error) {
      console.error('Learning error (cleanup):', error)
    }
  }

  // Exporter les patterns pour partage
  async exportPatterns(): Promise<string> {
    try {
      const patterns = await this.getTopPatterns(50)
      
      const exportData = {
        version: '1.0',
        project_id: this.projectId,
        exported_at: new Date().toISOString(),
        patterns: patterns.map(p => ({
          technique: p.pattern_type,
          context: p.context,
          success_rate: p.success_rate,
          usage_count: p.usage_count,
          pattern_data: p.pattern_data
        }))
      }

      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error('Learning error (export):', error)
      return ''
    }
  }

  // Importer des patterns depuis un autre projet
  async importPatterns(patternsJson: string): Promise<boolean> {
    try {
      const data = JSON.parse(patternsJson)
      
      if (!data.patterns || !Array.isArray(data.patterns)) {
        return false
      }

      const importPromises = data.patterns.map(async (pattern: any) => {
        await supabase
          .from('attack_patterns')
          .upsert({
            project_id: this.projectId,
            pattern_type: pattern.technique,
            pattern: {
              context: pattern.context,
              technique: pattern.technique,
              imported: true,
              imported_at: new Date().toISOString()
            },
            success_rate: pattern.success_rate,
            usage_count: 1 // Reset usage count for imported patterns
          })
      })

      await Promise.all(importPromises)
      console.log('📥 Learning: Imported', data.patterns.length, 'patterns')
      return true
    } catch (error) {
      console.error('Learning error (import):', error)
      return false
    }
  }
}

// Fonctions utilitaires pour l'apprentissage
export function analyzeSuccessPattern(
  technique: string,
  payload: string,
  result: string
): Record<string, unknown> {
  const pattern: Record<string, unknown> = {
    technique,
    payload_length: payload.length,
    contains_special_chars: /[<>"'&]/.test(payload),
    contains_sql: /select|union|drop|insert|update/i.test(payload),
    contains_js: /script|alert|prompt|confirm/i.test(payload),
    result_type: result.includes('error') ? 'error' : 'success'
  }

  // Analyser le payload pour patterns
  if (payload.includes('admin')) pattern.contains_admin = true
  if (payload.includes('..')) pattern.contains_traversal = true
  if (/\d+/.test(payload)) pattern.contains_numbers = true

  return pattern
}

export function generateNextSteps(
  context: string,
  successPatterns: LearningPattern[],
  failurePatterns: LearningPattern[]
): string[] {
  const steps: string[] = []

  // Analyser les succès pour suggestions
  const highSuccessPatterns = successPatterns.filter(p => p.success_rate > 0.7)
  
  if (highSuccessPatterns.length > 0) {
    steps.push(`Répéter les techniques efficaces: ${highSuccessPatterns.map(p => p.pattern_type).join(', ')}`)
  }

  // Analyser les échecs pour éviter
  const highFailurePatterns = failurePatterns.filter(p => p.success_rate < 0.3)
  
  if (highFailurePatterns.length > 0) {
    steps.push(`Éviter ces techniques: ${highFailurePatterns.map(p => p.pattern_type).join(', ')}`)
  }

  // Suggestions contextuelles
  switch (context) {
    case 'business-logic':
      steps.push('Tester les valeurs extrêmes', 'Vérifier les workflows multi-étapes')
      break
    case 'authentication':
      steps.push('Tester l\'IDOR', 'Vérifier les permissions')
      break
    case 'api-requests':
      steps.push('Fuzzer les paramètres', 'Tester les méthodes HTTP')
      break
  }

  return steps
}

// Hook pour utiliser le système d'apprentissage
export function useLearningSystem(projectId: string) {
  const learningSystem = useMemo(() => new LearningSystem(projectId), [projectId])

  const recordSuccess = useCallback(async (technique: string, context: string, details: any) => {
    await learningSystem.recordSuccess({
      technique,
      context,
      ...details
    })
  }, [learningSystem])

  const recordFailure = useCallback(async (technique: string, context: string, details: any) => {
    await learningSystem.recordFailure({
      technique,
      context,
      ...details
    })
  }, [learningSystem])

  const getSuggestions = useCallback(async (context: string) => {
    return await learningSystem.getSuggestions(context)
  }, [learningSystem])

  const getTopPatterns = useCallback(async () => {
    return await learningSystem.getTopPatterns()
  }, [learningSystem])

  const optimizeRules = useCallback(async () => {
    return await learningSystem.optimizeRules()
  }, [learningSystem])

  const predictEffectiveness = useCallback(async (technique: string, context: string) => {
    return await learningSystem.predictEffectiveness(technique, context)
  }, [learningSystem])

  const getPredictions = useCallback(async (context: string, limit: number = 5) => {
    return await learningSystem.getPredictions(context, limit)
  }, [learningSystem])

  return {
    recordSuccess,
    recordFailure,
    getSuggestions,
    getTopPatterns,
    optimizeRules,
    predictEffectiveness,
    getPredictions,
    learningSystem
  }
}
