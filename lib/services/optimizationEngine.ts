import { createClient } from '@supabase/supabase-js'

interface Pattern {
  type: 'usage' | 'query' | 'error' | 'navigation'
  frequency: number
  context: string
  data: any
}

interface OptimizationSuggestion {
  type: 'storage' | 'rule' | 'improvement' | 'pattern'
  confidence: number
  suggestion: {
    title: string
    description: string
    category?: string
    impact?: 'high' | 'medium' | 'low'
    data?: any
  }
  metadata?: {
    source?: string
    timestamp?: string
    related?: string[]
  }
}

export class OptimizationEngine {
  private supabase: any
  private projectId: string
  private patterns: Map<string, Pattern[]> = new Map()
  private learningHistory: any[] = []

  constructor(projectId: string) {
    this.projectId = projectId
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  /**
   * Analyze conversation for patterns and generate suggestions
   */
  async analyzeConversation(messages: any[]): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []

    // Detect repeated queries that could be stored
    const queryPatterns = this.detectRepeatedQueries(messages)
    for (const pattern of queryPatterns) {
      if (pattern.frequency > 3) {
        suggestions.push({
          type: 'storage',
          confidence: Math.min(0.95, 0.7 + (pattern.frequency * 0.05)),
          suggestion: {
            title: `Auto-save frequent query: "${pattern.query.substring(0, 50)}..."`,
            description: `This query has been asked ${pattern.frequency} times. Consider saving it as a memory node for quick access.`,
            category: pattern.category || 'general',
            impact: pattern.frequency > 5 ? 'high' : 'medium',
            data: {
              query: pattern.query,
              suggestedPath: pattern.suggestedPath,
              content: pattern.bestResponse
            }
          },
          metadata: {
            source: 'query_analysis',
            timestamp: new Date().toISOString(),
            related: pattern.relatedQueries
          }
        })
      }
    }

    // Detect command patterns that could become rules
    const commandPatterns = this.detectCommandPatterns(messages)
    for (const pattern of commandPatterns) {
      if (pattern.confidence > 0.7) {
        suggestions.push({
          type: 'rule',
          confidence: pattern.confidence,
          suggestion: {
            title: `New rule pattern: ${pattern.trigger}`,
            description: `Detected pattern: When "${pattern.trigger}" then "${pattern.action}". This could improve response time.`,
            impact: 'medium',
            data: {
              name: pattern.suggestedName,
              trigger: pattern.trigger,
              action: pattern.action,
              folder_targets: pattern.contexts || []
            }
          },
          metadata: {
            source: 'pattern_detection',
            timestamp: new Date().toISOString()
          }
        })
      }
    }

    // Detect inefficient rules that could be improved
    const ruleImprovements = await this.analyzeRuleEfficiency()
    for (const improvement of ruleImprovements) {
      suggestions.push({
        type: 'improvement',
        confidence: improvement.confidence,
        suggestion: {
          title: `Optimize rule: ${improvement.ruleName}`,
          description: improvement.reason,
          impact: improvement.impact,
          data: improvement.suggestedChanges
        },
        metadata: {
          source: 'rule_analysis',
          timestamp: new Date().toISOString(),
          related: [improvement.ruleId]
        }
      })
    }

    return suggestions
  }

  /**
   * Detect repeated queries in conversation history
   */
  private detectRepeatedQueries(messages: any[]): any[] {
    const queryMap = new Map<string, any>()

    messages.forEach(msg => {
      if (msg.role === 'user') {
        const normalized = this.normalizeQuery(msg.content)
        const existing = queryMap.get(normalized)

        if (existing) {
          existing.frequency++
          existing.timestamps.push(msg.timestamp)
        } else {
          queryMap.set(normalized, {
            query: msg.content,
            frequency: 1,
            timestamps: [msg.timestamp],
            category: this.categorizeQuery(msg.content),
            suggestedPath: this.suggestPath(msg.content),
            bestResponse: this.findBestResponse(messages, msg)
          })
        }
      }
    })

    return Array.from(queryMap.values()).filter(q => q.frequency > 1)
  }

