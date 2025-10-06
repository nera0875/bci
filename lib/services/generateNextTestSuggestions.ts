import { supabase } from '@/lib/supabase/client'

interface TestContext {
  lastTestEndpoint?: string
  lastTestTechnique?: string
  lastTestStatus?: 'success' | 'failed' | 'testing' | 'not_tested'
  lastTestSeverity?: 'critical' | 'high' | 'medium' | 'low'
}

interface Suggestion {
  endpoint: string
  technique: string
  confidence: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  reason: string
  suggested_payload: string
  context: Record<string, any>
}

/**
 * Génère 3-5 suggestions de tests intelligentes basées sur:
 * 1. Patterns de succès (attack_patterns)
 * 2. Derniers résultats (si success → tester techniques similaires sur même endpoint)
 * 3. Endpoints non testés (priorité haute)
 * 4. High-value targets (/admin, /api, /checkout, /payment)
 */
export async function generateNextTestSuggestions(
  projectId: string,
  context?: TestContext
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = []

  try {
    // 1. Récupérer les attack patterns (taux de succès par technique)
    const { data: patterns } = await supabase
      .from('attack_patterns')
      .select('technique, success_count, usage_count, last_success_endpoint')
      .eq('project_id', projectId)

    const successRates: Record<string, { rate: number; lastSuccess?: string }> = {}
    patterns?.forEach((p) => {
      if (p.usage_count > 0) {
        successRates[p.technique] = {
          rate: (p.success_count / p.usage_count) * 100,
          lastSuccess: p.last_success_endpoint,
        }
      }
    })

    // 2. Récupérer tous les test results existants
    const { data: testResults } = await supabase
      .from('test_results')
      .select('endpoint, technique, status, result')
      .eq('project_id', projectId)

    // 3. Construire la matrice de coverage (quoi est testé/non testé)
    const testedCombinations = new Set<string>()
    const endpoints = new Set<string>()
    const successfulTests: Array<{ endpoint: string; technique: string; severity?: string }> = []

    testResults?.forEach((test) => {
      endpoints.add(test.endpoint)
      if (test.status !== 'not_tested') {
        testedCombinations.add(`${test.endpoint}|${test.technique}`)
      }
      if (test.status === 'success') {
        successfulTests.push({
          endpoint: test.endpoint,
          technique: test.technique,
          severity: test.result?.severity,
        })
      }
    })

    const allTechniques = [
      'SQLi',
      'XSS',
      'IDOR',
      'CSRF',
      'Auth',
      'BizLogic',
      'SSRF',
      'RCE',
      'LFI',
      'XXE',
      'Priv.Esc',
      'FileUpload',
    ]

    // 4. STRATÉGIE 1: Si dernier test = SUCCESS → suggérer techniques similaires sur même endpoint
    if (context?.lastTestStatus === 'success' && context.lastTestEndpoint) {
      const endpoint = context.lastTestEndpoint
      const sameFamilyTechniques = getTechniqueSameFamily(context.lastTestTechnique || '')

      sameFamilyTechniques.forEach((tech) => {
        const key = `${endpoint}|${tech}`
        if (!testedCombinations.has(key)) {
          const successRate = successRates[tech]?.rate || 50
          suggestions.push({
            endpoint,
            technique: tech,
            confidence: Math.min(successRate * 1.3, 100), // Boost 30%
            priority: successRate > 80 ? 'critical' : successRate > 60 ? 'high' : 'medium',
            reason: `${context.lastTestTechnique} succeeded on this endpoint. ${tech} is in the same attack family.`,
            suggested_payload: generatePayload(tech, endpoint),
            context: {
              related_success: context.lastTestTechnique,
              strategy: 'same_endpoint_similar_technique',
            },
          })
        }
      })
    }

    // 5. STRATÉGIE 2: High-value targets non testés
    const highValueKeywords = ['/admin', '/api', '/checkout', '/payment', '/user', '/account']
    endpoints.forEach((endpoint) => {
      const isHighValue = highValueKeywords.some((kw) => endpoint.includes(kw))
      if (!isHighValue) return

      allTechniques.forEach((tech) => {
        const key = `${endpoint}|${tech}`
        if (!testedCombinations.has(key)) {
          const successRate = successRates[tech]?.rate || 50
          suggestions.push({
            endpoint,
            technique: tech,
            confidence: Math.min(successRate * 1.5, 100), // Boost 50% pour high-value
            priority: 'critical',
            reason: `High-value endpoint detected (${endpoint}). ${tech} is critical to test.`,
            suggested_payload: generatePayload(tech, endpoint),
            context: {
              high_value_target: true,
              strategy: 'high_value_endpoint',
            },
          })
        }
      })
    })

    // 6. STRATÉGIE 3: Techniques avec taux de succès > 70% sur endpoints non testés
    const highSuccessTechniques = Object.entries(successRates)
      .filter(([_, data]) => data.rate > 70)
      .map(([tech]) => tech)

    endpoints.forEach((endpoint) => {
      highSuccessTechniques.forEach((tech) => {
        const key = `${endpoint}|${tech}`
        if (!testedCombinations.has(key)) {
          const successRate = successRates[tech]?.rate || 50
          suggestions.push({
            endpoint,
            technique: tech,
            confidence: successRate,
            priority: successRate > 85 ? 'high' : 'medium',
            reason: `${tech} has ${successRate.toFixed(0)}% success rate on this project. Recommended.`,
            suggested_payload: generatePayload(tech, endpoint),
            context: {
              success_rate: successRate,
              strategy: 'high_success_rate_technique',
            },
          })
        }
      })
    })

    // 7. STRATÉGIE 4: Endpoints avec au moins 1 vulnérabilité confirmée → tester autres techniques
    const vulnerableEndpoints = [...new Set(successfulTests.map((t) => t.endpoint))]
    vulnerableEndpoints.forEach((endpoint) => {
      allTechniques.forEach((tech) => {
        const key = `${endpoint}|${tech}`
        if (!testedCombinations.has(key)) {
          const successRate = successRates[tech]?.rate || 50
          suggestions.push({
            endpoint,
            technique: tech,
            confidence: Math.min(successRate * 1.2, 100), // Boost 20%
            priority: successRate > 70 ? 'high' : 'medium',
            reason: `This endpoint has confirmed vulnerabilities. ${tech} should be tested.`,
            suggested_payload: generatePayload(tech, endpoint),
            context: {
              vulnerable_endpoint: true,
              strategy: 'confirmed_vulnerable_endpoint',
            },
          })
        }
      })
    })

    // 8. Trier par priorité + confiance et retourner top 5
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    suggestions.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return b.confidence - a.confidence
    })

    // Retourner top 5 suggestions uniques
    const uniqueSuggestions = suggestions.filter(
      (sug, idx, self) =>
        idx === self.findIndex((s) => s.endpoint === sug.endpoint && s.technique === sug.technique)
    )

    return uniqueSuggestions.slice(0, 5)
  } catch (error) {
    console.error('[generateNextTestSuggestions] Error:', error)
    return []
  }
}

