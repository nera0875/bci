/**
 * Fact Extractor Service
 * Extrait automatiquement des facts atomiques depuis les messages chat
 * Génère embeddings et sauvegarde dans memory_facts table
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export interface ExtractedFact {
  fact: string
  type: 'vulnerability' | 'endpoint' | 'test_result' | 'note' | 'general'
  technique?: 'IDOR' | 'SQLi' | 'XSS' | 'CSRF' | 'SSRF' | 'RCE' | 'LFI' | 'XXE' | string | null
  endpoint?: string | null
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | string | null
  params?: Record<string, any>
  result?: 'success' | 'failed' | null
  severity?: 'critical' | 'high' | 'medium' | 'low' | null
  category?: 'auth' | 'api' | 'business_logic' | 'info_disclosure' | 'preference' | string | null
  confidence: number
  relations?: Array<{
    to_fact_id: string
    type: 'relates_to' | 'caused_by' | 'implies' | 'contradicts'
    strength: number
  }>
}

/**
 * Extrait facts depuis un message IA
 */
export async function extractFactsFromMessage(
  message: string,
  projectId: string,
  apiKey: string
): Promise<number> {
  try {
    // Ignore messages trop courts (< 50 chars)
    if (message.length < 50) {
      return 0
    }

    console.log('🧠 Extracting facts from message...')

    // 1. LLM extraction avec structured output
    const prompt = `Extract structured facts from this pentest/security testing message.

Message: "${message}"

Return a JSON array of facts. Only extract meaningful, atomic facts (1 fact = 1 sentence).

Format:
[{
  "fact": "Short summary (1 sentence, max 100 chars)",
  "type": "vulnerability" | "endpoint" | "test_result" | "note" | "general",
  "technique": "IDOR" | "SQLi" | "XSS" | "CSRF" | null,
  "endpoint": "/api/path" | null,
  "method": "POST" | "GET" | null,
  "params": {"key": "value"} | {},
  "result": "success" | "failed" | null,
  "severity": "critical" | "high" | "medium" | "low" | null,
  "category": "auth" | "api" | "business_logic" | "preference" | null,
  "confidence": 0.0-1.0
}]

Examples:
- "Found IDOR in /api/users/123" → {fact: "IDOR vulnerability in /api/users/{id}", type: "vulnerability", technique: "IDOR", endpoint: "/api/users/{id}", result: "success", severity: "high", confidence: 0.95}
- "Tested SQLi on /login, failed" → {fact: "SQLi test failed on /login endpoint", type: "test_result", technique: "SQLi", endpoint: "/login", result: "failed", confidence: 0.9}
- "User prefers testing APIs over web apps" → {fact: "User preference: API testing", type: "note", category: "preference", confidence: 0.85}
- "API uses JWT in Authorization header" → {fact: "API authentication uses JWT tokens", type: "endpoint", category: "auth", confidence: 1.0}

Rules:
- Only extract facts that are objectively true and meaningful
- Ignore greetings, questions, and meta-commentary
- Each fact must be atomic (single concept)
- Confidence should reflect certainty (0.0-1.0)
- Return empty array [] if no meaningful facts found

Return only the JSON array, no other text.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    })

    if (!response.ok) {
      console.error('❌ LLM API error:', response.statusText)
      return 0
    }

    const data = await response.json()
    const factsText = data.content[0].text

    // Parse JSON (handle markdown code blocks)
    const jsonMatch = factsText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.log('⚠️ No facts extracted (empty response)')
      return 0
    }

    const facts: ExtractedFact[] = JSON.parse(jsonMatch[0])

    if (!facts || facts.length === 0) {
      console.log('⚠️ No meaningful facts found')
      return 0
    }

    console.log(`📝 Extracted ${facts.length} fact(s)`)

    // 2. Generate embeddings + insert DB
    let insertedCount = 0

    for (const fact of facts) {
      try {
        // Generate embedding
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: fact.fact
        })

        const embedding = embeddingResponse.data[0].embedding

        // Insert into memory_facts
        const { error: insertError } = await supabase
          .from('memory_facts')
          .insert({
            project_id: projectId,
            fact: fact.fact,
            metadata: fact,
            embedding
          })

        if (insertError) {
          console.error(`❌ Error inserting fact: ${insertError.message}`)
        } else {
          insertedCount++
          console.log(`  ✅ Inserted: "${fact.fact.substring(0, 60)}..."`)
        }

        // Rate limiting (avoid hitting OpenAI limits)
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error: any) {
        console.error(`❌ Error processing fact: ${error.message}`)
      }
    }

    console.log(`✅ Successfully inserted ${insertedCount}/${facts.length} facts`)

    // 3. Update attack_patterns if vulnerability found
    const vulnFacts = facts.filter(f => f.type === 'vulnerability' && f.result === 'success')
    for (const vuln of vulnFacts) {
      if (vuln.technique) {
        await updateAttackPattern(vuln.technique, projectId, true)
      }
    }

    return insertedCount

  } catch (error: any) {
    console.error('❌ Error in extractFactsFromMessage:', error.message)
    return 0
  }
}

/**
 * Update attack_patterns success rate
 */
async function updateAttackPattern(
  technique: string,
  projectId: string,
  success: boolean
): Promise<void> {
  try {
    // Check if pattern exists
    const { data: existing } = await supabase
      .from('attack_patterns')
      .select('id, usage_count, success_count')
      .eq('project_id', projectId)
      .eq('technique', technique)
      .single()

    if (existing) {
      // Update existing
      await supabase
        .from('attack_patterns')
        .update({
          usage_count: existing.usage_count + 1,
          success_count: existing.success_count + (success ? 1 : 0),
          last_success_at: success ? new Date().toISOString() : undefined
        })
        .eq('id', existing.id)
    } else {
      // Create new
      await supabase
        .from('attack_patterns')
        .insert({
          project_id: projectId,
          pattern_type: 'technique',
          pattern: { name: technique },
          technique: technique,
          usage_count: 1,
          success_count: success ? 1 : 0,
          last_success_at: success ? new Date().toISOString() : null
        })
    }

    console.log(`📊 Updated attack pattern: ${technique}`)
  } catch (error: any) {
    console.error('❌ Error updating attack pattern:', error.message)
  }
}

/**
 * Search similar facts (pour détecter contradictions)
 */
export async function findSimilarFacts(
  factText: string,
  projectId: string,
  threshold: number = 0.85
): Promise<any[]> {
  try {
    // Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: factText
    })

    const embedding = embeddingResponse.data[0].embedding

    // Search similar
    const { data, error } = await supabase.rpc('search_memory_facts', {
      query_embedding: embedding,
      filter_project_id: projectId,
      match_threshold: threshold,
      match_count: 5
    })

    if (error) {
      console.error('❌ Error searching similar facts:', error)
      return []
    }

    return data || []
  } catch (error: any) {
    console.error('❌ Error in findSimilarFacts:', error.message)
    return []
  }
}
