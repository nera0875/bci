/**
 * brainSystem.ts - Intelligence Centrale du Knowledge Management System
 *
 * Ce module coordonne toutes les capacités IA :
 * - Détection de contexte automatique
 * - Application de règles contextuelles
 * - Recherche de similarité (RAG)
 * - Suggestions basées sur l'apprentissage
 * - Auto-organisation dans le board
 */

import { promptSystem } from './promptSystem'
import { ragService } from './ragService'
import { learningSystem } from './learningSystem'

export interface BrainContext {
  projectId: string
  userMessage: string
  conversationHistory?: Array<{ role: string; content: string }>
}

export interface BrainAnalysis {
  detectedContext: string // "authentication", "api", "business-logic", etc.
  confidence: number // 0.0 to 1.0
  isSuccess: boolean
  isFailed: boolean
  technique?: string
  suggestedPath?: string // Chemin dans le board
  appliedRules: Array<{
    id: string
    name: string
    trigger: string
    action: string
  }>
  similarPatterns: Array<{
    content: string
    similarity: number
  }>
  nextTestSuggestion?: {
    technique: string
    reason: string
    priority: number
  }
}

/**
 * Détecte le contexte d'un message utilisateur
 */
export async function detectContext(message: string): Promise<{
  context: string
  confidence: number
  isSuccess: boolean
  isFailed: boolean
  technique?: string
}> {
  const msgLower = message.toLowerCase()

  // Détection de succès/échec
  const successKeywords = ['ça marche', 'fonctionne', 'réussi', 'success', 'vulnérable', 'trouvé']
  const failureKeywords = ['marche pas', 'échec', 'failed', 'erreur', 'bloqué', 'protégé']

  const isSuccess = successKeywords.some(kw => msgLower.includes(kw))
  const isFailed = failureKeywords.some(kw => msgLower.includes(kw))

  // Détection de contexte
  const contexts = {
    authentication: ['login', 'auth', 'password', 'credential', 'admin', 'user', 'session', 'token', 'jwt'],
    api: ['api', 'endpoint', 'rest', 'graphql', 'json', '/api/', 'swagger'],
    'business-logic': ['prix', 'price', 'discount', 'promo', 'quantity', 'payment', 'checkout', 'cart', 'order'],
    validation: ['input', 'form', 'field', 'data', 'validate'],
    database: ['sql', 'query', 'database', 'table', 'select'],
    access: ['access', '/users/', '/profile/', 'id=', 'user_id'],
    general: []
  }

  let detectedContext = 'general'
  let maxMatches = 0

  for (const [ctx, keywords] of Object.entries(contexts)) {
    const matches = keywords.filter(kw => msgLower.includes(kw)).length
    if (matches > maxMatches) {
      maxMatches = matches
      detectedContext = ctx
    }
  }

  // Extraire technique si mentionnée
  let technique: string | undefined

  if (msgLower.includes('admin:admin') || msgLower.includes('default cred')) {
    technique = 'default-credentials'
  } else if (msgLower.includes('sqli') || msgLower.includes('sql injection')) {
    technique = 'sql-injection'
  } else if (msgLower.includes('xss')) {
    technique = 'cross-site-scripting'
  } else if (msgLower.includes('prix') && msgLower.includes('negatif')) {
    technique = 'negative-price'
  } else if (msgLower.includes('idor')) {
    technique = 'insecure-direct-object-reference'
  }

  const confidence = maxMatches > 0 ? Math.min(maxMatches / 3, 1.0) : 0.3

  return {
    context: detectedContext,
    confidence,
    isSuccess,
    isFailed,
    technique
  }
}

/**
 * Charge les règles actives pour un contexte donné et un dossier optionnel
 */
export async function loadActiveRules(
  projectId: string,
  context: string,
  targetFolderId?: string | null
): Promise<Array<{ id: string; name: string; trigger: string; action: string; priority: number }>> {
  try {
    // Build query params
    const params = new URLSearchParams({
      projectId,
      context
    })

    if (targetFolderId) {
      params.append('targetFolderId', targetFolderId)
    }

    const response = await fetch(`/api/rules/active?${params}`)
    const data = await response.json()

    // Sort by priority DESC (highest first)
    const rules = data.rules || []
    return rules.sort((a: any, b: any) => b.priority - a.priority)
  } catch (error) {
    console.error('Error loading active rules:', error)
    return []
  }
}

