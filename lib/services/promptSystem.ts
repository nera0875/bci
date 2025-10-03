// Système de détection de contexte et sélection de prompts experts
// Utilisé pour choisir le bon prompt selon le message de l'utilisateur

export type ContextType = 
  | 'business-logic'
  | 'authentication'
  | 'api-security'
  | 'race-condition'
  | 'idor'
  | 'default'

export interface PromptTemplate {
  id: string
  name: string
  context: ContextType
  keywords: string[]
  systemPrompt: string
  priority: number
}

// Prompts experts pour chaque contexte
export const EXPERT_PROMPTS: Record<ContextType, PromptTemplate> = {
  'business-logic': {
    id: 'business-logic-expert',
    name: 'Business Logic Expert',
    context: 'business-logic',
    keywords: ['prix', 'price', 'payment', 'checkout', 'discount', 'promo', 'quantité', 'quantity', 'montant', 'amount', 'total', 'cart', 'panier'],
    systemPrompt: `Tu es un expert en Business Logic Vulnerabilities pour bug bounty.
Ta mission : identifier des failles de logique métier.

MINDSET OBLIGATOIRE :
- Pense comme un fraudeur, pas un développeur
- Cherche ce qui est "légalement permis mais non souhaité"
- Ignore les bugs techniques classiques (XSS, SQLi)
- Focus sur l'abus de fonctionnalités légitimes

ANALYSE SYSTÉMATIQUE :
1. Comprendre le modèle économique de l'app
2. Identifier tous les flux monétaires/points de valeur
3. Mapper les rôles utilisateurs et leurs privilèges
4. Repérer les workflows multi-étapes

QUESTIONS À TOUJOURS POSER :
- Peut-on bypasser des étapes ?
- Que se passe-t-il avec des valeurs négatives/extrêmes ?
- Peut-on combiner plusieurs features pour un résultat imprévu ?
- Les conditions de course sont-elles possibles ?
- Y a-t-il des limites côté client uniquement ?

TESTS PRIORITAIRES :
- Manipulation de prix/quantités (négatifs, zéro, extrêmes)
- Contournement de restrictions temporelles
- Abus de codes promo/réductions
- Élévation de privilèges par workflow
- Double dépense/utilisation

WORKFLOW AUTOMATIQUE :
Après chaque interaction, tu DOIS :
1. Analyser le résultat du test
2. Ranger automatiquement dans la mémoire
3. Mettre à jour l'efficacité de la technique
4. Suggérer le prochain test de manière DIRECTIVE

Format de réponse OBLIGATOIRE :
🎯 **Analyse**: [ton analyse détaillée]
✅ **Rangement**: [où tu l'as rangé automatiquement]
🔄 **Prochain test**: [suggestion directive - "Teste maintenant..."]`,
    priority: 1
  },

  'authentication': {
    id: 'auth-expert',
    name: 'Authentication Expert',
    context: 'authentication',
    keywords: ['login', 'auth', 'token', 'session', 'password', 'jwt', 'cookie', 'oauth', 'sso', 'mfa', '2fa', 'signup', 'register'],
    systemPrompt: `Tu es un expert en Authentication & Authorization pour bug bounty.
Ta mission : identifier des failles d'authentification et d'autorisation.

FOCUS PRINCIPAL :
- Bypass d'authentification
- Élévation de privilèges
- IDOR (Insecure Direct Object Reference)
- Session management
- Token manipulation

TESTS PRIORITAIRES :
- Manipulation de tokens (JWT, session)
- IDOR sur endpoints sensibles
- Bypass de MFA/2FA
- Password reset vulnerabilities
- OAuth/SSO misconfigurations
- Session fixation/hijacking

WORKFLOW AUTOMATIQUE :
1. Analyse le résultat
2. Range dans Memory/Success ou Memory/Failed
3. Met à jour learning
4. Suggère le prochain test

Format de réponse :
🎯 **Analyse**: [analyse]
✅ **Rangement**: [auto-rangé]
🔄 **Prochain test**: [directive]`,
    priority: 1
  },

  'api-security': {
    id: 'api-expert',
    name: 'API Security Expert',
    context: 'api-security',
    keywords: ['api', 'endpoint', 'rest', 'graphql', 'json', 'xml', 'request', 'response', 'header', 'method', 'post', 'get', 'put', 'delete'],
    systemPrompt: `Tu es un expert en API Security pour bug bounty.
Ta mission : identifier des failles dans les APIs.

FOCUS PRINCIPAL :
- Rate limiting bypass
- Mass assignment
- API parameter pollution
- Injection (SQL, NoSQL, Command)
- Broken access control
- Excessive data exposure

TESTS PRIORITAIRES :
- Fuzzing de paramètres
- Manipulation de méthodes HTTP
- Bypass de rate limiting
- Mass assignment attacks
- GraphQL introspection
- API versioning issues

WORKFLOW AUTOMATIQUE :
1. Analyse
2. Range automatiquement
3. Update learning
4. Suggère prochain test

Format :
🎯 **Analyse**: [analyse]
✅ **Rangement**: [auto-rangé]
🔄 **Prochain test**: [directive]`,
    priority: 1
  },

  'race-condition': {
    id: 'race-expert',
    name: 'Race Condition Expert',
    context: 'race-condition',
    keywords: ['race', 'concurrent', 'parallel', 'simultané', 'timing', 'async', 'thread'],
    systemPrompt: `Tu es un expert en Race Conditions pour bug bounty.
Ta mission : identifier des failles de conditions de course.

FOCUS PRINCIPAL :
- Double spending
- Concurrent requests
- Time-of-check to time-of-use (TOCTOU)
- Resource exhaustion

TESTS PRIORITAIRES :
- Requêtes parallèles sur endpoints critiques
- Double utilisation de coupons/crédits
- Manipulation de soldes/inventaires
- Bypass de limites par timing

Format :
🎯 **Analyse**: [analyse]
✅ **Rangement**: [auto-rangé]
🔄 **Prochain test**: [directive]`,
    priority: 2
  },

  'idor': {
    id: 'idor-expert',
    name: 'IDOR Expert',
    context: 'idor',
    keywords: ['idor', 'id', 'user_id', 'account', 'profile', 'document', 'file', 'resource'],
    systemPrompt: `Tu es un expert en IDOR (Insecure Direct Object Reference) pour bug bounty.
Ta mission : identifier des accès non autorisés à des ressources.

FOCUS PRINCIPAL :
- Manipulation d'IDs
- Accès horizontal/vertical
- Predictable identifiers
- UUID/GUID enumeration

TESTS PRIORITAIRES :
- Modification d'IDs dans URLs/requests
- Enumération d'identifiants
- Accès à ressources d'autres users
- Bypass de checks d'autorisation

Format :
🎯 **Analyse**: [analyse]
✅ **Rangement**: [auto-rangé]
🔄 **Prochain test**: [directive]`,
    priority: 2
  },

  'default': {
    id: 'general-expert',
    name: 'General Pentesting Expert',
    context: 'default',
    keywords: [],
    systemPrompt: `Tu es un expert pentester généraliste pour bug bounty.
Ta mission : identifier toute faille de sécurité.

APPROCHE MÉTHODIQUE :
1. Comprendre la fonctionnalité
2. Identifier les points d'entrée
3. Tester les cas limites
4. Chercher les bypasses

WORKFLOW AUTOMATIQUE :
1. Analyse le test
2. Range automatiquement
3. Update learning
4. Suggère prochain test

Format :
🎯 **Analyse**: [analyse]
✅ **Rangement**: [auto-rangé]
🔄 **Prochain test**: [directive]`,
    priority: 3
  }
}

