import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/memory/patterns
 * Auto-detect patterns in facts (SQL-based, no embeddings)
 * Useful for finding related vulnerabilities
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Pattern 1: Endpoints with multiple vulnerabilities
    const { data: endpointPatterns } = await (supabase as any).rpc('detect_endpoint_patterns', {
      p_project_id: projectId
    }).catch(() => ({ data: null }))

    // Fallback si RPC n'existe pas encore (on créera la migration après)
    const { data: facts } = await supabase
      .from('memory_facts')
      .select('*')
      .eq('project_id', projectId)

    if (!facts) {
      return NextResponse.json({ patterns: [] })
    }

    // Pattern detection via JS (temporaire, sera migré en SQL)
    const patterns: any[] = []

    // 1. Group by endpoint
    const endpointGroups = new Map<string, any[]>()
    facts.forEach((fact: any) => {
      const metadata = fact.metadata as any
      const endpoint = metadata?.http_request?.path || metadata?.endpoint
      if (endpoint) {
        if (!endpointGroups.has(endpoint)) {
          endpointGroups.set(endpoint, [])
        }
        endpointGroups.get(endpoint)!.push(fact)
      }
    })

    endpointGroups.forEach((groupFacts, endpoint) => {
      if (groupFacts.length > 1) {
        const techniques = [...new Set(groupFacts.map(f => (f.metadata as any)?.technique).filter(Boolean))]
        const maxSeverity = groupFacts.reduce((max, f) => {
          const metadata = f.metadata as any
          const severityScore = { critical: 4, high: 3, medium: 2, low: 1, info: 0 }
          const currentScore = severityScore[metadata?.severity as keyof typeof severityScore] || 0
          const maxScore = severityScore[max as keyof typeof severityScore] || 0
          return currentScore > maxScore ? metadata?.severity : max
        }, 'info')

        patterns.push({
          type: 'endpoint_cluster',
          name: `Multiple vulns on ${endpoint}`,
          endpoint,
          techniques,
          facts_count: groupFacts.length,
          fact_ids: groupFacts.map(f => f.id),
          severity: maxSeverity,
          description: `${endpoint} has ${groupFacts.length} vulnerabilities: ${techniques.join(', ')}`
        })
      }
    })

    // 2. Group by technique
    const techniqueGroups = new Map<string, any[]>()
    facts.forEach((fact: any) => {
      const metadata = fact.metadata as any
      const technique = metadata?.technique
      if (technique) {
        if (!techniqueGroups.has(technique)) {
          techniqueGroups.set(technique, [])
        }
        techniqueGroups.get(technique)!.push(fact)
      }
    })

    techniqueGroups.forEach((groupFacts, technique) => {
      if (groupFacts.length > 2) {
        const endpoints = [...new Set(groupFacts.map(f => {
          const metadata = f.metadata as any
          return metadata?.http_request?.path || metadata?.endpoint
        }).filter(Boolean))]

        patterns.push({
          type: 'technique_pattern',
          name: `${technique} vulnerability pattern`,
          technique,
          endpoints,
          facts_count: groupFacts.length,
          fact_ids: groupFacts.map(f => f.id),
          description: `${technique} affects ${endpoints.length} endpoints`
        })
      }
    })

    // 3. Group by host (same host = same target)
    const hostGroups = new Map<string, any[]>()
    facts.forEach((fact: any) => {
      const metadata = fact.metadata as any
      const host = metadata?.http_request?.host
      if (host) {
        if (!hostGroups.has(host)) {
          hostGroups.set(host, [])
        }
        hostGroups.get(host)!.push(fact)
      }
    })

    hostGroups.forEach((groupFacts, host) => {
      if (groupFacts.length > 3) {
        patterns.push({
          type: 'target_surface',
          name: `Attack surface: ${host}`,
          host,
          facts_count: groupFacts.length,
          fact_ids: groupFacts.map(f => f.id),
          techniques: [...new Set(groupFacts.map(f => (f.metadata as any)?.technique).filter(Boolean))],
          description: `${host} has ${groupFacts.length} documented vulnerabilities`
        })
      }
    })

    // 4. Detect attack chains (facts with attack_chain metadata)
    const chainGroups = new Map<string, any[]>()
    facts.forEach((fact: any) => {
      const metadata = fact.metadata as any
      const chainId = metadata?.attack_chain?.id
      if (chainId) {
        if (!chainGroups.has(chainId)) {
          chainGroups.set(chainId, [])
        }
        chainGroups.get(chainId)!.push(fact)
      }
    })

    chainGroups.forEach((groupFacts, chainId) => {
      const sorted = groupFacts.sort((a, b) => {
        const aMetadata = a.metadata as any
        const bMetadata = b.metadata as any
        return (aMetadata?.attack_chain?.step || 0) - (bMetadata?.attack_chain?.step || 0)
      })
      const firstMetadata = sorted[0]?.metadata as any
      const label = firstMetadata?.attack_chain?.label || `Attack Chain ${chainId}`

      patterns.push({
        type: 'attack_chain',
        name: label,
        chain_id: chainId,
        steps: sorted.length,
        fact_ids: sorted.map(f => f.id),
        description: `${sorted.length}-step attack chain: ${label}`
      })
    })

    // 5. Detect related facts
    const relatedClusters: any[] = []
    facts.forEach((fact: any) => {
      const metadata = fact.metadata as any
      if (metadata?.related_to && metadata.related_to.length > 0) {
        relatedClusters.push({
          type: 'related_cluster',
          name: `Related to: ${fact.fact.substring(0, 50)}...`,
          root_fact_id: fact.id,
          related_count: metadata.related_to.length,
          fact_ids: [fact.id, ...metadata.related_to.map((r: any) => r.fact_id)],
          description: `Fact with ${metadata.related_to.length} related vulnerabilities`
        })
      }
    })

    patterns.push(...relatedClusters)

    // Sort by facts_count (most important patterns first)
    patterns.sort((a, b) => (b.facts_count || 0) - (a.facts_count || 0))

    return NextResponse.json({
      patterns,
      total: patterns.length,
      by_type: {
        endpoint_cluster: patterns.filter(p => p.type === 'endpoint_cluster').length,
        technique_pattern: patterns.filter(p => p.type === 'technique_pattern').length,
        target_surface: patterns.filter(p => p.type === 'target_surface').length,
        attack_chain: patterns.filter(p => p.type === 'attack_chain').length,
        related_cluster: patterns.filter(p => p.type === 'related_cluster').length
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/memory/patterns:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
