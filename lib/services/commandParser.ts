/**
 * Parser de commandes naturelles pour le chat
 * Permet à l'utilisateur de donner des instructions en langage naturel
 * Ex: "Range ça dans Success/Auth", "Montre-moi Failed/Business Logic"
 */

export interface ParsedCommand {
  type: 'storage' | 'navigation' | 'action' | 'query' | 'none'
  action?: string
  target?: {
    section?: 'memory' | 'rules' | 'optimization'
    path?: string
    folder?: string
    status?: 'success' | 'failed'
    context?: string
  }
  content?: string
  confidence: number
}

/**
 * Parse une commande naturelle depuis le message utilisateur
 */
export function parseNaturalCommand(message: string): ParsedCommand {
  const lowerMessage = message.toLowerCase().trim()

  // Commande de rangement
  const storageCommand = parseStorageCommand(lowerMessage, message)
  if (storageCommand.confidence > 0.7) return storageCommand

  // Commande de navigation
  const navCommand = parseNavigationCommand(lowerMessage, message)
  if (navCommand.confidence > 0.7) return navCommand

  // Commande d'action (ajout, modification, suppression)
  const actionCommand = parseActionCommand(lowerMessage, message)
  if (actionCommand.confidence > 0.7) return actionCommand

  // Commande de requête (affichage, recherche)
  const queryCommand = parseQueryCommand(lowerMessage, message)
  if (queryCommand.confidence > 0.7) return queryCommand

  return {
    type: 'none',
    confidence: 0
  }
}

/**
 * Parse les commandes de rangement
 * Ex: "Range ça dans Success/Auth", "Stocke dans Memory/Failed"
 */
function parseStorageCommand(lowerMessage: string, originalMessage: string): ParsedCommand {
  const storagePatterns = [
    /range(?:\s+(?:ça|ceci|cela))?\s+dans\s+([^\n]+)/i,
    /stocke?\s+(?:dans|à)\s+([^\n]+)/i,
    /sauvegarde?\s+(?:dans|à)\s+([^\n]+)/i,
    /mets?\s+(?:ça|ceci|cela)\s+dans\s+([^\n]+)/i,
    /ajoute?\s+(?:ça|ceci|cela)\s+(?:dans|à)\s+([^\n]+)/i
  ]

  for (const pattern of storagePatterns) {
    const match = originalMessage.match(pattern)
    if (match) {
      const pathStr = match[1].trim()
      const parsed = parsePath(pathStr)
      
      return {
        type: 'storage',
        action: 'store',
        target: parsed,
        confidence: 0.9
      }
    }
  }

  return { type: 'none', confidence: 0 }
}

/**
 * Parse les commandes de navigation
 * Ex: "Montre-moi Failed/Business Logic", "Ouvre Success/Auth"
 */
function parseNavigationCommand(lowerMessage: string, originalMessage: string): ParsedCommand {
  const navPatterns = [
    /(?:montre|affiche|ouvre)(?:\s+moi)?\s+([^\n]+)/i,
    /(?:va|navigue|aller)\s+(?:à|vers|dans)\s+([^\n]+)/i,
    /(?:voir|regarder)\s+([^\n]+)/i
  ]

  for (const pattern of navPatterns) {
    const match = originalMessage.match(pattern)
    if (match) {
      const pathStr = match[1].trim()
      const parsed = parsePath(pathStr)
      
      return {
        type: 'navigation',
        action: 'navigate',
        target: parsed,
        confidence: 0.85
      }
    }
  }

  return { type: 'none', confidence: 0 }
}

/**
 * Parse les commandes d'action
 * Ex: "Cible memory/Success et ajoute ligne", "Supprime dans Failed/Auth"
 */
function parseActionCommand(lowerMessage: string, originalMessage: string): ParsedCommand {
  // Commandes avec cible + action
  const targetActionPattern = /cible\s+([^\s]+)\s+et\s+(ajoute|supprime|modifie)\s+([^\n]*)/i
  const targetMatch = originalMessage.match(targetActionPattern)
  
  if (targetMatch) {
    const pathStr = targetMatch[1].trim()
    const action = targetMatch[2].toLowerCase()
    const content = targetMatch[3].trim()
    const parsed = parsePath(pathStr)
    
    return {
      type: 'action',
      action: action === 'ajoute' ? 'add' : action === 'supprime' ? 'delete' : 'update',
      target: parsed,
      content,
      confidence: 0.9
    }
  }

  // Commandes simples
  const simplePatterns = [
    { pattern: /ajoute?\s+(?:une?\s+)?ligne\s+(?:dans|à)\s+([^\n]+)/i, action: 'add' },
    { pattern: /supprime?\s+(?:de|dans)\s+([^\n]+)/i, action: 'delete' },
    { pattern: /modifie?\s+(?:dans)\s+([^\n]+)/i, action: 'update' }
  ]

  for (const { pattern, action } of simplePatterns) {
    const match = originalMessage.match(pattern)
    if (match) {
      const pathStr = match[1].trim()
      const parsed = parsePath(pathStr)
      
      return {
        type: 'action',
        action,
        target: parsed,
        confidence: 0.8
      }
    }
  }

  return { type: 'none', confidence: 0 }
}

