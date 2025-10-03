import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/chat/analyze-and-act
 * Analyse message user et déclenche auto-actions
 *
 * Body: {
 *   projectId: string
 *   userMessage: string
 *   confidence?: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, userMessage, confidence = 0 } = await req.json()

    if (!projectId || !userMessage) {
      return NextResponse.json(
        { error: 'projectId and userMessage required' },
        { status: 400 }
      )
    }

    // Analyse du message pour détecter succès/échec
    const analysis = await analyzeMessage(userMessage)

    const response: any = {
      analyzed: true,
      context: analysis.context,
      isSuccess: analysis.isSuccess,
      isFailed: analysis.isFailed,
      confidence: analysis.confidence,
      technique: analysis.technique,
      suggestedPath: analysis.suggestedPath,
      action: null
    }

    // Décision auto-storage selon confiance
    if ((analysis.isSuccess || analysis.isFailed) && analysis.confidence >= 0.7) {
      if (analysis.confidence >= 0.9) {
        // AUTO: Haute confiance
        const storeResult = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/board/auto-store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            path: analysis.suggestedPath,
            content: formatContent(userMessage, analysis),
            metadata: {
              technique: analysis.technique,
              context: analysis.context,
              success: analysis.isSuccess,
              confidence: analysis.confidence
            }
          })
        })

        if (storeResult.ok) {
          response.action = 'auto_stored'
          response.message = `Rangé automatiquement dans ${analysis.suggestedPath}`
        }

        // Update learning
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/learning/record`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            technique: analysis.technique,
            context: analysis.context,
            success: analysis.isSuccess,
            metadata: { confidence: analysis.confidence }
          })
        })

      } else {
        // NOTIFICATION: Confiance moyenne (70-90%)
        response.action = 'needs_confirmation'
        response.message = `Ranger dans ${analysis.suggestedPath} ? (${(analysis.confidence * 100).toFixed(0)}% confiance)`
      }
    } else {
      // IGNORE: Confiance trop basse
      response.action = 'ignored'
      response.message = 'Confiance insuffisante pour auto-rangement'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in analyze-and-act:', error)
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    )
  }
}

async function analyzeMessage(message: string) {
  const lower = message.toLowerCase()

  // Détection succès
  const successKeywords = ['ça marche', 'fonctionne', 'accepté', 'bypass', 'exploit', 'vulnérable', 'faille trouvée']
  const failedKeywords = ['bloqué', 'refusé', 'erreur', 'ne marche pas', 'échec', 'failed']

  const isSuccess = successKeywords.some(k => lower.includes(k))
  const isFailed = failedKeywords.some(k => lower.includes(k))

  // Détection technique
  let technique = 'General'
  let context = 'general'
  let suggestedPath = 'Memory/'

  if (lower.includes('prix') || lower.includes('price') || lower.includes('quantit') || lower.includes('discount')) {
    technique = 'Business Logic'
    context = 'business-logic'
    suggestedPath += isSuccess ? 'Success/' : 'Failed/'
    suggestedPath += 'Business Logic/'
  } else if (lower.includes('auth') || lower.includes('login') || lower.includes('password')) {
    technique = 'Authentication'
    context = 'authentication'
    suggestedPath += isSuccess ? 'Success/' : 'Failed/'
    suggestedPath += 'Authentication/'
  } else if (lower.includes('api') || lower.includes('endpoint')) {
    technique = 'API'
    context = 'api'
    suggestedPath += isSuccess ? 'Success/' : 'Failed/'
    suggestedPath += 'API/'
  }

  // Nom du document (extrait du message)
  const docName = message.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'Test'
  suggestedPath += docName

  // Calcul confiance
  let confidence = 0.5
  if (isSuccess || isFailed) {
    confidence = 0.75
    if (successKeywords.filter(k => lower.includes(k)).length >= 2) {
      confidence = 0.95
    }
  }

  return {
    isSuccess,
    isFailed,
    technique,
    context,
    suggestedPath,
    confidence
  }
}

function formatContent(userMessage: string, analysis: any): string {
  return `# ${analysis.technique} - ${analysis.isSuccess ? 'Success ✅' : 'Failed ❌'}

**Date:** ${new Date().toLocaleDateString('fr-FR')}
**Confiance:** ${(analysis.confidence * 100).toFixed(0)}%

## Message utilisateur

${userMessage}

## Contexte détecté

- **Technique:** ${analysis.technique}
- **Context:** ${analysis.context}
- **Résultat:** ${analysis.isSuccess ? 'Succès' : 'Échec'}
`
}
