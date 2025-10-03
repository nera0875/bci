/**
 * Pattern Learner Service - Auto-Reinforcement System
 *
 * Analyzes user_decisions to detect patterns and generate implicit rules
 * Implements clustering by embedding similarity and confidence scoring
 *
 * Architecture: user_decisions → learned_patterns → implicit_rules
 */

import { supabase } from '@/lib/supabase/client'
import { generateEmbedding } from '@/lib/services/ragService'

interface UserDecision {
  id: string
  project_id: string
  decision_type: string
  context: any
  proposed_action: any
  user_choice: 'accept' | 'reject' | 'modify'
  user_modification: any | null
  confidence_score: number | null
  embedding: number[] | null
  tags: string[]
  created_at: string
}

interface LearnedPattern {
  id?: string
  project_id: string
  pattern_type: string
  condition: any
  action: any
  confidence: number
  sample_size: number
  drift_score: number
  decision_ids: string[]
  created_at?: string
  updated_at?: string
}

interface ImplicitRule {
  project_id: string
  pattern_id: string
  name: string
  condition: any
  action: any
  confidence: number
  sample_size: number
  status: 'suggestion' | 'active' | 'deprecated'
  success_rate: number | null
}

export class PatternLearner {
  private projectId: string
  private minSampleSize: number = 3 // Minimum decisions to form a pattern
  private minConfidence: number = 0.6 // Minimum confidence for pattern
  private similarityThreshold: number = 0.8 // Cosine similarity threshold

  constructor(projectId: string) {
    this.projectId = projectId
  }

  /**
   * Main analysis function - analyzes all decisions and generates patterns
   */
  async analyzeDecisions(): Promise<LearnedPattern[]> {
    console.log('🧠 Pattern Learner: Starting analysis for project:', this.projectId)

    // 1. Load all user decisions
    const decisions = await this.loadDecisions()
    console.log(`📊 Loaded ${decisions.length} decisions`)

    if (decisions.length < this.minSampleSize) {
      console.log('⚠️ Not enough decisions to analyze patterns')
      return []
    }

    // 2. Ensure all decisions have embeddings
    await this.generateMissingEmbeddings(decisions)

    // 3. Cluster decisions by similarity
    const clusters = await this.clusterBySimilarity(decisions)
    console.log(`🔍 Found ${clusters.length} clusters`)

    // 4. Analyze each cluster for patterns
    const patterns: LearnedPattern[] = []
    for (const cluster of clusters) {
      const clusterPatterns = await this.analyzeCluster(cluster)
      patterns.push(...clusterPatterns)
    }

    console.log(`✅ Generated ${patterns.length} patterns`)

    // 5. Save patterns to database
    await this.savePatterns(patterns)

    return patterns
  }

  /**
   * Load all decisions for this project
   */
  private async loadDecisions(): Promise<UserDecision[]> {
    const { data, error } = await supabase
      .from('user_decisions')
      .select('*')
      .eq('project_id', this.projectId)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Error loading decisions:', error)
      return []
    }

