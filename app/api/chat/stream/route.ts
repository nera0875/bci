import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

// ✅ SYSTÈME ROBUSTE: System Prompts + Rules (always + conditional) + Memory Facts
import { buildSystemPromptsTextAsync } from '@/lib/services/systemPromptsLoader'
import { createEmbedding } from '@/lib/services/embeddings'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    console.log('🚀 Chat API called with new prompt system')

    const body = await request.json()
    const { messages, projectId, stylePrompt, currentTemplateId } = body

    console.log('📦 Request body:', {
      hasMessages: !!messages,
      messageCount: messages?.length,
      projectId
    })

    if (!messages || !projectId) {
      return NextResponse.json(
        { error: 'Messages and projectId are required' },
        { status: 400 }
      )
    }

    // Get the last user message for context detection
    const lastUserMessage = messages
      .filter((m: any) => m.role === 'user')
      .pop()?.content || ''

    console.log('📝 Last user message:', lastUserMessage.substring(0, 100))

    // ✅ SYSTÈME SIMPLIFIÉ: Pas de détection de contexte, pas de commandes naturelles
    // L'IA répond UNIQUEMENT selon: System Prompts + Rules + Memory Facts

    // PHASE 1.2: RAG SIMILARITY SEARCH - Charger facts + documents pertinents
    let memoryContextFormatted = ''
    try {
      // Créer embedding du message user pour similarity search
      const embedding = await createEmbedding(lastUserMessage)

      if (embedding && embedding.length > 0) {
        // 🧠 Search memory_facts (atomic facts, rapide)
        const { data: memoryFacts } = await (supabase as any).rpc('search_memory_facts', {
          query_embedding: embedding,
          filter_project_id: projectId,
          match_threshold: 0.5,
          match_count: 15
        })

        // ❌ REMOVED: memory_nodes (ancien système Success/Unknown)
        // Nouveau système: uniquement memory_facts

        // Build context (facts priorités car plus pertinents)
        let factsContext = ''
        if (memoryFacts && memoryFacts.length > 0) {
          factsContext = `
## 🧠 MÉMOIRE ACTIVE (${memoryFacts.length} facts pertinents)

${memoryFacts.map((fact: any) => {
  const meta = fact.metadata || {}
  const details = []
  if (meta.category) details.push(`📁 ${meta.category}`)
  if (meta.type) details.push(meta.type)
  if (meta.technique) details.push(meta.technique)
  if (meta.severity) details.push(`⚠️ ${meta.severity}`)
  if (meta.result) details.push(meta.result === 'success' ? '✅ Success' : '❌ Failed')
  if (meta.tags?.length > 0) details.push(`🏷️ ${meta.tags.join(', ')}`)

  return `• ${fact.fact}\n  ${details.join(' | ')} (${(fact.similarity * 100).toFixed(0)}% match)`
}).join('\n\n')}

---
`
          console.log('🧠 RAG loaded:', memoryFacts.length, 'facts')
        }

        // ❌ REMOVED: docsContext (ancien système memory_nodes)

        memoryContextFormatted = factsContext

        if (!memoryFacts?.length) {
          memoryContextFormatted = `
## 📁 MÉMOIRE DU PROJET

Aucune mémoire similaire trouvée (threshold 50%).

---
`
          console.log('⚠️ No similar memory found (threshold 0.5)')
        }
      } else {
        console.warn('⚠️ Embedding creation failed, fallback to recent memory')
        // Fallback: charger facts récents
        const { data: recentFacts } = await supabase
          .from('memory_facts')
          .select('fact, metadata')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (recentFacts && recentFacts.length > 0) {
          memoryContextFormatted = `
## 🧠 MÉMOIRE RÉCENTE (${recentFacts.length} facts)

${recentFacts.map((f: any) => `• ${f.fact} [${f.metadata?.type || 'general'}]`).join('\n')}

---
`
          console.log('📅 Fallback: loaded', recentFacts.length, 'recent facts')
        }
      }
    } catch (err) {
      console.warn('⚠️ Memory load failed (non-blocking):', err)
      memoryContextFormatted = ''
    }

    // PHASE 1.2b: GET CUSTOM CATEGORIES (server-side accessible)
    let categoriesContextFormatted = ''
    try {
      const { data: categories } = await supabase
        .from('memory_categories')
        .select('key, label, icon')
        .eq('project_id', projectId)
        .order('label', { ascending: true })

      if (categories && categories.length > 0) {
        categoriesContextFormatted = `
## 📁 CATÉGORIES DISPONIBLES (${categories.length} catégories)

**IMPORTANT**: Quand tu ranges un fact, utilise UNE de ces catégories existantes:

${categories.map((cat: any) => `- **${cat.icon} ${cat.label}** (key: \`${cat.key}\`)`).join('\n')}

⚠️ Si aucune catégorie ne correspond, laisse le champ category vide (pas de nouvelle catégorie auto).

---
`
        console.log('📁 Loaded', categories.length, 'custom categories')
      }
    } catch (err) {
      console.warn('⚠️ Categories load failed (non-blocking):', err)
    }

    // PHASE 1.3: GET ACTIVE RULES FROM PROJECT (Structured)
    // Séparer rules "always" (instructions permanentes) VS rules "conditional" (déclenchées par contexte)
    let rulesAlwaysFormatted = ''
    let rulesConditionalFormatted = ''
    let focusedRules: any[] = []
    try {
      const { data: activeRules } = await supabase
        .from('rules')
        .select('id, name, icon, category, trigger_type, trigger_config, action_type, action_config, action_instructions, target_categories, target_tags, enabled, sort_order')
        .eq('project_id', projectId)
        .eq('enabled', true)
        .order('sort_order', { ascending: true })
        .limit(50)

      if (activeRules && activeRules.length > 0) {
        focusedRules = activeRules

        // ✅ AUTO-LOAD RULES LINKED TO CURRENT TEMPLATE
        if (currentTemplateId) {
          console.log('🎨 Loading rules linked to template:', currentTemplateId)
          const { data: linkedRules } = await supabase
            .from('rules')
            .select('id, name, icon, category, trigger_type, trigger_config, action_type, action_config, action_instructions, target_categories, target_tags, enabled, sort_order')
            .eq('project_id', projectId)
            .eq('linked_template_id', currentTemplateId)
            .eq('enabled', true)
            .order('sort_order', { ascending: true })

          if (linkedRules && linkedRules.length > 0) {
            // Merge avec les rules déjà chargées (éviter doublons)
            const existingIds = new Set(focusedRules.map((r: any) => r.id))
            const newRules = linkedRules.filter((r: any) => !existingIds.has(r.id))
            focusedRules = [...focusedRules, ...newRules]
            console.log(`✅ Added ${newRules.length} rules from template (total: ${focusedRules.length})`)
          }
        }

        // ✅ SÉPARER : Rules "always" (instructions permanentes) VS Rules "conditional"
        const rulesAlways = focusedRules.filter((r: any) => r.trigger_type === 'always')
        const rulesConditional = focusedRules.filter((r: any) => r.trigger_type !== 'always')

        // Format rules "always" (instructions permanentes - injectées AVANT la mémoire)
        if (rulesAlways.length > 0) {
          rulesAlwaysFormatted = `
## 📋 INSTRUCTIONS SYSTÈME (${rulesAlways.length} directives permanentes)

${rulesAlways.map(rule => {
  return rule.action_instructions || 'Instruction non définie'
}).join('\n\n---\n\n')}
`
          console.log(`📋 ${rulesAlways.length} rules "always" loaded (system instructions)`)
        }

        // Format rules "conditional" (déclenchées par contexte)
        if (rulesConditional.length > 0) {
          rulesConditionalFormatted = `
## ⚙️ RÈGLES CONDITIONNELLES (${rulesConditional.length} playbooks)

**⚠️ IMPORTANT - CIBLAGE DES RÈGLES:**
Certaines règles ont un CIBLAGE (target categories/tags). Tu dois RESPECTER ce ciblage strictement :
- Si une règle cible 'category=success', elle ne s'applique QU'AUX facts avec 'metadata.category=success'
- Si une règle cible 'tags=[idor]', elle ne s'applique QU'AUX facts avec 'metadata.tags' contenant 'idor'
- Si pas de ciblage (🎯 absent), la règle s'applique à TOUS les facts

${rulesConditional.map(rule => {
  const ruleIcon = rule.icon || '🎯'

  let triggerDesc = 'Non défini'
  if (rule.trigger_type === 'endpoint') {
    triggerDesc = `Endpoint: ${rule.trigger_config?.url_pattern || 'N/A'} (${rule.trigger_config?.http_method || 'ANY'})`
  } else if (rule.trigger_type === 'context') {
    const keywords = rule.trigger_config?.keywords || []
    triggerDesc = keywords.length > 0
      ? `Si message contient: ${keywords.join(' OU ')}`
      : 'Aucun mot-clé défini'
  }

  // Utiliser action_instructions si disponible, sinon fallback sur action_type
  let actionDesc = 'Non défini'
  if (rule.action_instructions) {
    actionDesc = rule.action_instructions
  } else if (rule.action_type === 'test') {
    const testType = rule.action_config?.test_type || 'N/A'
    const instructions = rule.action_config?.instructions || ''
    actionDesc = `Test ${testType}${instructions ? ` - ${instructions}` : ''}`
  } else if (rule.action_type === 'store') {
    actionDesc = `Créer automatiquement un fact dans memory_facts`
  }

  let targetingDesc = ''
  const hasTargeting = (rule.target_categories && rule.target_categories.length > 0) ||
                       (rule.target_tags && rule.target_tags.length > 0)

  if (hasTargeting) {
    const catCondition = rule.target_categories && rule.target_categories.length > 0
      ? `category='${rule.target_categories.join("' OU '")}'`
      : null
    const tagCondition = rule.target_tags && rule.target_tags.length > 0
      ? `tags contiennent ['${rule.target_tags.join("', '")}']`
      : null

    const conditions = [catCondition, tagCondition].filter(Boolean).join(' ET ')
    targetingDesc = `\n- 🎯 **CIBLAGE STRICT**: Cette règle ne s'applique QUE si le fact a ${conditions}\n  ⚠️ Si le fact ne match pas ces conditions, IGNORE cette règle complètement.`
  }

  return `
**${ruleIcon} [${rule.category || 'custom'}] ${rule.name}**
- QUAND: ${triggerDesc}
- ALORS: ${actionDesc}${targetingDesc}
`
}).join('\n')}

⚠️ **INSTRUCTIONS STRICTES** :
- Si le message user contient un mot-clé d'une règle → applique cette règle automatiquement
- Si une règle a un CIBLAGE → applique-la uniquement sur les facts qui matchent les categories/tags
- Quand action = "test" → teste l'endpoint avec variations selon les instructions
- Quand action = "store" → crée un fact dans memory_facts avec les métadonnées appropriées

---
`
          console.log(`⚙️ ${rulesConditional.length} rules "conditional" loaded`)
        }

        console.log(`✅ Rules loaded: ${rulesAlways.length} always + ${rulesConditional.length} conditional = ${focusedRules.length} total`)
      } else {
        console.log('⚠️ No active rules for this project')
      }
    } catch (err) {
      console.warn('⚠️ Rules load failed (non-blocking):', err)
    }

    // 🎯 AUTO-DETECT MATCHING RULES based on user message
    let matchedRulesPrompt = ''

    if (focusedRules.length > 0 && lastUserMessage) {
      const matchingRules: any[] = []
      const messageLower = lastUserMessage.toLowerCase()

      for (const rule of focusedRules) {
        let matches = false

        // Check trigger type
        if (rule.trigger_type === 'context') {
          const keywords = rule.trigger_config?.keywords || []
          // Si UN des keywords est dans le message → match
          matches = keywords.some((kw: string) =>
            messageLower.includes(kw.toLowerCase())
          )
        } else if (rule.trigger_type === 'endpoint') {
          // Check si message mentionne un endpoint
          const pattern = rule.trigger_config?.url_pattern || ''
          if (pattern) {
            matches = messageLower.includes(pattern.toLowerCase())
          }
        }

        if (matches) {
          matchingRules.push(rule)
          console.log(`✅ Rule auto-detected: "${rule.name}"`)
        }
      }

      // Si rules matchées, créer un prompt renforcé
      if (matchingRules.length > 0) {
        matchedRulesPrompt = `

🚨 **ALERTE : ${matchingRules.length} RÈGLE(S) DÉTECTÉE(S) AUTOMATIQUEMENT POUR CE MESSAGE** 🚨

${matchingRules.map(rule => {
  let actionDesc = ''
  if (rule.action_type === 'store') {
    actionDesc = 'RANGER le résultat dans Memory Facts'
  } else if (rule.action_type === 'analyze') {
    actionDesc = 'ANALYSER la réponse en détail'
  } else if (rule.action_type === 'extract') {
    actionDesc = `EXTRAIRE: ${rule.action_config?.parameter || 'données'}`
  } else if (rule.action_type === 'test') {
    actionDesc = `TESTER: ${rule.action_config?.test_type || 'sécurité'}`
  }

  return `
🔴 **RÈGLE ACTIVE : "${rule.name}"**
- ✅ ACTION REQUISE : ${actionDesc}
- 📝 Description : ${rule.description || 'N/A'}
`
}).join('\n')}

⚠️ **INSTRUCTIONS IMPÉRATIVES** :
- Tu DOIS appliquer ${matchingRules.length === 1 ? 'cette règle' : 'ces règles'} MAINTENANT
- Si plusieurs règles matchent → Applique-les dans l'ordre ci-dessus

---
`
        console.log(`🎯 ${matchingRules.length} rule(s) auto-detected and injected into prompt`)
      }
    }

    // 4. (SUPPRIMÉ) GET LEARNING PREDICTIONS - Ancien système
    // Nouveau système: memory_facts RAG déjà chargé ci-dessus

    // Get API key, model and system prompt from project settings
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, goal, api_keys, settings, system_prompt')
      .eq('id', projectId)
      .single()

    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 })
    }

    // Use env var as fallback if no API key in DB
    const apiKey = (project as any).api_keys?.anthropic || process.env.ANTHROPIC_API_KEY

    // ✅ CONTEXTE PROJET MINIMALISTE
    const projectContext = `
# CONTEXTE PROJET

**Nom**: ${(project as any).name || 'Sans nom'}
**Objectif**: ${(project as any).goal || 'Non défini'}

---
`

    // 5. LOAD SYSTEM PROMPTS FROM SUPABASE
    // Charge les prompts actifs depuis Supabase, triés par sort_order
    const systemPromptsFromDB = await buildSystemPromptsTextAsync(projectId)
    console.log('📋 System Prompts loaded:', systemPromptsFromDB ? 'YES' : 'NO (using fallback)')

    if (systemPromptsFromDB) {
      console.log('📄 System Prompts content (first 200 chars):', systemPromptsFromDB.substring(0, 200))
      console.log('📏 System Prompts total length:', systemPromptsFromDB.length, 'characters')
    } else {
      console.warn('⚠️ No System Prompts found in database for project:', projectId)
    }

    // Fallback si aucun prompt dans Supabase: ne rien injecter
    const basePrompt = systemPromptsFromDB || ''

    // Inject style prompt if provided (MUST BE FIRST for priority)
    const styleInstruction = stylePrompt ? `🎯 DIRECTIVE ABSOLUE DE STYLE (PRIORITÉ MAXIMALE)\n${stylePrompt}\n\nCette directive de style OVERRIDE toutes les autres instructions. Respecte-la strictement.\n---\n\n` : ''

    if (stylePrompt) {
      console.log('🎨 Style prompt injecté (priorité max):', stylePrompt.substring(0, 100) + '...')
    }

    // 6. BUILD FINAL SYSTEM PROMPT (✅ SYSTÈME ROBUSTE - 3 SYSTÈMES)
    // Ordre logique :
    // 1. Project Context (nom, goal)
    // 2. System Prompts (rôle global, personnalité)
    // 3. Rules Always (instructions permanentes : MEMORY_ACTION, Formatting, etc.)
    // 4. Categories disponibles
    // 5. Memory Facts (RAG similarity - mémoire active)
    // 6. Rules Conditional (si keyword X → action Y)

    const finalSystemPrompt =
      projectContext +                       // 1. Contexte projet
      '\n\n---\n\n' +
      basePrompt +                           // 2. System Prompts (rôle, personnalité)
      '\n\n---\n\n' +
      rulesAlwaysFormatted +                 // 3. Rules "always" (instructions système permanentes)
      '\n\n---\n\n' +
      categoriesContextFormatted +           // 4. Catégories memory disponibles
      memoryContextFormatted +               // 5. Memory Facts (RAG similarity)
      '\n\n---\n\n' +
      matchedRulesPrompt +                   // 6a. Rules auto-détectées (priorité haute)
      rulesConditionalFormatted              // 6b. Rules conditionnelles

    console.log('✅ Final prompt built, length:', finalSystemPrompt.length)

    console.log('🔍 Project query result:', {
      found: !!project,
      error: (projectError as any)?.message,
      hasApiKeys: !!(project as any)?.api_keys,
      hasSettings: !!(project as any)?.settings
    })

    const anthropicApiKey = (project as any)?.api_keys?.anthropic

    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'No Anthropic API key configured for this project' },
        { status: 400 }
      )
    }
    // Correct model name format - handle various formats
    let customModel = (project as any)?.settings?.aiModel || 'claude-sonnet-4-5'

    // Updated valid models list based on official Claude docs
    const validModels = [
      // Claude Sonnet 4.5 (Latest)
      'claude-sonnet-4-5-20250929',
      'claude-sonnet-4-5',
      // Claude Sonnet 4
      'claude-sonnet-4-20250514',
      'claude-sonnet-4-0',
      // Claude Sonnet 3.7
      'claude-3-7-sonnet-20250219',
      'claude-3-7-sonnet-latest',
      // Claude Opus 4.1
      'claude-opus-4-1-20250805',
      'claude-opus-4-1',
      // Claude Opus 4
      'claude-opus-4-20250514',
      'claude-opus-4-0',
      // Claude Haiku 3.5
      'claude-3-5-haiku-20241022',
      'claude-3-5-haiku-latest',
      // Claude Haiku 3
      'claude-3-haiku-20240307',
      // Legacy models still supported
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229'
    ]

    // Model corrections for common mistakes
    const modelCorrections: { [key: string]: string } = {
      'claude-3-5-sonnet-latest': 'claude-sonnet-4-5',
      'claude-3.5-sonnet': 'claude-sonnet-4-5',
      'claude-35-sonnet': 'claude-sonnet-4-5',
      'claude-3-5-sonnet-20241022': 'claude-sonnet-4-5'
    }

    // Check if it's a known wrong format
    if (modelCorrections[customModel]) {
      console.log(`📝 Correcting model from "${customModel}" to "${modelCorrections[customModel]}"`)
      customModel = modelCorrections[customModel]
    }

    // Validate the model
    if (!validModels.includes(customModel)) {
      console.warn(`⚠️ Invalid model "${customModel}", defaulting to claude-sonnet-4-5`)
      customModel = 'claude-sonnet-4-5' // Default to latest Sonnet
    }

    console.log('🔑 API Configuration:', {
      hasAnthropicKey: !!anthropicApiKey,
      fromProject: !!(project as any)?.api_keys?.anthropic,
      fromEnv: !!process.env.ANTHROPIC_API_KEY,
      model: customModel,
      keyLength: anthropicApiKey?.length
    })

    if (!anthropicApiKey) {
      console.error('❌ No API key available')
      return NextResponse.json(
        {
          error: 'Anthropic API key not configured',
          hint: 'Please set your API key in the Settings panel or in environment variables'
        },
        { status: 400 }  // Changed to 400 to match client expectation
      )
    }

    // ❌ SUPPRIMÉ: ConversationManager cache (ancien système)

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    })

    // Create the stream with custom model
    const stream = await anthropic.messages.create({
      model: customModel,
      max_tokens: 2000,
      temperature: 0.7,
      system: finalSystemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      stream: true,
    })

    // PHASE 2.1: Variables pour tracking tokens
    let fullResponse = ''
    let inputTokens = 0
    let outputTokens = 0

    // Create a readable stream for the response
    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          console.log('🌊 Starting stream processing...')

          for await (const chunk of stream) {
            // PHASE 2.1: Capturer tokens usage
            if (chunk.type === 'message_start') {
              inputTokens = (chunk as any).message?.usage?.input_tokens || 0
              console.log('📊 Input tokens:', inputTokens)
            }

            if (chunk.type === 'content_block_delta') {
              const content = (chunk.delta as any).text || ''
              fullResponse += content

              // Send content to client
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'content',
                text: content
              })}\n\n`))
            }

            // PHASE 2.1: Capturer output tokens
            if (chunk.type === 'message_delta') {
              const deltaTokens = (chunk as any).usage?.output_tokens || 0
              outputTokens += deltaTokens
            }

            if (chunk.type === 'message_stop') {
              // PHASE 2.1: Calculer coût API
              const API_PRICING: Record<string, { input: number; output: number }> = {
                'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
                'claude-sonnet-4-5': { input: 3, output: 15 },
                'claude-opus-4-1-20250805': { input: 15, output: 75 },
                'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
                'claude-3-opus-20240229': { input: 15, output: 75 }
              }

              const pricing = API_PRICING[customModel] || API_PRICING['claude-sonnet-4-5']
              const costInDollars = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000

              console.log('💰 API Cost:', {
                model: customModel,
                inputTokens,
                outputTokens,
                cost: `$${costInDollars.toFixed(6)}`
              })

              // Envoyer métadonnées tokens au client pour sauvegarde
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'usage',
                model: customModel,
                tokens: { input: inputTokens, output: outputTokens },
                cost: costInDollars,
                cached: false
              })}\n\n`))

              // ✅ SYSTÈME ROBUSTE: Validation temps réel via MEMORY_ACTION
              console.log('🎬 Stream completed')

              // ❌ DÉSACTIVÉ: factExtractor arrière-plan (système bugué, hors contrôle)
              // ✅ NOUVEAU: L'IA génère <!--MEMORY_ACTION--> pendant sa réponse
              // Le frontend (ChatStream) détecte ces blocs et affiche validation inline

              try {
                // Note: pending_facts ne sont plus utilisés
                // Toutes les modifications mémoire passent par MEMORY_ACTION + validation user
                console.log('✅ Streaming done - awaiting user validation for any MEMORY_ACTION')
              } catch (storageError) {
                console.error('⚠️ Storage error (non-blocking):', storageError)
              }

              // Send completion signal
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'done'
              })}\n\n`))
              controller.close()
              console.log('✅ Stream completed successfully')
            }
          }
        } catch (error) {
          console.error('❌ Streaming error:', error)
          controller.error(error)
        }
      }
    })

    // Return the streaming response
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('❌ Chat API error:', {
      message: error.message,
      status: error.status,
      type: error.type,
      stack: error.stack?.split('\n').slice(0, 3)
    })

    // Better error messages
    let errorMessage = 'Failed to process chat request'
    let statusCode = 500

    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid API key. Please check your settings.'
      statusCode = 401
    } else if (error.message?.includes('model')) {
      errorMessage = 'Invalid model specified. Please check your settings.'
      statusCode = 400
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please wait a moment.'
      statusCode = 429
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error.message,
        hint: 'Check the console for more details'
      },
      { status: statusCode }
    )
  }
}

// OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