/**
 * Génère un chemin dans le board selon le contexte
 */
export function generateBoardPath(
  context: string,
  isSuccess: boolean,
  technique?: string
): string {
  const section = isSuccess ? 'Success' : 'Failed'

  const contextNames: Record<string, string> = {
    'authentication': 'Authentication',
    'api': 'API Testing',
    'business-logic': 'Business Logic',
    'xss': 'XSS',
    'sqli': 'SQL Injection',
    'idor': 'IDOR',
    'general': 'General'
  }

  const contextFolder = contextNames[context] || 'General'

  if (technique) {
    return `Memory/${section}/${contextFolder}/${technique}`
  }

  return `Memory/${section}/${contextFolder}`
}

/**
 * Analyse complète d'un message utilisateur
 */
export async function analyzeMessage(brain: BrainContext): Promise<BrainAnalysis> {
  const { projectId, userMessage, conversationHistory = [] } = brain

  // 1. Détection de contexte
  const detected = await detectContext(userMessage)

  // 2. Charger règles actives
  const appliedRules = await loadActiveRules(projectId, detected.context)

  // 3. Recherche de patterns similaires via RAG
  const similarPatterns = await ragService.findSimilar(userMessage, projectId, 3)

  // 4. Générer chemin board
  const suggestedPath = generateBoardPath(
    detected.context,
    detected.isSuccess,
    detected.technique
  )

  // 5. Suggérer prochain test via learning system
  let nextTestSuggestion: BrainAnalysis['nextTestSuggestion']

  if (detected.isSuccess && detected.technique) {
    // Récupérer suggestions du learning system
    const suggestions = await learningSystem.suggestNextTests(
      projectId,
      detected.context,
      detected.technique
    )

    if (suggestions.length > 0) {
      const top = suggestions[0]
      nextTestSuggestion = {
        technique: top.pattern_type,
        reason: `Success rate: ${(top.predicted_success * 100).toFixed(0)}% based on ${top.usage_count} previous tests`,
        priority: top.predicted_success
      }
    }
  }

  return {
    detectedContext: detected.context,
    confidence: detected.confidence,
    isSuccess: detected.isSuccess,
    isFailed: detected.isFailed,
    technique: detected.technique,
    suggestedPath,
    appliedRules,
    similarPatterns: similarPatterns.map(p => ({
      content: p.content.substring(0, 200),
      similarity: p.similarity
    })),
    nextTestSuggestion
  }
}

/**
 * Construire le system prompt enrichi avec règles et contexte
 */
export async function buildEnrichedPrompt(
  brain: BrainContext,
  analysis: BrainAnalysis
): Promise<string> {
  const basePrompt = promptSystem.getPrompt(analysis.detectedContext)

  // Ajouter les règles actives au prompt
  let rulesSection = ''
  if (analysis.appliedRules.length > 0) {
    rulesSection = `\n\n## RÈGLES ACTIVES POUR CE CONTEXTE\n\n`
    analysis.appliedRules.forEach(rule => {
      rulesSection += `### ${rule.name}\n${rule.action}\n\n`
    })
  }

  // Ajouter contexte similaire (RAG)
  let ragSection = ''
  if (analysis.similarPatterns.length > 0) {
    ragSection = `\n\n## CONTEXTE SIMILAIRE (mémoire)\n\n`
    analysis.similarPatterns.forEach((pattern, idx) => {
      ragSection += `${idx + 1}. (similarité: ${(pattern.similarity * 100).toFixed(0)}%)\n${pattern.content}\n\n`
    })
  }

  return basePrompt + rulesSection + ragSection
}

export const brainSystem = {
  detectContext,
  loadActiveRules,
  generateBoardPath,
  analyzeMessage,
  buildEnrichedPrompt
}
