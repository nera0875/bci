/**
 * Memory Context Builder
 * Formats facts with relations and patterns for AI context
 */

interface Fact {
  id: string
  fact: string
  metadata: any
  created_at: string
}

interface MemoryContext {
  facts_summary: string
  total_facts: number
  attack_chains?: any[]
  patterns?: any[]
  related_facts_map?: Map<string, Fact[]>
}

/**
 * Build enriched memory context for AI
 * Includes relations, attack chains, and patterns
 */
export async function buildMemoryContext(
  facts: Fact[],
  projectId: string
): Promise<MemoryContext> {
  const context: MemoryContext = {
    facts_summary: '',
    total_facts: facts.length,
    related_facts_map: new Map()
  }

  if (facts.length === 0) {
    context.facts_summary = 'No facts in memory yet.'
    return context
  }

  // Build related facts map
  const relatedMap = new Map<string, Fact[]>()
  facts.forEach(fact => {
    if (fact.metadata?.related_to && fact.metadata.related_to.length > 0) {
      fact.metadata.related_to.forEach((rel: any) => {
        const relatedFact = facts.find(f => f.id === rel.fact_id)
        if (relatedFact) {
          if (!relatedMap.has(fact.id)) {
            relatedMap.set(fact.id, [])
          }
          relatedMap.get(fact.id)!.push(relatedFact)
        }
      })
    }
  })
  context.related_facts_map = relatedMap

  // Group by attack chains
  const chainGroups = new Map<string, Fact[]>()
  facts.forEach(fact => {
    const chainId = fact.metadata?.attack_chain?.id
    if (chainId) {
      if (!chainGroups.has(chainId)) {
        chainGroups.set(chainId, [])
      }
      chainGroups.get(chainId)!.push(fact)
    }
  })

  // Format attack chains
  if (chainGroups.size > 0) {
    context.attack_chains = Array.from(chainGroups.entries()).map(([chainId, chainFacts]) => {
      const sorted = chainFacts.sort((a, b) =>
        (a.metadata?.attack_chain?.step || 0) - (b.metadata?.attack_chain?.step || 0)
      )
      return {
        id: chainId,
        label: sorted[0]?.metadata?.attack_chain?.label || `Attack Chain ${chainId}`,
        steps: sorted.map(f => ({
          step: f.metadata?.attack_chain?.step,
          description: f.fact,
          technique: f.metadata?.technique
        }))
      }
    })
  }

  // Build facts summary with relations
  const factsSummary: string[] = []

  // Add attack chains first (most important)
  if (context.attack_chains && context.attack_chains.length > 0) {
    factsSummary.push('=== ATTACK CHAINS ===')
    context.attack_chains.forEach(chain => {
      factsSummary.push(`\n${chain.label}:`)
      chain.steps.forEach((step: any) => {
        factsSummary.push(`  Step ${step.step}: ${step.description} [${step.technique || 'N/A'}]`)
      })
    })
    factsSummary.push('')
  }

  // Group facts by category
  const categoryGroups = new Map<string, Fact[]>()
  const uncategorized: Fact[] = []

  facts.forEach(fact => {
    const category = fact.metadata?.category
    if (category) {
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, [])
      }
      categoryGroups.get(category)!.push(fact)
    } else if (!fact.metadata?.attack_chain) {
      // Don't duplicate facts already in attack chains
      uncategorized.push(fact)
    }
  })

  // Add categorized facts
  if (categoryGroups.size > 0) {
    factsSummary.push('=== FACTS BY CATEGORY ===')
    categoryGroups.forEach((groupFacts, category) => {
      factsSummary.push(`\n[${category}]`)
      groupFacts.forEach(fact => {
        const relations = relatedMap.get(fact.id)
        let factLine = `- ${fact.fact}`

        if (fact.metadata?.technique) {
          factLine += ` [${fact.metadata.technique}]`
        }
        if (fact.metadata?.severity) {
          factLine += ` (${fact.metadata.severity})`
        }

        factsSummary.push(factLine)

        // Add relations
        if (relations && relations.length > 0) {
          relations.forEach(rel => {
            const relType = fact.metadata.related_to.find((r: any) => r.fact_id === rel.id)?.type
            factsSummary.push(`    → ${relType}: ${rel.fact}`)
          })
        }
      })
    })
    factsSummary.push('')
  }

  // Add uncategorized facts
  if (uncategorized.length > 0 && uncategorized.length < 20) {
    factsSummary.push('=== OTHER FACTS ===')
    uncategorized.forEach(fact => {
      factsSummary.push(`- ${fact.fact}`)
    })
  }

  // Add summary stats
  factsSummary.unshift(`Total: ${facts.length} facts${context.attack_chains ? `, ${context.attack_chains.length} attack chains` : ''}\n`)

  context.facts_summary = factsSummary.join('\n')

  return context
}

/**
 * Format memory context for AI prompt
 */
export function formatMemoryForPrompt(context: MemoryContext): string {
  if (context.total_facts === 0) {
    return 'MEMORY: Empty'
  }

  return `MEMORY CONTEXT:
${context.facts_summary}

NOTE: Pay attention to attack chains and related facts. They show how vulnerabilities can be combined for greater impact.`
}
