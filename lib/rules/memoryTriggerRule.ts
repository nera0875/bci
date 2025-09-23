// Règle pour contrôler quand Claude peut déclencher des actions mémoire

export interface MemoryTriggerRule {
  shouldTriggerMemory: (message: string) => boolean
}

// Mots-clés qui indiquent explicitement une demande de mémorisation
const EXPLICIT_MEMORY_KEYWORDS = [
  'ajoute dans la mémoire',
  'enregistre ça',
  'note ça',
  'sauvegarde ça',
  'mémorise',
  'garde en mémoire',
  'ajoute dans bivon',
  'ajoute ça dans',
  'créer un document',
  'créer un dossier',
  'stock ça',
  'garde ça',
  'save dans'
]

// Mots-clés qui indiquent qu'on ne veut PAS de mémorisation
const EXCLUDE_KEYWORDS = [
  'salut',
  'bonjour',
  'yo',
  'hey',
  'comment ça va',
  'ça va',
  'quoi de neuf'
]

export const memoryTriggerRule: MemoryTriggerRule = {
  shouldTriggerMemory: (message: string) => {
    const lowerMessage = message.toLowerCase()

    // Si le message est trop court (moins de 10 caractères), pas de mémorisation
    if (message.length < 10) {
      return false
    }

    // Si le message contient des mots d'exclusion ET pas de mots-clés explicites
    const hasExcludeWord = EXCLUDE_KEYWORDS.some(keyword =>
      lowerMessage.includes(keyword)
    )

    const hasExplicitKeyword = EXPLICIT_MEMORY_KEYWORDS.some(keyword =>
      lowerMessage.includes(keyword)
    )

    // Ne déclencher que si :
    // 1. Il y a un mot-clé explicite de mémorisation
    // 2. OU le message est long (>100 chars) ET ne contient pas de mot d'exclusion
    if (hasExplicitKeyword) {
      return true
    }

    if (hasExcludeWord) {
      return false
    }

    // Pour les messages longs sans mots-clés, ne pas déclencher automatiquement
    // L'utilisateur doit être explicite
    return false
  }
}

// Fonction pour vérifier si un message Claude devrait inclure une action mémoire
export function shouldClaudeAddMemory(userMessage: string, claudeResponse: string): boolean {
  // Vérifier si l'utilisateur a explicitement demandé
  return memoryTriggerRule.shouldTriggerMemory(userMessage)
}