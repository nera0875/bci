/**
 * AUTO-REINFORCEMENT ENGINE
 *
 * Moteur d'auto-renforcement qui:
 * 1. Détecte automatiquement succès/échec
 * 2. Range automatiquement dans Board
 * 3. Met à jour learning (success_rate)
 * 4. Suggère prochain test intelligent
 */

import { brainSystem, type BrainAnalysis } from './brainSystem'
import { learningSystem } from './learningSystem'

export interface ReinforcementResult {
  analysis: BrainAnalysis
  stored: boolean
  storagePath?: string
  learningUpdated: boolean
  suggestion?: {
    technique: string
    reason: string
    confidence: number
  }
}

/**
 * Cycle complet d'auto-renforcement
 */
export async function reinforcementCycle(params: {
  projectId: string
  userMessage: string
  conversationHistory?: Array<{ role: string; content: string }>
}): Promise<ReinforcementResult> {

  const { projectId, userMessage } = params

  // 1. ANALYSE avec Brain
  const analysis = await brainSystem.analyzeMessage({
    projectId,
    userMessage,
    conversationHistory: params.conversationHistory || []
  })

  console.log('[AUTO-REINFORCE] Analysis:', {
    context: analysis.detectedContext,
    isSuccess: analysis.isSuccess,
    isFailed: analysis.isFailed,
    technique: analysis.technique,
    confidence: analysis.confidence
  })

  let stored = false
  let storagePath: string | undefined
  let learningUpdated = false

  // 2. AUTO-STORAGE (si succès ou échec détecté avec haute confiance)
  if ((analysis.isSuccess || analysis.isFailed) && analysis.confidence > 0.7) {
    try {
      const response = await fetch('/api/board/auto-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          path: analysis.suggestedPath,
          content: formatStorageContent(userMessage, analysis),
          metadata: {
            context: analysis.detectedContext,
            technique: analysis.technique,
            confidence: analysis.confidence,
            timestamp: new Date().toISOString(),
            success: analysis.isSuccess
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        stored = true
        storagePath = result.path
        console.log('[AUTO-REINFORCE] Stored:', storagePath)
      }
    } catch (error) {
      console.error('[AUTO-REINFORCE] Storage error:', error)
    }
  }

  // 3. LEARNING UPDATE (si technique identifiée)
  if (analysis.technique && analysis.detectedContext) {
    try {
      await learningSystem.recordResult({
        projectId,
        patternType: analysis.technique,
        context: analysis.detectedContext,
        success: analysis.isSuccess
      })
      learningUpdated = true
      console.log('[AUTO-REINFORCE] Learning updated:', analysis.technique)
    } catch (error) {
      console.error('[AUTO-REINFORCE] Learning error:', error)
    }
  }

  // 4. SUGGESTION intelligente (basée sur learning)
  let suggestion: ReinforcementResult['suggestion']

  if (analysis.isSuccess && analysis.technique) {
    // Si succès, suggérer technique similaire avec bon success_rate
    const suggestions = await learningSystem.suggestNextTests(
      projectId,
      analysis.detectedContext,
      analysis.technique
    )

    if (suggestions.length > 0) {
      const best = suggestions[0]
      suggestion = {
        technique: best.pattern_type,
        reason: `Success rate: ${(best.predicted_success * 100).toFixed(0)}% (${best.usage_count} tests)`,
        confidence: best.predicted_success
      }
    }
  } else if (analysis.isFailed && analysis.technique) {
    // Si échec, suggérer technique différente
    const suggestions = await learningSystem.suggestNextTests(
      projectId,
      analysis.detectedContext
    )

    const alternative = suggestions.find(s => s.pattern_type !== analysis.technique)

    if (alternative) {
      suggestion = {
        technique: alternative.pattern_type,
        reason: `Technique alternative (${(alternative.predicted_success * 100).toFixed(0)}% success)`,
        confidence: alternative.predicted_success
      }
    }
  }

  return {
    analysis,
    stored,
    storagePath,
    learningUpdated,
    suggestion
  }
}

/**
 * Formate le contenu pour storage
 */
function formatStorageContent(userMessage: string, analysis: BrainAnalysis): string {
  const timestamp = new Date().toLocaleString('fr-FR')

  return `# ${analysis.technique || 'Test'}

**Status:** ${analysis.isSuccess ? '✅ Succès' : '❌ Échec'}
**Context:** ${analysis.detectedContext}
**Confidence:** ${(analysis.confidence * 100).toFixed(0)}%
**Date:** ${timestamp}

## Message Original

${userMessage}

## Analyse

${analysis.isSuccess
  ? 'Cette technique a fonctionné et représente une vulnérabilité confirmée.'
  : 'Cette tentative a échoué. L\'application est protégée contre cette technique.'}

${analysis.similarPatterns.length > 0 ? `
## Tests Similaires

${analysis.similarPatterns.map((p, i) => `
### ${i + 1}. (${(p.similarity * 100).toFixed(0)}% match)
${p.content}
`).join('\n')}
` : ''}
`
}

export const autoReinforcementEngine = {
  reinforcementCycle
}
