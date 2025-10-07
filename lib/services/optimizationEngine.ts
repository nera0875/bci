import { supabase } from '@/lib/supabase/client'

interface Pattern {
  type: 'usage' | 'query' | 'error' | 'navigation'
  frequency: number
  context: string
  data: any
}

interface OptimizationSuggestion {
  type: 'storage' | 'rule' | 'improvement' | 'pattern' | 'test_bizlogic'
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
  private projectId: string
  private patterns: Map<string, Pattern[]> = new Map()
  private learningHistory: any[] = []

  constructor(projectId: string) {
    this.projectId = projectId
    // Utilise le client Supabase partagé au lieu d'en créer un nouveau
  }

  /**
   * Analyze memory nodes (Success/Failed) to suggest new rules
   */
  async analyzeMemoryPatterns(): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []

    try {
      // Charger les Success/Failed nodes (sans filtre category qui n'existe pas)
      const { data: successNodes } = await supabase
        .from('memory_nodes')
        .select('*')
        .eq('project_id', this.projectId)
        .eq('section', 'memory')
        .ilike('name', '%success%')
        .order('created_at', { ascending: false })
        .limit(20)

      const { data: failedNodes } = await supabase
        .from('memory_nodes')
        .select('*')
        .eq('project_id', this.projectId)
        .eq('section', 'memory')
        .ilike('name', '%failed%')
        .order('created_at', { ascending: false })
        .limit(20)

      // Analyser les patterns dans Success pour suggérer des rules positives
      if (successNodes && successNodes.length > 0) {
        const successPatterns = this.extractPatternsFromMemory(successNodes, 'success')
        for (const pattern of successPatterns) {
          if (pattern.frequency >= 3) {
            suggestions.push({
              type: 'rule',
              confidence: Math.min(0.95, 0.6 + (pattern.frequency * 0.1)),
              suggestion: {
                title: `Success Pattern: ${pattern.attackType}`,
                description: `Detected ${pattern.frequency} successful ${pattern.attackType} attacks. Create rule to automate this pattern.`,
                category: pattern.attackType,
                impact: pattern.frequency >= 5 ? 'high' : 'medium',
                data: {
                  name: `Auto: ${pattern.attackType} Success Pattern`,
                  trigger: pattern.trigger,
                  action: JSON.stringify([
                    { type: 'http', payload: pattern.payload },
                    { type: 'validate', payload: 'status:200' },
                    { type: 'store', payload: `${pattern.attackType}_result.md` }
                  ]),
                  metadata: {
                    source: 'memory_analysis',
                    attack_type: pattern.attackType,
                    sample_payload: pattern.payload
                  }
                }
              },
              metadata: {
                source: 'memory_success_analysis',
                timestamp: new Date().toISOString(),
                related: pattern.relatedNodes
              }
            })
          }
        }
      }

      // Analyser les patterns dans Failed pour suggérer des protections
      if (failedNodes && failedNodes.length > 0) {
        const failedPatterns = this.extractPatternsFromMemory(failedNodes, 'failed')
        for (const pattern of failedPatterns) {
          if (pattern.frequency >= 3) {
            suggestions.push({
              type: 'improvement',
              confidence: 0.75,
              suggestion: {
                title: `Failed Pattern: ${pattern.attackType}`,
                description: `Detected ${pattern.frequency} failed ${pattern.attackType} attempts. Review these failures to improve testing strategy.`,
                category: pattern.attackType,
                impact: 'medium',
                data: {
                  attack_type: pattern.attackType,
                  common_errors: pattern.errors,
                  suggested_fix: pattern.suggestedFix
                }
              },
              metadata: {
                source: 'memory_failed_analysis',
                timestamp: new Date().toISOString()
              }
            })
          }
        }
      }
    } catch (error) {
      console.error('Error analyzing memory patterns:', error)
    }

