import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { 
      projectId, 
      conversationId, 
      modelName, 
      inputTokens, 
      outputTokens, 
      cachedTokens = 0,
      requestType = 'chat'
    } = await request.json()

    if (!projectId || !modelName || inputTokens === undefined || outputTokens === undefined) {
      return NextResponse.json({ 
        error: 'Paramètres manquants: projectId, modelName, inputTokens, outputTokens requis' 
      }, { status: 400 })
    }

    // Calculer les coûts selon le modèle
    const costs = calculateCosts(modelName, inputTokens, outputTokens)
    const cacheSavings = calculateCacheSavings(modelName, cachedTokens)

    // Enregistrer dans la base
    const { data, error } = await supabase
      .from('api_usage')
      .insert({
        project_id: projectId,
        conversation_id: conversationId,
        model_name: modelName,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cached_tokens: cachedTokens,
        input_cost: costs.inputCost,
        output_cost: costs.outputCost,
        cache_savings: cacheSavings,
        request_type: requestType,
        metadata: {
          timestamp: new Date().toISOString(),
          user_agent: request.headers.get('user-agent') || 'unknown'
        }
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur tracking coûts:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      usage: data,
      costs: {
        input: costs.inputCost,
        output: costs.outputCost,
        total: costs.inputCost + costs.outputCost,
        cacheSavings: cacheSavings
      }
    })
  } catch (error) {
    console.error('Erreur API track costs:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const conversationId = searchParams.get('conversationId')
    const period = searchParams.get('period') || 'today' // today, week, month, all

    if (!projectId) {
      return NextResponse.json({ error: 'projectId requis' }, { status: 400 })
    }

    let query = supabase
      .from('api_usage')
      .select('*')
      .eq('project_id', projectId)

    // Filtrer par conversation si spécifié
    if (conversationId) {
      query = query.eq('conversation_id', conversationId)
    }

    // Filtrer par période
    const now = new Date()
    switch (period) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        query = query.gte('created_at', today.toISOString())
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        query = query.gte('created_at', weekAgo.toISOString())
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        query = query.gte('created_at', monthAgo.toISOString())
        break
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Calculer les totaux
    const summary = {
      totalRequests: data.length,
      totalInputTokens: data.reduce((sum, item) => sum + item.input_tokens, 0),
      totalOutputTokens: data.reduce((sum, item) => sum + item.output_tokens, 0),
      totalCachedTokens: data.reduce((sum, item) => sum + item.cached_tokens, 0),
      totalCost: data.reduce((sum, item) => sum + parseFloat(item.total_cost), 0),
      totalCacheSavings: data.reduce((sum, item) => sum + parseFloat(item.cache_savings), 0),
      cacheEfficiency: 0
    }

    summary.cacheEfficiency = summary.totalCacheSavings / (summary.totalCost + summary.totalCacheSavings) * 100

    return NextResponse.json({ 
      success: true, 
      usage: data,
      summary
    })
  } catch (error) {
    console.error('Erreur GET costs:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Fonction pour calculer les coûts selon le modèle
function calculateCosts(modelName: string, inputTokens: number, outputTokens: number) {
  const pricing = {
    'claude-3-5-sonnet-20241022': { input: 0.000003, output: 0.000015 },
    'claude-3-5-haiku-20241022': { input: 0.000001, output: 0.000005 },
    'gpt-4o': { input: 0.0000025, output: 0.00001 },
    'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 }
  }

  const modelPricing = pricing[modelName] || pricing['claude-3-5-sonnet-20241022']
  
  return {
    inputCost: inputTokens * modelPricing.input,
    outputCost: outputTokens * modelPricing.output
  }
}

// Fonction pour calculer les économies de cache
function calculateCacheSavings(modelName: string, cachedTokens: number) {
  const pricing = {
    'claude-3-5-sonnet-20241022': { input: 0.000003 },
    'claude-3-5-haiku-20241022': { input: 0.000001 },
    'gpt-4o': { input: 0.0000025 },
    'gpt-4o-mini': { input: 0.00000015 }
  }

  const modelPricing = pricing[modelName] || pricing['claude-3-5-sonnet-20241022']
  return cachedTokens * modelPricing.input
}
