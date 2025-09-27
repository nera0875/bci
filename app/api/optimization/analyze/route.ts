import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { projectId, nodeId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'projectId requis' }, { status: 400 })
    }

    // Analyser les patterns récents
    const analytics = await analyzePatterns(projectId, nodeId)
    const suggestions = await generateSuggestions(projectId, nodeId, analytics)

    return NextResponse.json({ 
      success: true, 
      analytics,
      suggestions,
      message: `${suggestions.length} suggestion(s) générée(s)`
    })
  } catch (error) {
    console.error('Erreur analyse optimisation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function analyzePatterns(projectId: string, nodeId?: string) {
  try {
    // Analyser les actions récentes dans la mémoire
    const { data: recentNodes } = await supabase
      .from('memory_nodes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(100)

    // Analyser les messages récents
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50)

    // Calculer les métriques
    const totalActions = recentNodes?.length || 0
    const wellStructuredNodes = recentNodes?.filter(node => 
      node.name && 
      node.name.match(/\d{4}-\d{2}-\d{2}/) && // Format date
      node.parent_id // Bien rangé dans un dossier
    ).length || 0

    const successRate = totalActions > 0 ? Math.round((wellStructuredNodes / totalActions) * 100) : 0

    // Analyser le respect des règles
    const { data: rules } = await supabase
      .from('rules')
      .select('*')
      .eq('project_id', projectId)
      .eq('enabled', true)

    const rulesFollowed = rules?.length || 0

    return {
      totalActions,
      successRate,
      rulesFollowed,
      wellStructuredNodes,
      patterns: detectPatterns(recentNodes || [])
    }
  } catch (error) {
    console.error('Erreur analyse patterns:', error)
    return {
      totalActions: 0,
      successRate: 0,
      rulesFollowed: 0,
      wellStructuredNodes: 0,
      patterns: []
    }
  }
}

function detectPatterns(nodes: any[]) {
  const patterns = []

  // Détecter les patterns de nommage réussis
  const namingPatterns = nodes
    .filter(node => node.name && node.name.includes('_'))
    .map(node => {
      const parts = node.name.split('_')
      return {
        prefix: parts[0],
        suffix: parts[parts.length - 1],
        folder: node.parent_id
      }
    })

  // Grouper par patterns similaires
  const groupedPatterns = {}
  namingPatterns.forEach(pattern => {
    const key = `${pattern.prefix}_${pattern.suffix}`
    if (!groupedPatterns[key]) {
      groupedPatterns[key] = { count: 0, examples: [], folder: pattern.folder }
    }
    groupedPatterns[key].count++
    groupedPatterns[key].examples.push(pattern)
  })

  // Garder seulement les patterns fréquents (>3 occurrences)
  Object.entries(groupedPatterns).forEach(([key, data]: [string, any]) => {
    if (data.count >= 3) {
      patterns.push({
        type: 'naming',
        pattern: key,
        count: data.count,
        confidence: Math.min(data.count / 10, 1), // Max 1.0
        folder: data.folder
      })
    }
  })

  return patterns
}

async function generateSuggestions(projectId: string, nodeId: string | undefined, analytics: any) {
  const suggestions = []

  // Suggestion basée sur les patterns de nommage
  analytics.patterns.forEach((pattern: any, index: number) => {
    if (pattern.confidence > 0.7) {
      suggestions.push({
        id: `pattern_${index}`,
        type: 'rule',
        title: `Règle de nommage détectée`,
        description: `Créer une règle pour le pattern "${pattern.pattern}" (utilisé ${pattern.count} fois)`,
        confidence: pattern.confidence,
        basedOn: `${pattern.count} actions similaires`,
        action: {
          type: 'create_rule',
          rule: {
            name: `Pattern ${pattern.pattern}`,
            trigger: pattern.folder || '*',
            action: `Utiliser le format de nommage: ${pattern.pattern}`,
            priority: 2
          }
        }
      })
    }
  })

  // Suggestion pour améliorer le taux de succès
  if (analytics.successRate < 70) {
    suggestions.push({
      id: 'improve_structure',
      type: 'structure',
      title: 'Améliorer la structure',
      description: `Taux de succès faible (${analytics.successRate}%). Ajouter des règles de structure plus strictes.`,
      confidence: 0.8,
      basedOn: `${analytics.totalActions} actions analysées`,
      action: {
        type: 'create_rule',
        rule: {
          name: 'Structure obligatoire',
          trigger: '*',
          action: 'OBLIGATOIRE: Ranger dans un dossier avec format [DATE]_[TYPE]_[DESC]',
          priority: 1
        }
      }
    })
  }

  // Suggestion pour ajouter des colonnes utiles
  if (nodeId) {
    suggestions.push({
      id: 'add_status_column',
      type: 'column',
      title: 'Ajouter colonne Statut',
      description: 'Ajouter une colonne pour tracker le statut des éléments (Testé, En cours, Terminé)',
      confidence: 0.75,
      basedOn: 'Pattern fréquent de suivi de statut',
      action: {
        type: 'add_column',
        nodeId,
        column: {
          name: 'Statut',
          type: 'select',
          options: {
            options: ['À faire', 'En cours', 'Testé', 'Terminé', 'Échoué']
          }
        }
      }
    })
  }

  return suggestions.slice(0, 5) // Max 5 suggestions
}
