/**
 * AI Action Detector - Détecte et exécute les vraies actions mémoire depuis le chat
 *
 * Analyse le texte généré par l'IA pour détecter les intentions :
 * - Créer un document
 * - Éditer un document existant
 * - Créer un dossier
 * - Déplacer/organiser
 *
 * Puis propose validation via toast et exécute l'action sur Supabase
 */

import { supabase } from '@/lib/supabase/client'

export interface DetectedAction {
  type: 'create_document' | 'edit_document' | 'create_folder' | 'move' | 'organize'
  confidence: number
  data: {
    name?: string
    content?: string
    parentId?: string | null
    targetFolder?: string
    icon?: string
    color?: string
    documentId?: string
  }
  rawText: string
}

export class AIActionDetector {
  private projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
  }

  /**
   * Analyse un chunk de texte IA pour détecter des actions
   */
  detectActions(text: string): DetectedAction[] {
    const actions: DetectedAction[] = []

    // Pattern 1: Créer un document
    // "Je vais créer un document 'SQL Injection Success' dans..."
    // "Document créé: XSS Results"
    const createDocPatterns = [
      /(?:je vais créer|créer un document|création du document|document créé)[:\s]+["']?([^"'\n]+)["']?/gi,
      /(?:nouveau document|new document)[:\s]+["']?([^"'\n]+)["']?/gi,
      /##\s+📄\s+([^\n]+)/g, // Markdown heading avec emoji document
    ]

    for (const pattern of createDocPatterns) {
      const matches = [...text.matchAll(pattern)]
      for (const match of matches) {
        const name = match[1]?.trim()
        if (name && name.length > 0 && name.length < 100) {
          // Extract content after the creation statement
          const contentMatch = text.match(new RegExp(`${this.escapeRegex(match[0])}[\\s\\S]{0,50}([\\s\\S]+?)(?=##|$)`, 'i'))
          const content = contentMatch?.[1]?.trim() || ''

          // Detect parent folder: "dans le dossier X", "dans X", "in folder X"
          const parentFolderMatch = text.match(/(?:dans le dossier|dans|in folder|in)\s+["']?([^"'\n,]+)["']?/i)
          const targetFolder = parentFolderMatch?.[1]?.trim()

          actions.push({
            type: 'create_document',
            confidence: 0.85,
            data: {
              name,
              content,
              parentId: null, // Will be resolved by executeAction
              targetFolder, // Folder name to find
              icon: this.guessIcon(name, content),
              color: 'blue'
            },
            rawText: match[0]
          })
        }
      }
    }

    // Pattern 2: Créer un dossier
    // "Je vais créer un dossier 'Success Cases'"
    const createFolderPatterns = [
      /(?:je vais créer|créer un dossier|création du dossier|dossier créé)[:\s]+["']?([^"'\n]+)["']?/gi,
      /##\s+📁\s+([^\n]+)/g,
    ]

    for (const pattern of createFolderPatterns) {
      const matches = [...text.matchAll(pattern)]
      for (const match of matches) {
        const name = match[1]?.trim()
        if (name && name.length > 0 && name.length < 100) {
          // Detect parent folder
          const parentFolderMatch = text.match(/(?:dans le dossier|dans|in folder|in)\s+["']?([^"'\n,]+)["']?/i)
          const targetFolder = parentFolderMatch?.[1]?.trim()

          actions.push({
            type: 'create_folder',
            confidence: 0.85,
            data: {
              name,
              targetFolder,
              icon: '📁',
              color: 'gray'
            },
            rawText: match[0]
          })
        }
      }
    }

    // Pattern 3: Éditer un document existant
    // "Je vais mettre à jour le document 'Results'"
    const editPatterns = [
      /(?:je vais mettre à jour|modifier|éditer|update)[:\s]+(?:le document)?["']?([^"'\n]+)["']?/gi,
      /(?:ajout dans|ajouté dans|storing in)["']?([^"'\n]+)["']?/gi,
    ]

    for (const pattern of editPatterns) {
      const matches = [...text.matchAll(pattern)]
      for (const match of matches) {
        const name = match[1]?.trim()
        if (name && name.length > 0) {
          actions.push({
            type: 'edit_document',
            confidence: 0.75,
            data: {
              name,
              content: '' // Will be extracted from context
            },
            rawText: match[0]
          })
        }
      }
    }

    // Pattern 4: Organisation / rangement
    // "Je vais ranger ça dans Success"
    const organizePatterns = [
      /(?:ranger|organiser|déplacer)[:\s]+["']?([^"'\n]+)["']?\s+(?:dans|vers|to)["']?([^"'\n]+)["']?/gi,
    ]

    for (const pattern of organizePatterns) {
      const matches = [...text.matchAll(pattern)]
      for (const match of matches) {
        const itemName = match[1]?.trim()
        const targetFolder = match[2]?.trim()
        if (itemName && targetFolder) {
          actions.push({
            type: 'organize',
            confidence: 0.7,
            data: {
              name: itemName,
              targetFolder
            },
            rawText: match[0]
          })
        }
      }
    }

    return actions
  }

  /**
   * Exécute une action validée par l'utilisateur
   */
  async executeAction(action: DetectedAction): Promise<{ success: boolean; nodeId?: string; error?: string }> {
    try {
      switch (action.type) {
        case 'create_document':
          return await this.createDocument(action.data)

        case 'create_folder':
          return await this.createFolder(action.data)

        case 'edit_document':
          return await this.editDocument(action.data)

        case 'organize':
          return await this.organizeItem(action.data)

        default:
          return { success: false, error: 'Unknown action type' }
      }
    } catch (error) {
      console.error('Error executing action:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Crée un nouveau document dans memory_nodes
   */
  private async createDocument(data: DetectedAction['data']): Promise<{ success: boolean; nodeId?: string; error?: string }> {
    // Resolve targetFolder to parentId
    let resolvedParentId = data.parentId || null

    if (data.targetFolder) {
      const { data: folders } = await supabase
        .from('memory_nodes')
        .select('id')
        .eq('project_id', this.projectId)
        .eq('type', 'folder')
        .ilike('name', `%${data.targetFolder}%`)
        .limit(1)

      if (folders && folders.length > 0) {
        resolvedParentId = folders[0].id
      }
    }

    const { data: newNode, error } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: this.projectId,
        name: data.name!,
        content: data.content || '',
        type: 'document',
        parent_id: resolvedParentId,
        section: 'memory',
        icon: data.icon || '📄',
        color: data.color || 'blue',
        metadata: {
          created_by: 'ai_assistant',
          source: 'chat_stream'
        }
      })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, nodeId: newNode.id }
  }

  /**
   * Crée un nouveau dossier dans memory_nodes
   */
  private async createFolder(data: DetectedAction['data']): Promise<{ success: boolean; nodeId?: string; error?: string }> {
    // Resolve targetFolder to parentId
    let resolvedParentId = data.parentId || null

    if (data.targetFolder) {
      const { data: folders } = await supabase
        .from('memory_nodes')
        .select('id')
        .eq('project_id', this.projectId)
        .eq('type', 'folder')
        .ilike('name', `%${data.targetFolder}%`)
        .limit(1)

      if (folders && folders.length > 0) {
        resolvedParentId = folders[0].id
      }
    }

    const { data: newNode, error } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: this.projectId,
        name: data.name!,
        content: '',
        type: 'folder',
        parent_id: resolvedParentId,
        section: 'memory',
        icon: data.icon || '📁',
        color: data.color || 'gray',
        metadata: {
          created_by: 'ai_assistant',
          source: 'chat_stream'
        }
      })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, nodeId: newNode.id }
  }

  /**
   * Édite un document existant
   */
  private async editDocument(data: DetectedAction['data']): Promise<{ success: boolean; nodeId?: string; error?: string }> {
    // First, find the document by name
    const { data: nodes } = await supabase
      .from('memory_nodes')
      .select('id, content')
      .eq('project_id', this.projectId)
      .eq('name', data.name!)
      .eq('type', 'document')
      .limit(1)

    if (!nodes || nodes.length === 0) {
      return { success: false, error: 'Document not found' }
    }

    const node = nodes[0]

    // Append new content to existing
    const updatedContent = node.content
      ? `${node.content}\n\n---\n\n${data.content}`
      : data.content

    const { error } = await supabase
      .from('memory_nodes')
      .update({
        content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', node.id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, nodeId: node.id }
  }

  /**
   * Déplace un item vers un dossier cible
   */
  private async organizeItem(data: DetectedAction['data']): Promise<{ success: boolean; nodeId?: string; error?: string }> {
    // Find the item
    const { data: items } = await supabase
      .from('memory_nodes')
      .select('id')
      .eq('project_id', this.projectId)
      .eq('name', data.name!)
      .limit(1)

    if (!items || items.length === 0) {
      return { success: false, error: 'Item not found' }
    }

    // Find target folder
    const { data: folders } = await supabase
      .from('memory_nodes')
      .select('id')
      .eq('project_id', this.projectId)
      .eq('name', data.targetFolder!)
      .eq('type', 'folder')
      .limit(1)

    if (!folders || folders.length === 0) {
      return { success: false, error: 'Target folder not found' }
    }

    // Move item
    const { error } = await supabase
      .from('memory_nodes')
      .update({
        parent_id: folders[0].id,
        updated_at: new Date().toISOString()
      })
      .eq('id', items[0].id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, nodeId: items[0].id }
  }

  /**
   * Devine l'icône basée sur le nom/contenu
   */
  private guessIcon(name: string, content: string): string {
    const lowerName = name.toLowerCase()
    const lowerContent = content.toLowerCase()

    if (lowerName.includes('success') || lowerContent.includes('success')) return '✅'
    if (lowerName.includes('fail') || lowerContent.includes('fail')) return '❌'
    if (lowerName.includes('sql')) return '🗄️'
    if (lowerName.includes('xss')) return '🔥'
    if (lowerName.includes('auth')) return '🔐'
    if (lowerName.includes('api')) return '🔌'
    if (lowerName.includes('test')) return '🧪'
    if (lowerName.includes('report')) return '📊'

    return '📄'
  }

  /**
   * Escape regex special chars
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}
