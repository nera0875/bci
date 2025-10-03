/**
 * Configuration des prompts experts pour le système de pentesting
 * Ce fichier permet de modifier facilement les prompts sans toucher au code
 */

import { ContextType, PromptTemplate } from '@/lib/services/promptSystem'

/**
 * Configuration des prompts par contexte
 * Vous pouvez modifier ces prompts pour adapter le comportement de l'IA
 */
export const PROMPT_CONFIGS: Record<ContextType, PromptTemplate> = {
  'business-logic': {
    id: 'business-logic-expert',
    name: 'Expert Business Logic',
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
2. Suggérer le prochain test de manière DIRECTIVE

Format de réponse OBLIGATOIRE :
🎯 **Analyse**: [ton analyse détaillée]
🔄 **Prochain test**: [suggestion directive - "Teste maintenant..."]`,
    priority: 1
  },

  'authentication': {
    id: 'auth-expert',
    name: 'Expert Authentication',
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

Format de réponse :
🎯 **Analyse**: [analyse]
🔄 **Prochain test**: [directive]`,
    priority: 1
  },

  'api-security': {
    id: 'api-expert',
    name: 'Expert API Security',
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

Format :
🎯 **Analyse**: [analyse]
🔄 **Prochain test**: [directive]`,
    priority: 1
  },

  'race-condition': {
    id: 'race-expert',
    name: 'Expert Race Conditions',
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
🔄 **Prochain test**: [directive]`,
    priority: 2
  },

  'idor': {
    id: 'idor-expert',
    name: 'Expert IDOR',
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
🔄 **Prochain test**: [directive]`,
    priority: 2
  },

  'default': {
    id: 'general-expert',
    name: 'Expert Pentesting Général',
    context: 'default',
    keywords: [],
    systemPrompt: `Tu es un expert pentester généraliste pour bug bounty.
Ta mission : identifier toute faille de sécurité.

APPROCHE MÉTHODIQUE :
1. Comprendre la fonctionnalité
2. Identifier les points d'entrée
3. Tester les cas limites
4. Chercher les bypasses

Format :
🎯 **Analyse**: [analyse]
🔄 **Prochain test**: [directive]`,
    priority: 3
  }
}

/**
 * Configuration des mots-clés pour la détection de succès/échec
 */
export const DETECTION_CONFIG = {
  success: {
    keywords: [
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
  },
  failure: {
    keywords: [
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
  }
}

/**
 * Configuration des techniques pour l'extraction
 */
export const TECHNIQUES_CONFIG = {
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

/**
 * Fonction pour obtenir un prompt personnalisé
 * Permet de modifier dynamiquement les prompts sans rebuild
 */
export function getCustomPrompt(context: ContextType): PromptTemplate {
  return PROMPT_CONFIGS[context] || PROMPT_CONFIGS['default']
}

/**
 * Fonction pour mettre à jour un prompt (à utiliser avec précaution)
 */
export function updatePromptConfig(
  context: ContextType,
  updates: Partial<PromptTemplate>
): void {
  if (PROMPT_CONFIGS[context]) {
    PROMPT_CONFIGS[context] = {
      ...PROMPT_CONFIGS[context],
      ...updates
    }
  }
}