/**
 * Retourne techniques de la même famille (ex: SQLi → NoSQLi, XSS → SSTI)
 */
function getTechniqueSameFamily(technique: string): string[] {
  const families: Record<string, string[]> = {
    SQLi: ['IDOR', 'Auth', 'BizLogic'], // DB-related attacks
    XSS: ['CSRF', 'SSRF'], // Client/Request manipulation
    IDOR: ['SQLi', 'Auth', 'Priv.Esc'], // Access control
    Auth: ['IDOR', 'Priv.Esc', 'CSRF'], // Authentication/Authorization
    SSRF: ['RCE', 'LFI', 'XXE'], // Server-side attacks
    RCE: ['SSRF', 'LFI', 'FileUpload'], // Code execution
    LFI: ['RCE', 'XXE', 'FileUpload'], // File-based
    FileUpload: ['RCE', 'LFI', 'XSS'], // Upload-based
  }

  return families[technique] || []
}

/**
 * Génère un payload suggéré basé sur la technique et l'endpoint
 */
function generatePayload(technique: string, endpoint: string): string {
  const payloads: Record<string, string> = {
    SQLi: "admin' OR 1=1--",
    XSS: '<script>alert(1)</script>',
    IDOR: endpoint.includes('{id}')
      ? endpoint.replace('{id}', '999999')
      : `${endpoint}${endpoint.endsWith('/') ? '' : '/'}999999`,
    CSRF: 'Test without CSRF token or with manipulated token',
    Auth: 'Access without authentication header or with invalid token',
    BizLogic: 'Test negative values, extreme inputs, race conditions',
    SSRF: 'http://127.0.0.1:80/admin or http://metadata.google.internal',
    RCE: '; cat /etc/passwd or $(whoami)',
    LFI: '../../../../etc/passwd or ..\\..\\..\\windows\\system32\\config\\sam',
    XXE: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
    'Priv.Esc': 'Test role manipulation, privilege escalation via parameter tampering',
    FileUpload: 'Upload .php, .jsp, .exe files or double extension (.php.jpg)',
  }

  return payloads[technique] || 'Test payload'
}

/**
 * Sauvegarde les suggestions en base (suggestions_queue)
 * Utilise le schéma EXISTANT avec type='pattern' et suggestion=jsonb
 */
export async function saveSuggestionsToQueue(
  projectId: string,
  suggestions: Suggestion[]
): Promise<void> {
  if (suggestions.length === 0) return

  try {
    // Adapter au schéma existant: type + suggestion (jsonb)
    const records = suggestions.map((sug) => ({
      project_id: projectId,
      type: 'pattern', // Type existant dans l'ancien schéma
      status: 'pending',
      confidence: sug.confidence / 100, // 0-1 au lieu de 0-100
      suggestion: {
        // Tout dans JSONB
        endpoint: sug.endpoint,
        technique: sug.technique,
        priority: sug.priority,
        reason: sug.reason,
        suggested_payload: sug.suggested_payload,
        context: sug.context,
      },
      metadata: {
        suggestion_type: 'pentest_test',
        generated_by: 'AI',
      },
    }))

    const { error } = await supabase.from('suggestions_queue').insert(records)

    if (error) {
      console.error('[saveSuggestionsToQueue] Error:', error)
    }
  } catch (error) {
    console.error('[saveSuggestionsToQueue] Error:', error)
  }
}