  /**
   * Detect command patterns from user interactions
   */
  private detectCommandPatterns(messages: any[]): any[] {
    const patterns: any[] = []
    const commandSequences = new Map<string, any>()

    // Group messages by context windows
    for (let i = 0; i < messages.length - 1; i++) {
      if (messages[i].role === 'user') {
        const trigger = this.extractTrigger(messages[i].content)
        const action = this.extractAction(messages[i + 1]?.content)

        if (trigger && action) {
          const key = `${trigger}::${action}`
          if (commandSequences.has(key)) {
            commandSequences.get(key).count++
          } else {
            commandSequences.set(key, {
              trigger,
              action,
              count: 1,
              contexts: this.extractContexts(messages, i)
            })
          }
        }
      }
    }

    // Convert to patterns with confidence scores
    commandSequences.forEach(seq => {
      if (seq.count >= 2) {
        patterns.push({
          trigger: seq.trigger,
          action: seq.action,
          confidence: Math.min(0.95, 0.6 + (seq.count * 0.1)),
          suggestedName: this.generateRuleName(seq.trigger, seq.action),
          contexts: seq.contexts
        })
      }
    })

    return patterns
  }

  /**
   * Analyze existing rules for efficiency improvements
   */
  private async analyzeRuleEfficiency(): Promise<any[]> {
    const improvements: any[] = []

    try {
      // Load existing rules
      const { data: rules } = await this.supabase
        .from('rules')
        .select('*')
        .eq('project_id', this.projectId)

      if (!rules) return improvements

      for (const rule of rules) {
        // Check for overlapping triggers
        const overlapping = rules.filter(r =>
          r.id !== rule.id &&
          this.triggersOverlap(rule.trigger, r.trigger)
        )

        if (overlapping.length > 0) {
          improvements.push({
            ruleId: rule.id,
            ruleName: rule.name,
            confidence: 0.8,
            impact: 'medium',
            reason: `This rule overlaps with ${overlapping.length} other rule(s). Consider merging or refining triggers.`,
            suggestedChanges: {
              merge_with: overlapping.map(r => r.id),
              refined_trigger: this.refineTrigger(rule.trigger, overlapping.map(r => r.trigger))
            }
          })
        }

        // Check for unused rules
        if (rule.last_used && this.daysSince(rule.last_used) > 30) {
          improvements.push({
            ruleId: rule.id,
            ruleName: rule.name,
            confidence: 0.7,
            impact: 'low',
            reason: `This rule hasn't been used in ${this.daysSince(rule.last_used)} days. Consider archiving or updating.`,
            suggestedChanges: {
              action: 'archive'
            }
          })
        }

        // Check for performance issues
        if (rule.metadata?.avg_execution_time > 1000) {
          improvements.push({
            ruleId: rule.id,
            ruleName: rule.name,
            confidence: 0.85,
            impact: 'high',
            reason: `This rule takes ${rule.metadata.avg_execution_time}ms on average. Consider optimizing the action.`,
            suggestedChanges: {
              optimize_action: true,
              suggested_optimization: this.suggestActionOptimization(rule.action)
            }
          })
        }
      }
    } catch (error) {
      console.error('Error analyzing rules:', error)
    }

    return improvements
  }

  /**
   * Store accepted suggestion and learn from it
   */
  async acceptSuggestion(suggestionId: string, suggestion: OptimizationSuggestion): Promise<void> {
    // Update learning history
    this.learningHistory.push({
      timestamp: new Date().toISOString(),
      type: suggestion.type,
      confidence: suggestion.confidence,
      accepted: true,
      impact: await this.measureImpact(suggestion)
    })

    // Apply the suggestion based on type
    switch (suggestion.type) {
      case 'storage':
        await this.createMemoryNode(suggestion.suggestion.data)
        break
      case 'rule':
        await this.createRule(suggestion.suggestion.data)
        break
      case 'improvement':
        await this.applyRuleImprovement(suggestion.suggestion.data)
        break
      case 'pattern':
        await this.recordPattern(suggestion.suggestion.data)
        break
    }

    // Update confidence thresholds based on success
    await this.updateConfidenceModel()
  }

