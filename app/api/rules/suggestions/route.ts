import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId requis' }, { status: 400 })
    }

    // Récupérer les patterns appris avec forte confiance
    const { data: patterns, error } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('project_id', projectId)
      .gte('confidence', 0.6)
      .order('confidence', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Transformer en suggestions utilisables
    const suggestions = (patterns || []).map(pattern => ({
      id: pattern.id,
      pattern: pattern.pattern_text,
      suggested_rule: generateRuleFromPattern(pattern),
      confidence: pattern.confidence,
      usage_count: pattern.usage_count
    }))

    return NextResponse.json({
      success: true,
      suggestions
    })
  } catch (error) {
    console.error('Erreur GET suggestions:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, pattern, suggested_rule, confidence } = await request.json()

    if (!projectId || !pattern || !suggested_rule) {
      return NextResponse.json({ 
        error: 'projectId, pattern et suggested_rule requis' 
      }, { status: 400 })
    }

    // Enregistrer nouveau pattern appris
    const { data, error } = await supabase
      .from('learned_patterns')
      .insert({
        project_id: projectId,
        pattern_text: pattern,
        target_location: 'auto-detected',
        confidence: confidence || 0.5
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      pattern: data,
      message: 'Pattern appris enregistré'
    })
  } catch (error) {
    console.error('Erreur POST suggestions:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Fonction pour générer une règle à partir d'un pattern
function generateRuleFromPattern(pattern: any): string {
  const patternText = pattern.pattern_text.toLowerCase()
  
  // Détection par mots-clés
  if (patternText.includes('sqli') || patternText.includes('sql injection')) {
    return `Range les tests SQLi dans Memory/Auth/SQLi Tests\nFormat: Payload, URL, Résultat, Notes`
  }
  
  if (patternText.includes('xss') || patternText.includes('script')) {
    return `Mets les tests XSS dans Memory/Auth/XSS Tests\nInclus: Payload, Contexte, Résultat, Bypass`
  }
  
  if (patternText.includes('request') || patternText.includes('http')) {
    return `Range les requêtes dans Memory/Requêtes\nFormat: URL, Méthode, Headers, Body, Réponse`
  }
  
  if (patternText.includes('business') || patternText.includes('logic')) {
    return `Business logic dans Memory/Business Logic\nStructure: Description, Impact, Exploit`
  }
  
  if (patternText.includes('auth') || patternText.includes('login')) {
    return `Tests d'authentification dans Memory/Auth/Login Tests\nFormat: Endpoint, Credentials, Résultat, Bypass`
  }
  
  // Règle générique
  return `Pattern "${pattern.pattern_text}" détecté\nRange dans Memory/Divers\nFormat: Description, Contexte, Résultat`
}