    return suggestions
  }

  /**
   * Parse HTTP request from raw text (Burp format)
   */
  private parseHTTPRequest(text: string): any {
    const httpPattern = /(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^\s]+)\s+HTTP\/[\d.]+/
    const match = text.match(httpPattern)

    if (!match) return null

    const method = match[1]
    const url = match[2]

    // Extract headers (between HTTP line and body)
    const headersMatch = text.match(/HTTP.*?\n([\s\S]*?)\n\n/)
    const headers: Record<string, string> = {}
    if (headersMatch) {
      headersMatch[1].split('\n').forEach(line => {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim()
          const value = line.substring(colonIndex + 1).trim()
          if (key) headers[key] = value
        }
      })
    }

    // Extract body (after double newline)
    const bodyMatch = text.match(/\n\n([\s\S]+)/)
    const body = bodyMatch?.[1]?.trim() || ''

    // Detect attack category from URL and body
    let category = 'unknown'
    const combined = `${url} ${body}`.toLowerCase()

    if (url.match(/checkout|payment|cart|order/i)) category = 'payment_manipulation'
    else if (body.match(/qty|quantity|price|amount/) && body.match(/-\d+|0\.\d+/)) category = 'payment_manipulation'
    else if (url.match(/promo|coupon|discount/i)) category = 'workflow_bypass'
    else if (body.match(/<script|javascript:|onerror=/i)) category = 'xss'
    else if (body.match(/'\s*or|union\s+select|;drop/i)) category = 'sqli'
    else if (url.match(/\/admin|\/user\/\d+/)) category = 'privilege_escalation'

    return {
      method,
      url,
      headers,
      body,
      category,
      raw_request: text
    }
  }

  /**
   * Extract attack patterns from memory nodes
   */
  private extractPatternsFromMemory(nodes: any[], type: 'success' | 'failed') {
    const patternMap = new Map<string, any>()

    for (const node of nodes) {
      const content = typeof node.content === 'string' ? node.content : ''

      // Détecter le type d'attaque depuis le contenu
      let attackType = 'Unknown'
      if (content.match(/idor|insecure direct object/i)) attackType = 'IDOR'
      else if (content.match(/sql injection|sqli/i)) attackType = 'SQL Injection'
      else if (content.match(/xss|cross-site scripting/i)) attackType = 'XSS'
      else if (content.match(/csrf|cross-site request/i)) attackType = 'CSRF'
      else if (content.match(/business logic/i)) attackType = 'Business Logic'
      else if (content.match(/race condition/i)) attackType = 'Race Condition'

      // Extraire payload depuis code blocks
      const payloadMatch = content.match(/```(?:http|bash|python)?\n([\s\S]+?)\n```/)
      const payload = payloadMatch ? payloadMatch[1].trim() : ''

      // Extraire trigger pattern
      const endpointMatch = content.match(/endpoint.*?[:：]\s*(.+)/i) ||
                           content.match(/GET|POST|PUT|DELETE\s+([^\s]+)/i)
      const trigger = endpointMatch ? `endpoint matches "${endpointMatch[1].trim()}"` : 'manual'

      // Extraire erreurs (pour failed)
      const errorMatch = content.match(/error.*?[:：]\s*(.+)/i) ||
                        content.match(/failed.*?[:：]\s*(.+)/i)
      const error = errorMatch ? errorMatch[1].trim() : ''

      // Grouper par attack type
      if (!patternMap.has(attackType)) {
        patternMap.set(attackType, {
          attackType,
          frequency: 0,
          trigger,
          payload,
          errors: [] as string[],
          relatedNodes: [] as string[],
          suggestedFix: ''
        })
      }

      const pattern = patternMap.get(attackType)!
      pattern.frequency++
      pattern.relatedNodes.push(node.id)
      if (error && type === 'failed') {
        pattern.errors.push(error)
      }

      // Suggérer fix basé sur erreurs communes
      if (type === 'failed' && pattern.errors.length > 0) {
        if (pattern.errors.some(e => e.match(/401|unauthorized/i))) {
          pattern.suggestedFix = 'Check authentication headers and token validity'
        } else if (pattern.errors.some(e => e.match(/403|forbidden/i))) {
          pattern.suggestedFix = 'Review authorization logic and user permissions'
        } else if (pattern.errors.some(e => e.match(/404|not found/i))) {
          pattern.suggestedFix = 'Verify endpoint URL and resource existence'
        } else {
          pattern.suggestedFix = 'Review request parameters and payload format'
        }
      }
    }

    return Array.from(patternMap.values())
  }

  /**
   * Analyze conversation for patterns and generate suggestions
   */
  async analyzeConversation(messages: any[]): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []

    // Ajouter les suggestions depuis l'analyse mémoire
    const memorysuggestions = await this.analyzeMemoryPatterns()
    suggestions.push(...memorysuggestions)

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
      const { data: rules } = await supabase
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
      case 'test_bizlogic':
        await this.createMemoryFact(suggestion.suggestion.data)
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
    await supabase.from('memory_nodes').insert({
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
    await supabase.from('rules').insert({
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

  private async createMemoryFact(data: any): Promise<void> {
    await supabase.from('memory_facts').insert({
      project_id: this.projectId,
      fact: `${data.test_type} test on ${data.endpoint}`,
      metadata: {
        type: 'test_result',
        technique: data.test_type,
        endpoint: data.endpoint,
        method: data.method,
        category: data.bizlogic_category,
        severity: data.impact,
        confidence: 1.0,
        params: {
          payload_suggestion: data.payload_suggestion,
          expected_result: data.expected_result,
          burp_tip: data.burp_tip
        },
        tags: [data.bizlogic_category, data.test_type]
      }
    })
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
    await supabase.from('suggestions_queue').insert({
      project_id: this.projectId,
      type: suggestion.type,
      confidence: suggestion.confidence,
      suggestion: suggestion.suggestion,
      metadata: suggestion.metadata,
      status: 'pending'
    })
  }

  /**
   * Analyze user message for HTTP requests (Burp format)
   * Auto-queue parsed requests to suggestions_queue
   */
  async analyzeHTTPRequests(message: string): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []

    // Detect if message contains HTTP request(s)
    const httpMatches = message.matchAll(/(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+[^\s]+\s+HTTP\/[\d.]+[\s\S]*?(?=\n(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)|$)/g)

    for (const match of httpMatches) {
      const httpText = match[0]
      const parsed = this.parseHTTPRequest(httpText)

      if (parsed) {
        const suggestion: OptimizationSuggestion = {
          type: 'pattern',
          confidence: 1.0,
          suggestion: {
            title: `HTTP Request: ${parsed.method} ${parsed.url}`,
            description: `Captured Burp request for analysis`,
            category: parsed.category,
            impact: parsed.category === 'payment_manipulation' ? 'high' : 'medium',
            data: {
              endpoint: parsed.url,
              http_method: parsed.method,
              http_headers: parsed.headers,
              http_body: parsed.body,
              detected_category: parsed.category,
              raw_request: parsed.raw_request
            }
          },
          metadata: {
            source: 'burp_request_parser',
            timestamp: new Date().toISOString()
          }
        }

        suggestions.push(suggestion)
        await this.queueSuggestion(suggestion)
      }
    }

    return suggestions
  }

  /**
   * Analyze AI response for vulnerability indicators
   * Auto-queue detected vulnerabilities
   */
  async analyzeAIResponse(response: string, userMessage: string): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []

    // Detect vulnerability keywords
    const vulnPatterns = [
      { pattern: /vulnerable|vulnerability|exploit/i, severity: 'high' },
      { pattern: /critical|severe|dangerous/i, severity: 'critical' },
      { pattern: /potential.*issue|might.*work|could.*bypass/i, severity: 'medium' },
      { pattern: /race condition|timing attack/i, severity: 'high' },
      { pattern: /business logic|workflow.*bypass/i, severity: 'high' }
    ]

    for (const { pattern, severity } of vulnPatterns) {
      if (response.match(pattern)) {
        // Extract the relevant sentence
        const sentences = response.split(/[.!?]\s+/)
        const relevantSentence = sentences.find(s => pattern.test(s)) || ''

        const suggestion: OptimizationSuggestion = {
          type: 'pattern',
          confidence: severity === 'critical' ? 0.95 : 0.85,
          suggestion: {
            title: `Potential Vulnerability Detected`,
            description: relevantSentence.substring(0, 200),
            category: 'vulnerability_detected',
            impact: severity as any,
            data: {
              ai_analysis: relevantSentence,
              user_context: userMessage.substring(0, 200),
              severity
            }
          },
          metadata: {
            source: 'ai_response_analyzer',
            timestamp: new Date().toISOString()
          }
        }

        suggestions.push(suggestion)
        await this.queueSuggestion(suggestion)
        break // Only queue once per response
      }
    }

    return suggestions
  }

  /**
   * Suggest BizLogic tests based on HTTP request context
   * This generates intelligent test suggestions based on detected patterns
   */
  async suggestBizLogicTests(httpRequest: any): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []
    const { method, url, body, category } = httpRequest

    // Load existing memory_facts to avoid duplicate suggestions
    const { data: existingFacts } = await supabase
      .from('memory_facts')
      .select('metadata')
      .eq('project_id', this.projectId)
      .limit(50)

    const testedEndpoints = new Set(
      existingFacts?.map(f => f.metadata?.endpoint).filter(Boolean) || []
    )

    // Payment Manipulation Tests
    if (category === 'payment_manipulation' || url.match(/checkout|payment|cart|order/i)) {
      // Suggest negative price test
      if (body.match(/price|amount|total/i) && !testedEndpoints.has(`${url}:negative_price`)) {
        suggestions.push({
          type: 'test_bizlogic',
          confidence: 0.9,
          suggestion: {
            title: '💰 Test Negative Price Manipulation',
            description: `Try setting price/amount to negative values (-1, -999.99) on ${url}`,
            category: 'payment_manipulation',
            impact: 'high',
            data: {
              test_type: 'negative_price',
              endpoint: url,
              method,
              payload_suggestion: body.replace(/("price":\s*)\d+/, '$1-999.99'),
              expected_result: 'Server should reject negative prices',
              bizlogic_category: 'payment_manipulation'
            }
          },
          metadata: {
            source: 'bizlogic_test_suggester',
            timestamp: new Date().toISOString()
          }
        })
      }

      // Suggest race condition test
      if (url.match(/checkout|purchase|confirm/i) && !testedEndpoints.has(`${url}:race_condition`)) {
        suggestions.push({
          type: 'test_bizlogic',
          confidence: 0.85,
          suggestion: {
            title: '⏱️ Test Race Condition on Checkout',
            description: `Send multiple simultaneous ${method} requests to ${url} to test for race conditions`,
            category: 'race_condition',
            impact: 'high',
            data: {
              test_type: 'race_condition',
              endpoint: url,
              method,
              payload_suggestion: body,
              expected_result: 'Only one transaction should succeed',
              bizlogic_category: 'race_condition',
              burp_tip: 'Use Burp Repeater → Send to Intruder → Null payloads × 20 → Attack type: Pitchfork'
            }
          },
          metadata: {
            source: 'bizlogic_test_suggester',
            timestamp: new Date().toISOString()
          }
        })
      }
    }

    // Workflow Bypass Tests
    if (category === 'workflow_bypass' || url.match(/coupon|promo|discount/i)) {
      // Suggest multiple coupon application
      if ((url.match(/coupon|promo/i) || body.match(/coupon|promo/i)) && !testedEndpoints.has(`${url}:multiple_coupons`)) {
        suggestions.push({
          type: 'test_bizlogic',
          confidence: 0.88,
          suggestion: {
            title: '🎟️ Test Multiple Coupon Application',
            description: `Try applying the same coupon multiple times or stacking different coupons`,
            category: 'workflow_bypass',
            impact: 'high',
            data: {
              test_type: 'multiple_coupons',
              endpoint: url,
              method,
              payload_suggestion: 'Add coupon parameter multiple times or send multiple requests',
              expected_result: 'Coupon should only apply once',
              bizlogic_category: 'workflow_bypass'
            }
          },
          metadata: {
            source: 'bizlogic_test_suggester',
            timestamp: new Date().toISOString()
          }
        })
      }

      // Suggest workflow step bypass
      if (url.match(/step|stage|confirm/i) && !testedEndpoints.has(`${url}:workflow_bypass`)) {
        suggestions.push({
          type: 'test_bizlogic',
          confidence: 0.82,
          suggestion: {
            title: '⚙️ Test Workflow Step Bypass',
            description: `Try skipping previous steps and directly accessing ${url}`,
            category: 'workflow_bypass',
            impact: 'medium',
            data: {
              test_type: 'workflow_bypass',
              endpoint: url,
              method,
              payload_suggestion: 'Send request without completing previous steps',
              expected_result: 'Server should enforce step order',
              bizlogic_category: 'workflow_bypass'
            }
          },
          metadata: {
            source: 'bizlogic_test_suggester',
            timestamp: new Date().toISOString()
          }
        })
      }
    }

    // Privilege Escalation Tests
    if (category === 'privilege_escalation' || url.match(/\/admin|\/user\/\d+|\/profile/i)) {
      // Suggest IDOR test
      if (url.match(/\/\d+/) && !testedEndpoints.has(`${url}:idor`)) {
        suggestions.push({
          type: 'test_bizlogic',
          confidence: 0.9,
          suggestion: {
            title: '🔐 Test IDOR (Insecure Direct Object Reference)',
            description: `Try changing user ID in ${url} to access other users' data`,
            category: 'privilege_escalation',
            impact: 'high',
            data: {
              test_type: 'idor',
              endpoint: url,
              method,
              payload_suggestion: 'Replace user ID with: your_id-1, your_id+1, 1, 999',
              expected_result: 'Should only access own resources',
              bizlogic_category: 'privilege_escalation'
            }
          },
          metadata: {
            source: 'bizlogic_test_suggester',
            timestamp: new Date().toISOString()
          }
        })
      }

      // Suggest privilege escalation via parameter
      if (body.match(/role|admin|level|permission/i) && !testedEndpoints.has(`${url}:privilege_param`)) {
        suggestions.push({
          type: 'test_bizlogic',
          confidence: 0.85,
          suggestion: {
            title: '🔓 Test Privilege Escalation via Parameter',
            description: `Try modifying role/permission parameters to escalate privileges`,
            category: 'privilege_escalation',
            impact: 'critical',
            data: {
              test_type: 'privilege_escalation',
              endpoint: url,
              method,
              payload_suggestion: body.replace(/("role":\s*")user(")/i, '$1admin$2'),
              expected_result: 'Server should validate authorization',
              bizlogic_category: 'privilege_escalation'
            }
          },
          metadata: {
            source: 'bizlogic_test_suggester',
            timestamp: new Date().toISOString()
          }
        })
      }
    }

    // Quantity/Resource Abuse Tests
    if (body.match(/qty|quantity|amount/i)) {
      if (!testedEndpoints.has(`${url}:negative_qty`)) {
        suggestions.push({
          type: 'test_bizlogic',
          confidence: 0.87,
          suggestion: {
            title: '📦 Test Negative Quantity',
            description: `Try negative quantity values to manipulate stock or pricing`,
            category: 'resource_abuse',
            impact: 'high',
            data: {
              test_type: 'negative_quantity',
              endpoint: url,
              method,
              payload_suggestion: body.replace(/("qty":\s*)\d+/, '$1-10'),
              expected_result: 'Server should reject negative quantities',
              bizlogic_category: 'resource_abuse'
            }
          },
          metadata: {
            source: 'bizlogic_test_suggester',
            timestamp: new Date().toISOString()
          }
        })
      }

      if (!testedEndpoints.has(`${url}:overflow_qty`)) {
        suggestions.push({
          type: 'test_bizlogic',
          confidence: 0.8,
          suggestion: {
            title: '♾️ Test Integer Overflow on Quantity',
            description: `Try extremely large quantity values (999999, 2147483647)`,
            category: 'resource_abuse',
            impact: 'medium',
            data: {
              test_type: 'integer_overflow',
              endpoint: url,
              method,
              payload_suggestion: body.replace(/("qty":\s*)\d+/, '$12147483647'),
              expected_result: 'Server should handle large numbers properly',
              bizlogic_category: 'resource_abuse'
            }
          },
          metadata: {
            source: 'bizlogic_test_suggester',
            timestamp: new Date().toISOString()
          }
        })
      }
    }

    return suggestions
  }
}