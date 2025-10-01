// Types pour l'intégration IA
interface AIAnalysisRequest {
  content: string
  type: 'rule' | 'memory' | 'optimization'
  context?: Record<string, unknown>
}

interface AIAnalysisResponse {
  suggestions: string[]
  improvements: string[]
  risks: string[]
  score: number
  metadata: Record<string, unknown>
}

interface BoardDataItem {
  id: string
  name: string
  content?: string
  instructions?: string
  trigger?: string
  [key: string]: unknown
}

interface BoardNode {
  id: string
  name: string
  type: 'folder' | 'document'
  section: string
  data?: BoardDataItem[]
  metadata?: Record<string, unknown>
}

// Service d'intégration IA pour le board
export class BoardAiIntegration {
  private apiKey: string | null = null
  private baseUrl: string = '/api'

  constructor() {
    // Récupérer la clé API depuis l'environnement ou le localStorage
    this.apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || null
  }

  // Analyser le contenu d'un nœud avec l'IA
  async analyzeNode(node: BoardNode): Promise<AIAnalysisResponse | null> {
    try {
      const content = this.extractContentFromNode(node)
      if (!content) {
        return null
      }

      const analysisRequest: AIAnalysisRequest = {
        content,
        type: node.section as 'rule' | 'memory' | 'optimization',
        context: {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          section: node.section,
          metadata: node.metadata
        }
      }

      const response = await fetch(`${this.baseUrl}/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisRequest)
      })

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`)
      }

      const result = await response.json()
      return result.data as AIAnalysisResponse
    } catch (error) {
      console.error('Erreur analyse IA:', error)
      return this.getFallbackAnalysis(node)
    }
  }

  // Générer des suggestions d'amélioration
  async generateSuggestions(nodes: BoardNode[]): Promise<string[]> {
    try {
      const suggestions: string[] = []

      for (const node of nodes) {
        const analysis = await this.analyzeNode(node)
        if (analysis) {
          suggestions.push(...analysis.suggestions)
        }
      }

      // Dédupliquer et limiter les suggestions
      const uniqueSuggestions = Array.from(new Set(suggestions))
      return uniqueSuggestions.slice(0, 10)
    } catch (error) {
      console.error('Erreur génération suggestions:', error)
      return this.getFallbackSuggestions()
    }
  }

  // Optimiser automatiquement un nœud
  async optimizeNode(node: BoardNode): Promise<BoardNode | null> {
    try {
      const analysis = await this.analyzeNode(node)
      if (!analysis || analysis.score > 0.8) {
        return node // Déjà optimisé
      }

      // Appliquer les améliorations suggérées
      const optimizedNode = { ...node }
      
      // Améliorer le nom si nécessaire
      if (analysis.improvements.some(imp => imp.includes('nom'))) {
        optimizedNode.name = this.improveNodeName(node.name, node.section)
      }

      // Améliorer les métadonnées
      optimizedNode.metadata = {
        ...node.metadata,
        aiOptimized: true,
        optimizationDate: new Date().toISOString(),
        originalScore: analysis.score,
        improvements: analysis.improvements
      }

      return optimizedNode
    } catch (error) {
      console.error('Erreur optimisation nœud:', error)
      return null
    }
  }

  // Détecter les doublons et conflits
  async detectConflicts(nodes: BoardNode[]): Promise<{
    duplicates: string[][]
    conflicts: string[]
    recommendations: string[]
  }> {
    try {
      const duplicates: string[][] = []
      const conflicts: string[] = []
      const recommendations: string[] = []

      // Détecter les doublons par nom
      const nameGroups = new Map<string, string[]>()
      nodes.forEach(node => {
        const normalizedName = node.name.toLowerCase().trim()
        if (!nameGroups.has(normalizedName)) {
          nameGroups.set(normalizedName, [])
        }
        nameGroups.get(normalizedName)!.push(node.id)
      })

      nameGroups.forEach((ids, name) => {
        if (ids.length > 1) {
          duplicates.push(ids)
          recommendations.push(`Fusionner les éléments dupliqués: "${name}"`)
        }
      })

      // Détecter les conflits de règles
      const ruleNodes = nodes.filter(n => n.section === 'rules')
      for (let i = 0; i < ruleNodes.length; i++) {
        for (let j = i + 1; j < ruleNodes.length; j++) {
          if (this.hasRuleConflict(ruleNodes[i], ruleNodes[j])) {
            conflicts.push(`Conflit entre "${ruleNodes[i].name}" et "${ruleNodes[j].name}"`)
          }
        }
      }

      return { duplicates, conflicts, recommendations }
    } catch (error) {
      console.error('Erreur détection conflits:', error)
      return { duplicates: [], conflicts: [], recommendations: [] }
    }
  }

  // Générer un rapport d'analyse complet
  async generateAnalysisReport(nodes: BoardNode[]): Promise<{
    summary: string
    statistics: Record<string, number>
    issues: string[]
    recommendations: string[]
    score: number
  }> {
    try {
      const statistics = {
        totalNodes: nodes.length,
        folders: nodes.filter(n => n.type === 'folder').length,
        documents: nodes.filter(n => n.type === 'document').length,
        rules: nodes.filter(n => n.section === 'rules').length,
        memory: nodes.filter(n => n.section === 'memory').length,
        optimization: nodes.filter(n => n.section === 'optimization').length
      }

      const conflicts = await this.detectConflicts(nodes)
      const suggestions = await this.generateSuggestions(nodes)

      const issues = [
        ...conflicts.conflicts,
        ...conflicts.duplicates.map(dup => `${dup.length} éléments dupliqués détectés`)
      ]

      const score = this.calculateOverallScore(nodes, issues.length)

      const summary = `Analyse de ${nodes.length} éléments. Score global: ${Math.round(score * 100)}%. ${issues.length} problèmes détectés.`

      return {
        summary,
        statistics,
        issues,
        recommendations: [...suggestions, ...conflicts.recommendations],
        score
      }
    } catch (error) {
      console.error('Erreur génération rapport:', error)
      return {
        summary: 'Erreur lors de l\'analyse',
        statistics: {},
        issues: ['Erreur lors de l\'analyse'],
        recommendations: [],
        score: 0
      }
    }
  }

  // Méthodes utilitaires privées
  private extractContentFromNode(node: BoardNode): string {
    let content = node.name + '\n'
    
    if (node.data && Array.isArray(node.data)) {
      node.data.forEach(item => {
        if (item.content) content += item.content + '\n'
        if (item.instructions) content += item.instructions + '\n'
        if (item.name) content += item.name + '\n'
      })
    }

    return content.trim()
  }

  private getFallbackAnalysis(node: BoardNode): AIAnalysisResponse {
    return {
      suggestions: [
        'Ajouter plus de détails au contenu',
        'Améliorer la structure des données',
        'Ajouter des métadonnées descriptives'
      ],
      improvements: [
        'Clarifier le nom de l\'élément',
        'Organiser le contenu en sections',
        'Ajouter des tags pour la recherche'
      ],
      risks: [
        'Contenu insuffisant',
        'Structure peu claire'
      ],
      score: 0.6,
      metadata: {
        fallback: true,
        timestamp: new Date().toISOString()
      }
    }
  }

  private getFallbackSuggestions(): string[] {
    return [
      'Organiser les éléments par catégories',
      'Ajouter des descriptions détaillées',
      'Utiliser des noms plus descriptifs',
      'Créer une hiérarchie logique',
      'Ajouter des métadonnées pour la recherche'
    ]
  }

  private improveNodeName(name: string, section: string): string {
    const prefixes = {
      rules: '📋 Règle:',
      memory: '🧠 Mémoire:',
      optimization: '⚡ Optim:'
    }

    const prefix = prefixes[section as keyof typeof prefixes] || ''
    return name.startsWith(prefix) ? name : `${prefix} ${name}`
  }

  private hasRuleConflict(node1: BoardNode, node2: BoardNode): boolean {
    // Logique simplifiée de détection de conflits
    if (!node1.data || !node2.data) return false
    
    const triggers1 = node1.data.map(d => d.trigger).filter(Boolean)
    const triggers2 = node2.data.map(d => d.trigger).filter(Boolean)
    
    return triggers1.some(t1 => triggers2.some(t2 => t1 === t2))
  }

  private calculateOverallScore(nodes: BoardNode[], issuesCount: number): number {
    const baseScore = 0.8
    const penaltyPerIssue = 0.1
    const bonusForOrganization = nodes.filter(n => n.type === 'folder').length * 0.05
    
    return Math.max(0, Math.min(1, baseScore - (issuesCount * penaltyPerIssue) + bonusForOrganization))
  }
}

// Instance singleton
export const boardAiIntegration = new BoardAiIntegration()

// Fonctions utilitaires exportées
export async function analyzeBoard(nodes: BoardNode[]) {
  return await boardAiIntegration.generateAnalysisReport(nodes)
}

export async function optimizeBoard(nodes: BoardNode[]) {
  const optimizedNodes = []
  for (const node of nodes) {
    const optimized = await boardAiIntegration.optimizeNode(node)
    optimizedNodes.push(optimized || node)
  }
  return optimizedNodes
}

export async function detectBoardIssues(nodes: BoardNode[]) {
  return await boardAiIntegration.detectConflicts(nodes)
}