  /**
   * Helper methods
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private categorizeQuery(query: string): string {
    const categories = {
      'security': ['security', 'auth', 'permission', 'access'],
      'api': ['api', 'endpoint', 'request', 'response'],
      'database': ['database', 'query', 'table', 'schema'],
      'testing': ['test', 'debug', 'check', 'verify'],
      'documentation': ['doc', 'explain', 'how', 'what']
    }

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => query.toLowerCase().includes(keyword))) {
        return category
      }
    }

    return 'general'
  }

  private suggestPath(query: string): string {
    const category = this.categorizeQuery(query)
    const timestamp = new Date().toISOString().split('T')[0]
    return `/${category}/${timestamp}/${this.slugify(query.substring(0, 30))}`
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  private findBestResponse(messages: any[], query: any): string {
    const index = messages.indexOf(query)
    if (index < messages.length - 1 && messages[index + 1].role === 'assistant') {
      return messages[index + 1].content
    }
    return ''
  }

  private extractTrigger(content: string): string {
    // Extract trigger patterns from user messages
    const patterns = [
      /when\s+(.+?)(?:\s+then|$)/i,
      /if\s+(.+?)(?:\s+then|$)/i,
      /^(.+?)\s*\?$/,
      /^(show|get|find|list|create|update|delete)\s+(.+)/i
    ]

    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }

    return content.substring(0, 50)
  }

  private extractAction(content: string): string {
    if (!content) return ''
    return content.substring(0, 100)
  }

  private extractContexts(messages: any[], index: number): string[] {
    const contexts: string[] = []
    const window = 3

    for (let i = Math.max(0, index - window); i <= Math.min(messages.length - 1, index + window); i++) {
      if (messages[i].metadata?.folder) {
        contexts.push(messages[i].metadata.folder)
      }
    }

    return [...new Set(contexts)]
  }

  private generateRuleName(trigger: string, action: string): string {
    const triggerWords = trigger.split(' ').slice(0, 3).join('_')
    return `auto_${triggerWords}_rule`.toLowerCase()
  }

  private triggersOverlap(trigger1: string, trigger2: string): boolean {
    const words1 = new Set(trigger1.toLowerCase().split(/\s+/))
    const words2 = new Set(trigger2.toLowerCase().split(/\s+/))
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    return intersection.size > Math.min(words1.size, words2.size) * 0.5
  }

  private refineTrigger(mainTrigger: string, overlappingTriggers: string[]): string {
    // Find unique words in main trigger
    const mainWords = new Set(mainTrigger.toLowerCase().split(/\s+/))
    const otherWords = new Set()

    overlappingTriggers.forEach(trigger => {
      trigger.toLowerCase().split(/\s+/).forEach(word => otherWords.add(word))
    })

    const uniqueWords = [...mainWords].filter(word => !otherWords.has(word))
    return uniqueWords.join(' ') || mainTrigger
  }

  private daysSince(date: string): number {
    const diff = Date.now() - new Date(date).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  private suggestActionOptimization(action: string): string {
    // Suggest caching, indexing, or simplification
    if (action.includes('SELECT') || action.includes('query')) {
      return 'Consider adding caching or indexing for frequently accessed data'
    }
    if (action.length > 500) {
      return 'Consider breaking this action into smaller, reusable components'
    }
    return 'Review for performance optimizations'
  }

  private async measureImpact(suggestion: OptimizationSuggestion): Promise<number> {
    // Measure impact based on type and expected improvements
    switch (suggestion.type) {
      case 'storage':
        return 0.3 // 30% improvement in response time for cached queries
      case 'rule':
        return 0.5 // 50% improvement in automation
      case 'improvement':
        return 0.2 // 20% general improvement
      default:
        return 0.1
    }
  }

  private async createMemoryNode(data: any): Promise<void> {
    await this.supabase.from('memory_nodes').insert({
      project_id: this.projectId,
      path: data.suggestedPath,
      name: data.suggestedPath.split('/').pop(),
      type: 'file',
      content: data.content,
      metadata: {
        auto_created: true,
        source: 'optimization_engine',
        query: data.query
      }
    })
  }

  private async createRule(data: any): Promise<void> {
    await this.supabase.from('rules').insert({
      project_id: this.projectId,
      name: data.name,
      trigger: data.trigger,
      action: data.action,
      folder_targets: data.folder_targets,
      priority: 3,
      active: true,
      metadata: {
        auto_created: true,
        source: 'optimization_engine'
      }
    })
  }

  private async applyRuleImprovement(data: any): Promise<void> {
    // Implementation depends on the specific improvement
    console.log('Applying rule improvement:', data)
  }

  private async recordPattern(data: any): Promise<void> {
    // Store pattern for future learning
    this.patterns.set(data.id, data.patterns)
  }

  private async updateConfidenceModel(): Promise<void> {
    // Adjust confidence thresholds based on acceptance history
    const recentHistory = this.learningHistory.slice(-50)
    const acceptanceRate = recentHistory.filter(h => h.accepted).length / recentHistory.length

    if (acceptanceRate > 0.9) {
      // Lower thresholds slightly if high acceptance
      console.log('High acceptance rate, adjusting confidence model')
    } else if (acceptanceRate < 0.5) {
      // Raise thresholds if low acceptance
      console.log('Low acceptance rate, adjusting confidence model')
    }
  }

  /**
   * Queue a new suggestion for review
   */
  async queueSuggestion(suggestion: OptimizationSuggestion): Promise<void> {
    await this.supabase.from('suggestions_queue').insert({
      project_id: this.projectId,
      type: suggestion.type,
      confidence: suggestion.confidence,
      suggestion: suggestion.suggestion,
      metadata: suggestion.metadata,
      status: 'pending'
    })
  }
}