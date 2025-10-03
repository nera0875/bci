import { supabase } from '@/lib/supabase/client'

interface Pattern {
  type: string
  context: string
  content: string
  technique?: string
  timestamp: string
}

interface DetectedPattern {
  pattern: string
  occurrences: number
  contexts: string[]
  lastSeen: string
  suggestedRule?: {
    name: string
    trigger: string
    action: string
    priority: number
  }
}

class PatternDetector {
  private patterns: Map<string, Pattern[]> = new Map()
  private detectionThreshold = 3 // Minimum occurrences to suggest a rule

  /**
   * Record a new pattern from user interaction
   */
  async recordPattern(projectId: string, pattern: Pattern) {
    const key = `${projectId}:${pattern.context}`

    if (!this.patterns.has(key)) {
      this.patterns.set(key, [])
    }

    this.patterns.get(key)!.push(pattern)

    // Check if we should suggest a rule
    const detected = this.detectRecurringPatterns(key)

    if (detected.length > 0) {
      return detected[0] // Return the most relevant pattern
    }

    return null
  }

  /**
   * Detect recurring patterns that could become rules
   */
  private detectRecurringPatterns(key: string): DetectedPattern[] {
    const patterns = this.patterns.get(key) || []

    if (patterns.length < this.detectionThreshold) {
      return []
    }

    // Group patterns by similarity
    const grouped = new Map<string, Pattern[]>()

    patterns.forEach(pattern => {
      const normalizedContent = this.normalizeContent(pattern.content)
      const groupKey = `${pattern.context}:${pattern.technique || 'general'}`

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, [])
      }

      grouped.get(groupKey)!.push(pattern)
    })

    // Create detected patterns
    const detected: DetectedPattern[] = []

    grouped.forEach((group, groupKey) => {
      if (group.length >= this.detectionThreshold) {
        const [context, technique] = groupKey.split(':')

        detected.push({
          pattern: groupKey,
          occurrences: group.length,
          contexts: [...new Set(group.map(p => p.context))],
          lastSeen: group[group.length - 1].timestamp,
          suggestedRule: this.generateRuleSuggestion(context, technique, group)
        })
      }
    })

    return detected
  }

  /**
   * Generate a rule suggestion based on detected patterns
   */
  private generateRuleSuggestion(
    context: string,
    technique: string,
    patterns: Pattern[]
  ): DetectedPattern['suggestedRule'] {
    // Analyze common elements in patterns
    const commonWords = this.findCommonWords(patterns.map(p => p.content))

    // Generate rule based on context and technique
    const ruleName = `Auto-detected ${context} ${technique} pattern`
    const trigger = context === 'general' ? '*' : context

    // Build action based on common patterns
    let action = 'When dealing with '

    if (technique !== 'general') {
      action += `${technique} in ${context} context, `
    } else {
      action += `${context} context, `
    }

    action += 'always: '

    // Add common requirements found in patterns
    if (commonWords.includes('curl')) {
      action += 'include full curl command, '
    }
    if (commonWords.includes('headers')) {
      action += 'document headers, '
    }
    if (commonWords.includes('response')) {
      action += 'show complete response, '
    }
    if (commonWords.includes('steps')) {
      action += 'provide step-by-step reproduction, '
    }

    // Remove trailing comma and space
    action = action.replace(/, $/, '')

    return {
      name: ruleName,
      trigger,
      action,
      priority: 3 // Medium priority for auto-detected rules
    }
  }

  /**
   * Find common words across multiple content strings
   */
  private findCommonWords(contents: string[]): string[] {
    const wordFrequency = new Map<string, number>()

    contents.forEach(content => {
      const words = content.toLowerCase().split(/\s+/)
      const uniqueWords = new Set(words)

      uniqueWords.forEach(word => {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1)
      })
    })

    // Return words that appear in at least 60% of contents
    const threshold = contents.length * 0.6
    const commonWords: string[] = []

    wordFrequency.forEach((count, word) => {
      if (count >= threshold) {
        commonWords.push(word)
      }
    })

    return commonWords
  }

  /**
   * Normalize content for pattern matching
   */
  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
  }

  /**
   * Analyze rule usage and suggest improvements
   */
  async analyzeRuleUsage(
    projectId: string,
    ruleId: string,
    ruleName: string,
    currentAction: string
  ) {
    // Get recent messages where this rule was applied
    const { data: messages } = await supabase
      .from('messages')
      .select('content, metadata')
      .eq('project_id', projectId)
      .contains('metadata', { applied_rules: [ruleId] })
      .order('created_at', { ascending: false })
      .limit(20)

    if (!messages || messages.length < 5) {
      return null // Not enough data
    }

    // Analyze what the AI added beyond the rule
    const additions = new Map<string, number>()

    messages.forEach(msg => {
      const content = msg.content.toLowerCase()

      // Check for common additions
      if (content.includes('curl') && !currentAction.includes('curl')) {
        additions.set('curl command', (additions.get('curl command') || 0) + 1)
      }
      if (content.includes('header') && !currentAction.includes('header')) {
        additions.set('headers documentation', (additions.get('headers documentation') || 0) + 1)
      }
      if (content.includes('status') && !currentAction.includes('status')) {
        additions.set('status codes', (additions.get('status codes') || 0) + 1)
      }
      if (content.includes('impact') && !currentAction.includes('impact')) {
        additions.set('impact analysis', (additions.get('impact analysis') || 0) + 1)
      }
    })

    // If AI frequently adds something, suggest it
    const improvements: string[] = []
    const threshold = messages.length * 0.6

    additions.forEach((count, addition) => {
      if (count >= threshold) {
        improvements.push(addition)
      }
    })

    if (improvements.length === 0) {
      return null
    }

    // Generate improved action
    let suggestedAction = currentAction

    if (!suggestedAction.endsWith('.')) {
      suggestedAction += '.'
    }

    suggestedAction += ' Also include: ' + improvements.join(', ') + '.'

    return {
      type: 'improvement' as const,
      ruleId,
      ruleName,
      currentAction,
      suggestedAction,
      improvements,
      frequency: messages.length
    }
  }

  /**
   * Clear old patterns to prevent memory buildup
   */
  clearOldPatterns(maxAge: number = 3600000) {
    // Clear patterns older than 1 hour by default
    const cutoff = Date.now() - maxAge

    this.patterns.forEach((patterns, key) => {
      const filtered = patterns.filter(p => {
        const timestamp = new Date(p.timestamp).getTime()
        return timestamp > cutoff
      })

      if (filtered.length === 0) {
        this.patterns.delete(key)
      } else {
        this.patterns.set(key, filtered)
      }
    })
  }
}

// Singleton instance
export const patternDetector = new PatternDetector()