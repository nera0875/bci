// Système de ciblage intelligent multi-niveau pour le pentesting
// Permet à l'IA de cibler précisément selon la hiérarchie : Section > Dossier > Tableau > Row

import { supabase } from '@/lib/supabase/client'

export interface TargetPath {
  section: string
  folder?: string
  document?: string
  row?: string
}

export interface TargetingContext {
  path: TargetPath
  confidence: number
  suggestions: string[]
  rules: any[]
  relevantMemory: any[]
}

export class IntelligentTargeting {
  private projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
  }

  // Analyser un message pour déterminer le ciblage optimal
  async analyzeTarget(userMessage: string): Promise<TargetingContext> {
    const lowerMessage = userMessage.toLowerCase()
    
    // Détection de section
    const section = this.detectSection(lowerMessage)
    
    // Détection de dossier/contexte
    const folder = this.detectFolder(lowerMessage, section)
    
    // Détection de document spécifique
    const document = await this.detectDocument(lowerMessage, section, folder)
    
    // Construire le chemin cible
    const targetPath: TargetPath = {
      section,
      folder,
      document
    }

    // Calculer la confiance du ciblage
    const confidence = this.calculateConfidence(targetPath, lowerMessage)

    // Obtenir les suggestions pour ce ciblage
    const suggestions = await this.generateSuggestions(targetPath, lowerMessage)

    // Récupérer les règles pertinentes
    const rules = await this.getRelevantRules(targetPath)

    // Récupérer la mémoire pertinente
    const relevantMemory = await this.getRelevantMemory(targetPath, lowerMessage)

    console.log('🎯 Intelligent Targeting:', {
      path: targetPath,
      confidence,
      suggestionsCount: suggestions.length,
      rulesCount: rules.length,
      memoryCount: relevantMemory.length
    })

    return {
      path: targetPath,
      confidence,
      suggestions,
      rules,
      relevantMemory
    }
  }

  // Détecter la section principale
  private detectSection(message: string): string {
    if (message.includes('règle') || message.includes('rule') || message.includes('constraint')) {
      return 'rules'
    }
    if (message.includes('optimis') || message.includes('performance') || message.includes('améliore')) {
      return 'optimization'
    }
    return 'memory' // Par défaut
  }

  // Détecter le dossier/contexte
  private detectFolder(message: string, section: string): string {
    // Détection Business Logic
    if (message.includes('business logic') || message.includes('logique métier') ||
        message.includes('prix') || message.includes('payment') || message.includes('paiement')) {
      return 'Business Logic'
    }
    
    // Détection Success
    if (message.includes('success') || message.includes('succès') || message.includes('réussi') ||
        message.includes('trouvé') || message.includes('exploit réussi') || message.includes('vulnérabilité confirmée')) {
      return 'Success'
    }
    
    // Détection Failed/Échec
    if (message.includes('échec') || message.includes('failed') || message.includes('pas marché') ||
        message.includes('bloqué') || message.includes('inefficace') || message.includes('échoué')) {
      return 'Failed'
    }
    
    // Détection Authentication
    if (message.includes('auth') || message.includes('login') || message.includes('session') ||
        message.includes('token') || message.includes('privilege')) {
      return 'Authentication'
    }
    
    // Détection API
    if (message.includes('api') || message.includes('endpoint') || message.includes('requête')) {
      return 'API Security'
    }
    
    // Défaut selon section
    if (section === 'rules') return 'Global Rules'
    if (section === 'optimization') return 'Performance'
    return 'General'
  }

  // Détecter un document spécifique
  private async detectDocument(message: string, section: string, folder?: string): Promise<string | undefined> {
    try {
      // Chercher des documents avec des noms similaires
      const { data: documents } = await supabase
        .from('memory_nodes')
        .select('id, name')
        .eq('project_id', this.projectId)
        .eq('type', 'document')
        .eq('section', section)

      if (!documents) return undefined

      // Recherche par mots-clés dans les noms
      const matchingDoc = documents.find(doc => {
        const docName = doc.name.toLowerCase()
        return message.includes(docName) || docName.includes(message.substring(0, 20))
      })

      return matchingDoc?.name
    } catch (error) {
      console.error('Error detecting document:', error)
      return undefined
    }
  }

  // Calculer la confiance du ciblage
  private calculateConfidence(targetPath: TargetPath, message: string): number {
    let confidence = 0.5 // Base

    // Bonus si section détectée avec certitude
    if (this.hasSectionKeywords(message, targetPath.section)) {
      confidence += 0.2
    }

    // Bonus si dossier détecté avec certitude
    if (targetPath.folder && this.hasFolderKeywords(message, targetPath.folder)) {
      confidence += 0.2
    }

    // Bonus si document spécifique trouvé
    if (targetPath.document) {
      confidence += 0.3
    }

    return Math.min(confidence, 1.0)
  }

  // Vérifier les mots-clés de section
  private hasSectionKeywords(message: string, section: string): boolean {
    const keywords = {
      'rules': ['règle', 'rule', 'constraint', 'policy'],
      'memory': ['mémoire', 'memory', 'remember', 'stocke'],
      'optimization': ['optimis', 'performance', 'improve', 'enhance']
    }
    
    return keywords[section as keyof typeof keywords]?.some(keyword => 
      message.includes(keyword)
    ) || false
  }

  // Vérifier les mots-clés de dossier
  private hasFolderKeywords(message: string, folder: string): boolean {
    const folderKeywords = {
      'Business Logic': ['business', 'logique', 'prix', 'payment'],
      'Authentication': ['auth', 'login', 'session', 'token'],
      'API Security': ['api', 'endpoint', 'requête'],
      'Success': ['succès', 'marché', 'trouvé'],
      'Failed': ['échec', 'failed', 'pas marché']
    }

    return folderKeywords[folder as keyof typeof folderKeywords]?.some(keyword =>
      message.includes(keyword)
    ) || false
  }

  // Générer des suggestions pour le ciblage
  private async generateSuggestions(targetPath: TargetPath, message: string): Promise<string[]> {
    const suggestions: string[] = []

    // Suggestions selon le chemin ciblé
    if (targetPath.section === 'rules') {
      suggestions.push(
        `Créer une règle pour ${targetPath.folder}`,
        `Optimiser les règles ${targetPath.folder}`,
        'Analyser l\'efficacité des règles'
      )
    } else if (targetPath.section === 'memory') {
      if (targetPath.folder === 'Success') {
        suggestions.push(
          'Analyser les patterns de succès',
          'Dupliquer cette technique',
          'Créer une règle basée sur ce succès'
        )
      } else if (targetPath.folder === 'Failed') {
        suggestions.push(
          'Analyser pourquoi ça a échoué',
          'Essayer une variante',
          'Marquer cette technique comme inefficace'
        )
      } else {
        suggestions.push(
          `Ranger dans ${targetPath.folder}`,
          'Créer un nouveau tableau',
          'Analyser le contenu'
        )
      }
    } else if (targetPath.section === 'optimization') {
      suggestions.push(
        'Optimiser la performance',
        'Analyser les métriques',
        'Améliorer l\'efficacité'
      )
    }

    return suggestions
  }

  // Obtenir les règles pertinentes pour le ciblage
  private async getRelevantRules(targetPath: TargetPath): Promise<any[]> {
    try {
      const { data: rules } = await supabase
        .from('rules')
        .select('*')
        .eq('project_id', this.projectId)
        .eq('enabled', true)
        .or(`trigger.eq.*,trigger.eq.${targetPath.section},trigger.eq.${targetPath.folder}`)
        .order('priority', { ascending: true })

      return rules || []
    } catch (error) {
      console.error('Error getting relevant rules:', error)
      return []
    }
  }

  // Obtenir la mémoire pertinente pour le ciblage
  private async getRelevantMemory(targetPath: TargetPath, message: string): Promise<any[]> {
    try {
      let query = supabase
        .from('memory_nodes')
        .select('id, name, content, type')
        .eq('project_id', this.projectId)
        .eq('section', targetPath.section)

      if (targetPath.folder) {
        // Chercher dans le dossier spécifique ou ses parents
        const { data: folderNodes } = await supabase
          .from('memory_nodes')
          .select('id')
          .eq('project_id', this.projectId)
          .eq('name', targetPath.folder)
          .eq('type', 'folder')

        if (folderNodes && folderNodes.length > 0) {
          query = query.eq('parent_id', folderNodes[0].id)
        }
      }

      const { data: memoryNodes } = await query.limit(10)

      return memoryNodes || []
    } catch (error) {
      console.error('Error getting relevant memory:', error)
      return []
    }
  }

  // Exécuter une action ciblée
  async executeTargetedAction(
    action: 'create' | 'update' | 'delete' | 'move',
    targetPath: TargetPath,
    data: any
  ): Promise<boolean> {
    try {
      console.log('🎯 Executing targeted action:', action, 'on path:', targetPath)

      switch (action) {
        case 'create':
          return await this.createAtTarget(targetPath, data)
        case 'update':
          return await this.updateAtTarget(targetPath, data)
        case 'delete':
          return await this.deleteAtTarget(targetPath, data)
        case 'move':
          return await this.moveToTarget(targetPath, data)
        default:
          return false
      }
    } catch (error) {
      console.error('Error executing targeted action:', error)
      return false
    }
  }

  // Créer un élément au chemin ciblé
  private async createAtTarget(targetPath: TargetPath, data: any): Promise<boolean> {
    try {
      // Trouver ou créer le dossier parent
      let parentId = null
      
      if (targetPath.folder) {
        const { data: folder } = await supabase
          .from('memory_nodes')
          .select('id')
          .eq('project_id', this.projectId)
          .eq('name', targetPath.folder)
          .eq('type', 'folder')
          .eq('section', targetPath.section)
          .maybeSingle()

        if (folder) {
          parentId = folder.id
        } else {
          // Créer le dossier
          const { data: newFolder } = await supabase
            .from('memory_nodes')
            .insert({
              project_id: this.projectId,
              type: 'folder',
              name: targetPath.folder,
              section: targetPath.section,
              icon: '📁',
              color: '#6b7280'
            })
            .select()
            .single()

          if (newFolder) {
            parentId = newFolder.id
          }
        }
      }

      // Créer l'élément
      const { error } = await supabase
        .from('memory_nodes')
        .insert({
          project_id: this.projectId,
          type: data.type || 'document',
          name: data.name || 'Nouvel élément',
          content: data.content || {},
          section: targetPath.section,
          parent_id: parentId,
          icon: data.icon || '📄',
          color: data.color || '#6b7280'
        })

      return !error
    } catch (error) {
      console.error('Error creating at target:', error)
      return false
    }
  }

  // Mettre à jour un élément au chemin ciblé
  private async updateAtTarget(targetPath: TargetPath, data: any): Promise<boolean> {
    // Implementation pour update
    return true
  }

  // Supprimer un élément au chemin ciblé
  private async deleteAtTarget(targetPath: TargetPath, data: any): Promise<boolean> {
    // Implementation pour delete
    return true
  }

  // Déplacer vers le chemin ciblé
  private async moveToTarget(targetPath: TargetPath, data: any): Promise<boolean> {
    // Implementation pour move
    return true
  }

  // Formater le ciblage pour l'IA
  formatTargetingForAI(context: TargetingContext): string {
    const { path, confidence, suggestions, rules } = context
    
    let targeting = `CIBLAGE INTELLIGENT (Confiance: ${Math.round(confidence * 100)}%)\n`
    targeting += `Section: ${path.section}\n`
    
    if (path.folder) {
      targeting += `Dossier: ${path.folder}\n`
    }
    if (path.document) {
      targeting += `Document: ${path.document}\n`
    }

    if (rules.length > 0) {
      targeting += `\nRÈGLES APPLICABLES:\n`
      rules.forEach(rule => {
        targeting += `- ${rule.name}: ${rule.description}\n`
      })
    }

    if (suggestions.length > 0) {
      targeting += `\nSUGGESTIONS RECOMMANDÉES:\n`
      suggestions.forEach(suggestion => {
        targeting += `- ${suggestion}\n`
      })
    }

    return targeting
  }
}

// Hook pour utiliser le ciblage intelligent
export function useIntelligentTargeting(projectId: string) {
  const targeting = new IntelligentTargeting(projectId)

  const analyzeTarget = async (userMessage: string) => {
    return await targeting.analyzeTarget(userMessage)
  }

  const executeTargetedAction = async (
    action: 'create' | 'update' | 'delete' | 'move',
    targetPath: TargetPath,
    data: any
  ) => {
    return await targeting.executeTargetedAction(action, targetPath, data)
  }

  const formatTargetingForAI = (context: TargetingContext) => {
    return targeting.formatTargetingForAI(context)
  }

  return {
    analyzeTarget,
    executeTargetedAction,
    formatTargetingForAI,
    targeting
  }
}
