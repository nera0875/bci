// Analyseur d'intention contextuelle pour comprendre quand l'utilisateur veut mémoriser
// Sans utiliser de mots-clés rigides, mais en comprenant le contexte

export interface MemoryIntent {
  shouldMemorize: boolean
  confidence: number // 0 to 1
  suggestedAction?: {
    operation: 'create' | 'update' | 'append'
    folderHint?: string
    documentHint?: string
  }
}

export class ContextualIntentAnalyzer {
  private conversationContext: string[] = []
  private lastTopics: string[] = []

  // Analyse le contexte de la conversation pour déterminer l'intention
  analyzeIntent(userMessage: string, claudeResponse: string): MemoryIntent {
    const lowerMessage = userMessage.toLowerCase()
    const lowerResponse = claudeResponse.toLowerCase()

    // Si c'est un salut ou une conversation banale, pas de mémorisation
    if (this.isCasualGreeting(lowerMessage)) {
      return { shouldMemorize: false, confidence: 0 }
    }

    // Analyse contextuelle basée sur des patterns de conversation
    const contextIndicators = this.analyzeConversationFlow(userMessage, claudeResponse)

    // Si Claude a donné une explication longue et structurée
    if (this.isStructuredKnowledge(claudeResponse)) {
      contextIndicators.knowledgeShared = true
    }

    // Détecte si l'utilisateur confirme qu'il veut garder quelque chose
    if (this.detectsAgreementToSave(userMessage, this.conversationContext)) {
      return {
        shouldMemorize: true,
        confidence: 0.9,
        suggestedAction: this.suggestAction(claudeResponse)
      }
    }

    // Calcule la confiance basée sur plusieurs indicateurs
    const confidence = this.calculateConfidence(contextIndicators)

    return {
      shouldMemorize: confidence > 0.7,
      confidence,
      suggestedAction: confidence > 0.7 ? this.suggestAction(claudeResponse) : undefined
    }
  }

  // Ajoute un message au contexte de conversation
  addToContext(message: string) {
    this.conversationContext.push(message)
    // Garde seulement les 10 derniers messages pour le contexte
    if (this.conversationContext.length > 10) {
      this.conversationContext.shift()
    }
  }

  private isCasualGreeting(message: string): boolean {
    const greetings = ['salut', 'bonjour', 'yo', 'hey', 'coucou', 'hello', 'hi']
    const casualPhrases = ['comment ça va', 'ça va', 'quoi de neuf', 'comment vas-tu']

    // Si le message fait moins de 20 caractères et contient un salut
    if (message.length < 20) {
      return greetings.some(g => message.includes(g)) ||
             casualPhrases.some(p => message.includes(p))
    }

    return false
  }

  private analyzeConversationFlow(userMessage: string, claudeResponse: string): any {
    const indicators = {
      userAskedForExplanation: false,
      knowledgeShared: false,
      problemSolved: false,
      userExpressedSatisfaction: false,
      topicIsImportant: false
    }

    // Patterns qui indiquent que l'utilisateur cherche une explication
    const explanationPatterns = [
      'comment', 'pourquoi', 'explique', 'comprendre', 'savoir',
      'c\'est quoi', 'qu\'est-ce', 'peux-tu', 'montre-moi'
    ]

    // Patterns de satisfaction ou de conclusion
    const satisfactionPatterns = [
      'parfait', 'super', 'génial', 'merci', 'cool', 'ok c\'est bon',
      'j\'ai compris', 'c\'est clair', 'nickel', 'très bien'
    ]

    // Patterns qui suggèrent l'importance
    const importancePatterns = [
      'important', 'faut pas oublier', 'à retenir', 'essentiel',
      'crucial', 'critique', 'bug', 'problème', 'solution'
    ]

    const lower = userMessage.toLowerCase()

    indicators.userAskedForExplanation = explanationPatterns.some(p => lower.includes(p))
    indicators.userExpressedSatisfaction = satisfactionPatterns.some(p => lower.includes(p))
    indicators.topicIsImportant = importancePatterns.some(p => lower.includes(p))

    // Si Claude a donné du code ou une solution
    if (claudeResponse.includes('```') || claudeResponse.includes('function') ||
        claudeResponse.includes('export') || claudeResponse.includes('const')) {
      indicators.knowledgeShared = true
      indicators.problemSolved = true
    }

    return indicators
  }

  private isStructuredKnowledge(response: string): boolean {
    // Vérifie si la réponse contient une connaissance structurée
    const hasCode = response.includes('```')
    const hasSteps = /\d+\./.test(response) || /^- /m.test(response)
    const hasHeaders = /^#+\s/m.test(response)
    const isLong = response.length > 500

    return (hasCode || hasSteps || hasHeaders) && isLong
  }

  private detectsAgreementToSave(message: string, context: string[]): boolean {
    const lower = message.toLowerCase()

    // Patterns naturels qui indiquent l'accord pour sauvegarder
    const agreementPatterns = [
      'c\'est ça', 'exactement', 'oui garde', 'garde ça', 'sauvegarde',
      'met ça de côté', 'on garde', 'faut garder', 'mémorise',
      'pour plus tard', 'pour la prochaine fois', 'n\'oublie pas'
    ]

    // Si un pattern d'accord est trouvé
    if (agreementPatterns.some(p => lower.includes(p))) {
      return true
    }

    // Analyse le contexte précédent
    if (context.length > 0) {
      const lastMessage = context[context.length - 1].toLowerCase()

      // Si Claude a proposé quelque chose et l'utilisateur répond positivement
      if (lastMessage.includes('veux-tu') || lastMessage.includes('souhaites-tu')) {
        const positiveResponses = ['oui', 'ok', 'vas-y', 'd\'accord', 'parfait', 'yes']
        return positiveResponses.some(r => lower.startsWith(r))
      }
    }

    return false
  }

  private calculateConfidence(indicators: any): number {
    let confidence = 0

    if (indicators.userAskedForExplanation) confidence += 0.2
    if (indicators.knowledgeShared) confidence += 0.3
    if (indicators.problemSolved) confidence += 0.2
    if (indicators.userExpressedSatisfaction) confidence += 0.2
    if (indicators.topicIsImportant) confidence += 0.3

    // Ajuste la confiance si plusieurs indicateurs sont présents
    const activeIndicators = Object.values(indicators).filter(v => v === true).length
    if (activeIndicators >= 3) {
      confidence = Math.min(confidence * 1.2, 1)
    }

    return Math.min(confidence, 1)
  }

  private suggestAction(response: string): any {
    // Analyse la réponse pour suggérer le type d'action
    const hasCode = response.includes('```')
    const hasBug = response.toLowerCase().includes('bug') || response.toLowerCase().includes('fix')
    const hasDoc = response.toLowerCase().includes('documentation') || response.toLowerCase().includes('guide')

    let folderHint = 'general'
    if (hasCode && hasBug) folderHint = 'bugs'
    else if (hasCode) folderHint = 'code'
    else if (hasDoc) folderHint = 'docs'

    return {
      operation: 'create' as const,
      folderHint,
      documentHint: this.generateDocumentName(response)
    }
  }

  private generateDocumentName(response: string): string {
    // Extrait les mots-clés principaux pour générer un nom
    const lines = response.split('\n').filter(l => l.trim())
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/[#*`]/g, '').trim()
      return firstLine.substring(0, 50) // Max 50 caractères
    }
    return 'Note ' + new Date().toLocaleDateString()
  }
}

export const intentAnalyzer = new ContextualIntentAnalyzer()