    return data || []
  }

  /**
   * Generate embeddings for decisions that don't have them
   */
  private async generateMissingEmbeddings(decisions: UserDecision[]): Promise<void> {
    const needsEmbedding = decisions.filter(d => !d.embedding)

    if (needsEmbedding.length === 0) return

    console.log(`🔄 Generating embeddings for ${needsEmbedding.length} decisions...`)

    for (const decision of needsEmbedding) {
      try {
        const text = `${decision.decision_type}: ${JSON.stringify(decision.context)} -> ${JSON.stringify(decision.proposed_action)}`
        const embedding = await generateEmbedding(text)

        await supabase
          .from('user_decisions')
          .update({ embedding })
          .eq('id', decision.id)

        decision.embedding = embedding
      } catch (error) {
        console.error('Error generating embedding for decision:', decision.id, error)
      }
    }
  }

  /**
   * Cluster decisions by embedding similarity
   */
  private async clusterBySimilarity(decisions: UserDecision[]): Promise<UserDecision[][]> {
    const clusters: UserDecision[][] = []
    const processed = new Set<string>()

    for (const decision of decisions) {
      if (processed.has(decision.id) || !decision.embedding) continue

      const cluster = [decision]
      processed.add(decision.id)

      for (const other of decisions) {
        if (processed.has(other.id) || !other.embedding || decision.id === other.id) continue

        const similarity = this.cosineSimilarity(decision.embedding, other.embedding)

        if (similarity >= this.similarityThreshold) {
          cluster.push(other)
          processed.add(other.id)
        }
      }

      if (cluster.length >= this.minSampleSize) {
        clusters.push(cluster)
      }
    }

    return clusters
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
  }

  /**
   * Analyze cluster to extract patterns
   */
  private async analyzeCluster(cluster: UserDecision[]): Promise<LearnedPattern[]> {
    const patterns: LearnedPattern[] = []

    const acceptCount = cluster.filter(d => d.user_choice === 'accept').length
    const rejectCount = cluster.filter(d => d.user_choice === 'reject').length
    const total = cluster.length

    const acceptRate = acceptCount / total
    const rejectRate = rejectCount / total

    // High acceptance pattern
    if (acceptRate >= 0.8 && acceptCount >= this.minSampleSize) {
      patterns.push({
        project_id: this.projectId,
        pattern_type: 'high_acceptance',
        condition: this.extractCommonConditions(cluster),
        action: this.extractCommonActions(cluster),
        confidence: acceptRate,
        sample_size: acceptCount,
        drift_score: 0,
        decision_ids: cluster.map(d => d.id)
      })
    }

    // High rejection pattern
    if (rejectRate >= 0.8 && rejectCount >= this.minSampleSize) {
      patterns.push({
        project_id: this.projectId,
        pattern_type: 'high_rejection',
        condition: this.extractCommonConditions(cluster),
        action: { type: 'reject', reason: 'User pattern' },
        confidence: rejectRate,
        sample_size: rejectCount,
        drift_score: 0,
        decision_ids: cluster.map(d => d.id)
      })
    }

    return patterns
  }

  /**
   * Extract common conditions from cluster
   */
  private extractCommonConditions(cluster: UserDecision[]): any {
    const allTags = cluster.flatMap(d => d.tags || [])
    const tagCounts = new Map<string, number>()

    for (const tag of allTags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }

    const commonTags = Array.from(tagCounts.entries())
      .filter(([_, count]) => count >= cluster.length * 0.7)
      .map(([tag, _]) => tag)

    const decisionTypes = cluster.map(d => d.decision_type)
    const mostCommonType = this.getMostCommon(decisionTypes)

    return {
      tags: commonTags,
      decision_type: mostCommonType,
      sample_contexts: cluster.slice(0, 3).map(d => d.context)
    }
  }

  /**
   * Extract common actions from cluster
   */
  private extractCommonActions(cluster: UserDecision[]): any {
    const actions = cluster.map(d => d.proposed_action)
    const actionTypes = actions.map(a => a?.type || 'unknown')
    const mostCommonAction = this.getMostCommon(actionTypes)

    return {
      type: mostCommonAction,
      sample_actions: actions.slice(0, 3)
    }
  }

  /**
   * Get most common element in array
   */
  private getMostCommon<T>(arr: T[]): T | null {
    if (arr.length === 0) return null

    const counts = new Map<T, number>()
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1)
    }

    let max = 0
    let mostCommon: T | null = null

    for (const [item, count] of counts.entries()) {
      if (count > max) {
        max = count
        mostCommon = item
      }
    }

    return mostCommon
  }

  /**
   * Save patterns to database
   */
  private async savePatterns(patterns: LearnedPattern[]): Promise<void> {
    for (const pattern of patterns) {
      try {
        const { data: existing } = await supabase
          .from('learned_patterns')
          .select('*')
          .eq('project_id', pattern.project_id)
          .eq('pattern_type', pattern.pattern_type)
          .single()

        if (existing) {
          await supabase
            .from('learned_patterns')
            .update({
              confidence: pattern.confidence,
              sample_size: pattern.sample_size,
              condition: pattern.condition,
              action: pattern.action,
              decision_ids: pattern.decision_ids,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('learned_patterns')
            .insert(pattern)
        }
      } catch (error) {
        console.error('Error saving pattern:', error)
      }
    }
  }

  /**
   * Generate implicit rules from high-confidence patterns
   */
  async generateImplicitRules(): Promise<ImplicitRule[]> {
    console.log('🎯 Generating implicit rules from patterns...')

    const { data: patterns, error } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('project_id', this.projectId)
      .gte('confidence', this.minConfidence)
      .gte('sample_size', this.minSampleSize)

    if (error || !patterns) {
      console.error('Error loading patterns:', error)
      return []
    }

    const rules: ImplicitRule[] = []

    for (const pattern of patterns) {
      const { data: existingRule } = await supabase
        .from('implicit_rules')
        .select('id')
        .eq('pattern_id', pattern.id)
        .single()

      if (existingRule) continue

      let rule: ImplicitRule | null = null

      if (pattern.pattern_type === 'high_acceptance') {
        rule = {
          project_id: this.projectId,
          pattern_id: pattern.id,
          name: `Auto-accept: ${JSON.stringify(pattern.condition.tags).slice(0, 50)}`,
          condition: pattern.condition,
          action: { type: 'auto_accept', ...pattern.action },
          confidence: pattern.confidence,
          sample_size: pattern.sample_size,
          status: 'suggestion',
          success_rate: null
        }
      } else if (pattern.pattern_type === 'high_rejection') {
        rule = {
          project_id: this.projectId,
          pattern_id: pattern.id,
          name: `Auto-reject: ${JSON.stringify(pattern.condition.tags).slice(0, 50)}`,
          condition: pattern.condition,
          action: { type: 'auto_reject', reason: 'User pattern' },
          confidence: pattern.confidence,
          sample_size: pattern.sample_size,
          status: 'suggestion',
          success_rate: null
        }
      }

      if (rule) {
        rules.push(rule)

        try {
          await supabase
            .from('implicit_rules')
            .insert(rule)

          console.log('✅ Created implicit rule:', rule.name)
        } catch (error) {
          console.error('Error creating implicit rule:', error)
        }
      }
    }

    return rules
  }
}