/**
 * Parse les commandes de requête
 * Ex: "Liste Success", "Cherche dans Auth"
 */
function parseQueryCommand(lowerMessage: string, originalMessage: string): ParsedCommand {
  const queryPatterns = [
    { pattern: /liste\s+([^\n]+)/i, action: 'list' },
    { pattern: /cherche\s+(?:dans|à)\s+([^\n]+)/i, action: 'search' },
    { pattern: /trouve\s+([^\n]+)/i, action: 'find' }
  ]

  for (const { pattern, action } of queryPatterns) {
    const match = originalMessage.match(pattern)
    if (match) {
      const pathStr = match[1].trim()
      const parsed = parsePath(pathStr)
      
      return {
        type: 'query',
        action,
        target: parsed,
        confidence: 0.75
      }
    }
  }

  return { type: 'none', confidence: 0 }
}

/**
 * Parse un chemin type "Memory/Success/Business Logic"
 */
function parsePath(pathStr: string): {
  section?: 'memory' | 'rules' | 'optimization'
  path?: string
  folder?: string
  status?: 'success' | 'failed'
  context?: string
} {
  const lowerPath = pathStr.toLowerCase()
  const result: any = {
    path: pathStr
  }

  // Détecter la section
  if (lowerPath.includes('memory') || lowerPath.includes('mémoire')) {
    result.section = 'memory'
  } else if (lowerPath.includes('rule') || lowerPath.includes('règle')) {
    result.section = 'rules'
  } else if (lowerPath.includes('optimization') || lowerPath.includes('optimisation')) {
    result.section = 'optimization'
  }

  // Détecter le statut
  if (lowerPath.includes('success') || lowerPath.includes('réussi')) {
    result.status = 'success'
  } else if (lowerPath.includes('failed') || lowerPath.includes('échec')) {
    result.status = 'failed'
  }

  // Détecter le contexte
  const contexts = [
    'business logic',
    'authentication',
    'auth',
    'api',
    'race condition',
    'idor',
    'xss',
    'sqli'
  ]

  for (const ctx of contexts) {
    if (lowerPath.includes(ctx)) {
      result.context = ctx
      break
    }
  }

  // Extraire le dossier final
  const pathParts = pathStr.split('/').map(p => p.trim())
  if (pathParts.length > 0) {
    result.folder = pathParts[pathParts.length - 1]
  }

  return result
}

/**
 * Convertit une commande parsée en instruction pour l'API
 */
export function commandToApiCall(command: ParsedCommand): {
  endpoint: string
  method: string
  body?: any
} | null {
  if (command.type === 'none' || command.confidence < 0.7) {
    return null
  }

  switch (command.type) {
    case 'storage':
      return {
        endpoint: '/api/board/auto-create',
        method: 'POST',
        body: {
          section: command.target?.section || 'memory',
          folderName: buildFolderPath(command.target),
          itemName: 'Item auto-rangé',
          itemContent: command.content || 'Contenu du chat'
        }
      }

    case 'navigation':
      // La navigation est gérée côté client
      return null

    case 'action':
      if (command.action === 'add') {
        return {
          endpoint: '/api/memory/nodes',
          method: 'POST',
          body: {
            section: command.target?.section || 'memory',
            name: command.content || 'Nouvel item',
            type: 'document',
            content: command.content
          }
        }
      }
      break

    case 'query':
      return {
        endpoint: '/api/memory/nodes',
        method: 'GET',
        body: {
          section: command.target?.section,
          folder: command.target?.folder
        }
      }
  }

  return null
}

/**
 * Construit le chemin de dossier depuis la cible
 */
function buildFolderPath(target?: ParsedCommand['target']): string {
  if (!target) return ''

  const parts: string[] = []
  
  if (target.status === 'success') parts.push('Success')
  else if (target.status === 'failed') parts.push('Failed')
  
  if (target.context) {
    parts.push(target.context.charAt(0).toUpperCase() + target.context.slice(1))
  }

  return parts.join('/')
}

/**
 * Génère une réponse de confirmation pour une commande
 */
export function generateCommandResponse(command: ParsedCommand): string {
  if (command.type === 'none') {
    return ''
  }

  switch (command.type) {
    case 'storage':
      return `✅ Je vais ranger ça dans ${command.target?.path || 'la mémoire'}`
    
    case 'navigation':
      return `📂 Navigation vers ${command.target?.path || 'le dossier'}`
    
    case 'action':
      if (command.action === 'add') {
        return `➕ Ajout dans ${command.target?.path || 'la mémoire'}`
      } else if (command.action === 'delete') {
        return `❌ Suppression depuis ${command.target?.path || 'la mémoire'}`
      } else if (command.action === 'update') {
        return `✏️ Modification dans ${command.target?.path || 'la mémoire'}`
      }
      break
    
    case 'query':
      return `🔍 Recherche dans ${command.target?.path || 'la mémoire'}`
  }

  return '✅ Commande reçue'
}