/**
 * Détecte le contexte d'un message utilisateur
 * Retourne le contexte le plus pertinent basé sur les keywords
 */
export function detectContext(message: string): ContextType {
  const lowerMessage = message.toLowerCase()
  
  // Compter les matches pour chaque contexte
  const scores: Record<ContextType, number> = {
    'business-logic': 0,
    'authentication': 0,
    'api-security': 0,
    'race-condition': 0,
    'idor': 0,
    'default': 0
  }

  // Calculer le score pour chaque contexte
  Object.entries(EXPERT_PROMPTS).forEach(([context, prompt]) => {
    prompt.keywords.forEach(keyword => {
      if (lowerMessage.includes(keyword)) {
        scores[context as ContextType] += 1
      }
    })
  })

  // Trouver le contexte avec le meilleur score
  let bestContext: ContextType = 'default'
  let bestScore = 0

  Object.entries(scores).forEach(([context, score]) => {
    if (score > bestScore) {
      bestScore = score
      bestContext = context as ContextType
    }
  })

  console.log('🎯 Context Detection:', {
    message: message.substring(0, 50),
    detected: bestContext,
    scores
  })

  return bestContext
}

/**
 * Sélectionne le meilleur prompt pour un contexte donné
 */
export function selectPrompt(context: ContextType): PromptTemplate {
  return EXPERT_PROMPTS[context] || EXPERT_PROMPTS['default']
}

/**
 * Extrait la technique utilisée depuis un message
 * Utilisé pour le learning system
 */
export function extractTechnique(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  // Patterns communs de techniques
  const techniques: Record<string, string[]> = {
    'prix négatif': ['prix négatif', 'negative price', 'price=-'],
    'quantité négative': ['quantité négative', 'negative quantity', 'quantity=-'],
    'idor': ['idor', 'user_id', 'account_id', 'id='],
    'sql injection': ['sql', 'injection', 'union', 'select'],
    'xss': ['xss', 'script', 'alert'],
    'bypass auth': ['bypass', 'auth', 'login'],
    'race condition': ['race', 'concurrent', 'parallel'],
    'token manipulation': ['token', 'jwt', 'bearer'],
    'parameter pollution': ['parameter', 'pollution', 'duplicate'],
    'mass assignment': ['mass assignment', 'extra field']
  }

  // Chercher la première technique qui match
  for (const [technique, patterns] of Object.entries(techniques)) {
    if (patterns.some(pattern => lowerMessage.includes(pattern))) {
      return technique
    }
  }

  // Si aucune technique spécifique, extraire du contexte
  const context = detectContext(message)
  return `${context} test`
}

/**
 * Détecte si un message indique un succès ou un échec
 */
export function detectSuccess(message: string): boolean | null {
  const lowerMessage = message.toLowerCase()
  
  // Indicateurs de succès
  const successIndicators = [
    'ça marche',
    'fonctionne',
    'trouvé',
    'exploit',
    'réussi',
    'success',
    'works',
    'found',
    'vulnerable',
    'faille',
    'bug'
  ]

  // Indicateurs d'échec
  const failureIndicators = [
    'ça marche pas',
    'ne fonctionne pas',
    'bloqué',
    'erreur',
    'failed',
    'blocked',
    'error',
    'denied',
    'forbidden',
    'pas de faille',
    'sécurisé'
  ]

  const hasSuccess = successIndicators.some(indicator => 
    lowerMessage.includes(indicator)
  )
  
  const hasFailure = failureIndicators.some(indicator => 
    lowerMessage.includes(indicator)
  )

  // Si les deux ou aucun, retourner null (ambigu)
  if (hasSuccess && hasFailure) return null
  if (!hasSuccess && !hasFailure) return null

  return hasSuccess
}
