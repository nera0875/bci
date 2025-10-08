import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/memory/attack-chains
 * List all attack chains with their steps
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

    // Get all facts with attack_chain metadata
    const { data: facts, error } = await supabase
      .from('memory_facts')
      .select('*')
      .eq('project_id', projectId)
      .not('metadata->attack_chain', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching attack chains:', error)
      return NextResponse.json(
        { error: 'Failed to fetch attack chains' },
        { status: 500 }
      )
    }

    // Group by chain ID
    const chainMap = new Map<string, any[]>()

    facts?.forEach(fact => {
      const metadata = fact.metadata as any
      const chainId = metadata?.attack_chain?.id
      if (chainId) {
        if (!chainMap.has(chainId)) {
          chainMap.set(chainId, [])
        }
        chainMap.get(chainId)!.push(fact)
      }
    })

    // Format chains with steps
    const chains = Array.from(chainMap.entries()).map(([chainId, chainFacts]) => {
      // Sort by step number
      const sortedSteps = chainFacts.sort((a, b) => {
        const aMetadata = a.metadata as any
        const bMetadata = b.metadata as any
        return (aMetadata?.attack_chain?.step || 0) - (bMetadata?.attack_chain?.step || 0)
      })

      const firstMetadata = sortedSteps[0]?.metadata as any
      const label = firstMetadata?.attack_chain?.label || `Attack Chain ${chainId}`
      const totalSteps = firstMetadata?.attack_chain?.total_steps || sortedSteps.length

      // Calculate combined severity (highest in chain)
      const severityScores = { critical: 4, high: 3, medium: 2, low: 1, info: 0 }
      const maxSeverity = sortedSteps.reduce((max, fact) => {
        const metadata = fact.metadata as any
        const currentScore = severityScores[metadata?.severity as keyof typeof severityScores] || 0
        const maxScore = severityScores[max as keyof typeof severityScores] || 0
        return currentScore > maxScore ? metadata?.severity : max
      }, 'info')

      // Extract combined impact
      const combinedImpact = sortedSteps.find(f => {
        const m = f.metadata as any
        return m?.combined_impact
      })
      const combinedImpactMetadata = combinedImpact?.metadata as any

      return {
        id: chainId,
        label,
        total_steps: totalSteps,
        current_steps: sortedSteps.length,
        is_complete: sortedSteps.length === totalSteps,
        severity: maxSeverity,
        combined_impact: combinedImpactMetadata?.combined_impact,
        steps: sortedSteps.map(fact => {
          const metadata = fact.metadata as any
          return {
            step: metadata?.attack_chain?.step,
            fact_id: fact.id,
            description: fact.fact,
            technique: metadata?.technique,
            severity: metadata?.severity,
            prerequisites: metadata?.prerequisites || [],
            http_request: metadata?.http_request ? {
              method: metadata.http_request.method,
              url: metadata.http_request.url
            } : null
          }
        }),
        created_at: sortedSteps[0].created_at
      }
    })

    // Sort by severity then by step count
    chains.sort((a, b) => {
      const severityScores = { critical: 4, high: 3, medium: 2, low: 1, info: 0 }
      const scoreA = severityScores[a.severity as keyof typeof severityScores] || 0
      const scoreB = severityScores[b.severity as keyof typeof severityScores] || 0
      if (scoreA !== scoreB) return scoreB - scoreA
      return b.total_steps - a.total_steps
    })

    return NextResponse.json({
      chains,
      total: chains.length,
      stats: {
        complete: chains.filter(c => c.is_complete).length,
        incomplete: chains.filter(c => !c.is_complete).length,
        critical: chains.filter(c => c.severity === 'critical').length,
        high: chains.filter(c => c.severity === 'high').length
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/memory/attack-chains:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/memory/attack-chains
 * Create or update an attack chain
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, chainId, label, factIds } = body

    if (!projectId || !chainId || !factIds || !Array.isArray(factIds)) {
      return NextResponse.json(
        { error: 'projectId, chainId, and factIds array are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update each fact with attack_chain metadata
    const updates = factIds.map(async (factId, index) => {
      const { data: fact } = await supabase
        .from('memory_facts')
        .select('metadata')
        .eq('id', factId)
        .single()

      const updatedMetadata = {
        ...(fact?.metadata as any || {}),
        attack_chain: {
          id: chainId,
          step: index + 1,
          label,
          total_steps: factIds.length
        }
      }

      return supabase
        .from('memory_facts')
        .update({ metadata: updatedMetadata })
        .eq('id', factId)
    })

    await Promise.all(updates)

    return NextResponse.json({
      success: true,
      chain_id: chainId,
      steps_updated: factIds.length
    })

  } catch (error: any) {
    console.error('Error in POST /api/memory/attack-chains:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/memory/attack-chains/:chainId
 * Remove attack chain metadata from all facts
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')
    const chainId = searchParams.get('chainId')

    if (!projectId || !chainId) {
      return NextResponse.json(
        { error: 'projectId and chainId are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get all facts in this chain
    const { data: facts } = await supabase
      .from('memory_facts')
      .select('id, metadata')
      .eq('project_id', projectId)
      .eq('metadata->attack_chain->>id', chainId)

    if (!facts || facts.length === 0) {
      return NextResponse.json({ success: true, removed: 0 })
    }

    // Remove attack_chain from metadata
    const updates = facts.map(fact => {
      const metadata = (fact.metadata as any) || {}
      const { attack_chain, ...restMetadata } = metadata
      return supabase
        .from('memory_facts')
        .update({ metadata: restMetadata })
        .eq('id', fact.id)
    })

    await Promise.all(updates)

    return NextResponse.json({
      success: true,
      removed: facts.length
    })

  } catch (error: any) {
    console.error('Error in DELETE /api/memory/attack-chains:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
