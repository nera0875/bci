import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// Import our new prompt system
import {
  detectContext,
  selectPrompt,
  extractTechnique,
  extractEndpoint,
  detectSuccess
} from '@/lib/services/promptSystem'
import {
  parseNaturalCommand,
  commandToApiCall,
  generateCommandResponse
} from '@/lib/services/commandParser'
import { DEFAULT_MINIMAL_PROMPT } from '@/lib/services/systemPrompt'
import { buildSystemPromptsText } from '@/lib/services/systemPromptsLoader'
import { FORMATTING_INSTRUCTIONS } from '@/lib/services/formattingInstructions'
import { LearningSystem } from '@/lib/services/learningSystem'
import { createEmbedding } from '@/lib/services/embeddings'
import { parseHttpRequests, predictVulnerabilities, analyzeRequestSet } from '@/lib/services/httpParser'
import { ConversationManager } from '@/lib/services/conversation'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Chat API called with new prompt system')

    const body = await request.json()
    const { messages, projectId, stylePrompt } = body

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

    // 0. CHECK FOR NATURAL COMMANDS FIRST
    const parsedCommand = parseNaturalCommand(lastUserMessage)
    if (parsedCommand.confidence > 0.7) {
      console.log('🎯 Natural command detected:', parsedCommand.type, parsedCommand.action)
      
      // Exécuter la commande si possible
      const apiCall = commandToApiCall(parsedCommand)
      if (apiCall) {
        // Envoyer une réponse immédiate pour la commande
        const commandResponse = generateCommandResponse(parsedCommand)
        
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          async start(controller) {
            // Envoyer la réponse de confirmation
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'content',
              text: commandResponse
            })}\n\n`))
            
            // Marquer comme terminé
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'done',
              command_executed: true
            })}\n\n`))
            
            controller.close()
          }
        })
        
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      }
    }

    // Initialize learning system
    const learningSystem = new LearningSystem(projectId)

    // 1. DETECT CONTEXT
    const context = detectContext(lastUserMessage)
    console.log('🎯 Context detected:', context)

    // 1.5 DETECT AND PARSE HTTP REQUESTS
    let httpAnalysis = null
    if (lastUserMessage.includes('GET ') || lastUserMessage.includes('POST ') ||
        lastUserMessage.includes('PUT ') || lastUserMessage.includes('DELETE ') ||
        lastUserMessage.includes('HTTP/')) {

      console.log('🌐 HTTP requests detected, parsing...')
      const parsedRequests = parseHttpRequests(lastUserMessage)

      if (parsedRequests.length > 0) {
        httpAnalysis = analyzeRequestSet(parsedRequests)
        console.log('🔍 Analyzed', parsedRequests.length, 'requests')
        console.log('🎯 Found', httpAnalysis.predictions.length, 'vulnerability predictions')

        // Store predictions in learning system for future improvement
        // TODO: Implement storePattern method in LearningSystem
        // for (const pred of httpAnalysis.predictions) {
        //   await learningSystem.storePattern({
        //     type: pred.type,
        //     confidence: pred.probability,
        //     context: 'http_request_analysis',
        //     suggestion: pred.suggestedTest
        //   })
        // }
      }
    }

    // 2. SELECT EXPERT PROMPT
    const promptTemplate = selectPrompt(context)
    console.log('👨‍💻 Using expert prompt:', promptTemplate.name)

    // PHASE 1.2: RAG SIMILARITY SEARCH - Charger facts + documents pertinents
    let memoryContextFormatted = ''
    try {
      // Créer embedding du message user pour similarity search
      const embedding = await createEmbedding(lastUserMessage)

      if (embedding && embedding.length > 0) {
        // 🧠 Search memory_facts (atomic facts, rapide)
        const { data: memoryFacts } = await supabase.rpc('search_memory_facts', {
          query_embedding: embedding,
          filter_project_id: projectId,
          match_threshold: 0.7,
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

Aucune mémoire similaire trouvée (threshold 70%).

---
`
          console.log('⚠️ No similar memory found (threshold 0.7)')
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

${categories.map(cat => `- **${cat.icon} ${cat.label}** (key: \`${cat.key}\`)`).join('\n')}

⚠️ Si aucune catégorie ne correspond, laisse le champ category vide (pas de nouvelle catégorie auto).

---
`
        console.log('📁 Loaded', categories.length, 'custom categories')
      }
    } catch (err) {
      console.warn('⚠️ Categories load failed (non-blocking):', err)
    }

    // PHASE 1.3: GET ACTIVE RULES FROM PROJECT (Structured)
    let rulesContextFormatted = ''
    let focusedRules: any[] = []
    try {
      const { data: activeRules } = await supabase
        .from('rules')
        .select('id, name, icon, category, trigger_type, trigger_config, action_type, action_config, target_categories, target_tags, enabled')
        .eq('project_id', projectId)
        .eq('enabled', true)
        .limit(50)

      if (activeRules && activeRules.length > 0) {
        focusedRules = activeRules

        rulesContextFormatted = `
## ⚙️ RÈGLES ACTIVES DU PROJET (${focusedRules.length} playbooks)

**⚠️ IMPORTANT - CIBLAGE DES RÈGLES:**
Certaines règles ont un CIBLAGE (target categories/tags). Tu dois RESPECTER ce ciblage strictement :
- Si une règle cible `category='success'`, elle ne s'applique QU'AUX facts avec `metadata.category='success'`
- Si une règle cible `tags=['idor']`, elle ne s'applique QU'AUX facts avec `metadata.tags` contenant 'idor'
- Si pas de ciblage (🎯 absent), la règle s'applique à TOUS les facts

${focusedRules.map(rule => {
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

  let actionDesc = 'Non défini'
  if (rule.action_type === 'test') {
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
        console.log('⚙️ Active rules loaded:', activeRules.length, 'rules')
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
        // Load folder names for matched rules
        const matchedFolderIds = matchingRules
          .flatMap(r => r.target_folders || [])
          .filter((id, index, self) => id && self.indexOf(id) === index)

        let matchedFolderNamesMap: Record<string, string> = {}
        if (matchedFolderIds.length > 0) {
          const { data: folders } = await supabase
            .from('memory_nodes')
            .select('id, name')
            .in('id', matchedFolderIds)
            .eq('type', 'folder')

          if (folders) {
            matchedFolderNamesMap = folders.reduce((acc, f) => ({ ...acc, [f.id]: f.name }), {})
          }
        }

        matchedRulesPrompt = `

🚨 **ALERTE : ${matchingRules.length} RÈGLE(S) DÉTECTÉE(S) AUTOMATIQUEMENT POUR CE MESSAGE** 🚨

${matchingRules.map(rule => {
  let actionDesc = ''
  if (rule.action_type === 'store') {
    actionDesc = 'RANGER le résultat dans Memory'
  } else if (rule.action_type === 'analyze') {
    actionDesc = 'ANALYSER la réponse en détail'
  } else if (rule.action_type === 'extract') {
    actionDesc = `EXTRAIRE: ${rule.action_config?.parameter || 'données'}`
  } else if (rule.action_type === 'test') {
    actionDesc = `TESTER: ${rule.action_config?.test_type || 'sécurité'}`
  }

  let folderInstruction = ''
  if (rule.target_folders && rule.target_folders.length > 0) {
    const folderNames = rule.target_folders
      .map(id => matchedFolderNamesMap[id] || 'Unknown')
      .join(', ')
    folderInstruction = `\n📁 **DOSSIER OBLIGATOIRE**: "${folderNames}" - NE PAS créer de nouveau dossier, utiliser celui-ci UNIQUEMENT`
  }

  return `
🔴 **RÈGLE ACTIVE : "${rule.name}"**
- ✅ ACTION REQUISE : ${actionDesc}${folderInstruction}
- 📝 Description : ${rule.description || 'N/A'}
`
}).join('\n')}

⚠️ **INSTRUCTIONS IMPÉRATIVES** :
- Tu DOIS appliquer ${matchingRules.length === 1 ? 'cette règle' : 'ces règles'} MAINTENANT
- Si un dossier est spécifié → Range UNIQUEMENT dedans, ne crée PAS de nouveau dossier
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

    // Use env var as fallback if no API key in DB
    const apiKey = project?.api_keys?.anthropic || process.env.ANTHROPIC_API_KEY

    // PHASE 1.1: BUILD PROJECT CONTEXT (Isolation) + BIZLOGIC AWARENESS
    // Load discovered endpoints from memory_facts
    const { data: discoveredEndpoints } = await supabase
      .from('memory_facts')
      .select('metadata')
      .eq('project_id', projectId)
      .not('metadata->endpoint', 'is', null)
      .limit(50)

    const uniqueEndpoints = new Set(
      discoveredEndpoints?.map(f => f.metadata?.endpoint).filter(Boolean) || []
    )

    const { data: testedCategories } = await supabase
      .from('memory_facts')
      .select('metadata')
      .eq('project_id', projectId)
      .not('metadata->category', 'is', null)
      .limit(100)

    const categoryCounts: Record<string, number> = {}
    testedCategories?.forEach(f => {
      const cat = f.metadata?.category
      if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    })

    const projectContext = `
# CONTEXTE PROJET ACTUEL

**PROJET**: ${project?.name || 'Sans nom'}
**ID**: ${projectId}
**OBJECTIF**: ${project?.goal || 'Non défini'}
**TYPE**: Business Logic Pentesting (Burp Suite)

## 🎯 ENDPOINTS DÉCOUVERTS (${uniqueEndpoints.size} endpoints)

${uniqueEndpoints.size > 0
  ? Array.from(uniqueEndpoints).map(e => `- ${e}`).join('\n')
  : '(Aucun endpoint testé pour le moment)'}

## 📊 TESTS EFFECTUÉS PAR CATÉGORIE

${Object.keys(categoryCounts).length > 0
  ? Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, count]) => `- **${cat}**: ${count} test${count > 1 ? 's' : ''}`)
      .join('\n')
  : '(Aucun test enregistré)'}

⚠️ **RÈGLE CRITIQUE**: Tu travailles UNIQUEMENT sur ce projet "${project?.name}".
- JAMAIS inventer d'autres noms de projets ou de contexte fictif
- Si aucune donnée n'existe, DIS-LE clairement au lieu d'inventer
- Focus BizLogic: payment_manipulation, workflow_bypass, race_condition, privilege_escalation

---
`

    // 5. LOAD SYSTEM PROMPTS FROM PANEL (localStorage)
    // Charge les prompts cochés actifs, triés par priorité
    const systemPromptsFromPanel = buildSystemPromptsText(projectId)
    console.log('📋 System Prompts Panel loaded:', systemPromptsFromPanel ? 'YES' : 'NO (using fallback)')

    // Fallback si aucun prompt coché: utiliser project.system_prompt ou DEFAULT_MINIMAL_PROMPT
    const basePrompt = systemPromptsFromPanel || project?.system_prompt || DEFAULT_MINIMAL_PROMPT

    // Add HTTP analysis to the prompt if available
    let httpAnalysisFormatted = ''
    if (httpAnalysis) {
      httpAnalysisFormatted = `
## HTTP Request Analysis

**Endpoints detected:** ${httpAnalysis.endpoints.join(', ')}
**Methods:** ${httpAnalysis.methods.join(', ')}
**Parameters:** ${httpAnalysis.commonParams.join(', ')}

### Vulnerability Predictions:
${httpAnalysis.predictions.map(p => `
- **${p.type}** (${(p.probability * 100).toFixed(0)}% probability)
  Reason: ${p.reason}
  Test: ${p.suggestedTest}`).join('\n')}

These predictions are based on pattern analysis. Test each one to confirm.
`
    }

    // Inject style prompt if provided (MUST BE FIRST for priority)
    const styleInstruction = stylePrompt ? `🎯 DIRECTIVE ABSOLUE DE STYLE (PRIORITÉ MAXIMALE)\n${stylePrompt}\n\nCette directive de style OVERRIDE toutes les autres instructions. Respecte-la strictement.\n---\n\n` : ''

    if (stylePrompt) {
      console.log('🎨 Style prompt injecté (priorité max):', stylePrompt.substring(0, 100) + '...')
    }

    // Add MEMORY_ACTION instructions
    const memoryActionInstructions = `

## 💾 COMMANDES MÉMOIRE (CRITICAL)

Tu peux MODIFIER ta mémoire directement. Pour créer/modifier/supprimer des documents, utilise CE FORMAT EXACT :

**CREATE un document :**
\`\`\`
<!--MEMORY_ACTION
{
  "operation": "create",
  "data": {
    "name": "Test Document",
    "type": "document",
    "content": "# Mon Test\\\\n\\\\nContenu ici",
    "parent_name": "Success"
  }
}
-->
\`\`\`

⚠️ **NOM DE FICHIER** : NE PAS mettre .md, .txt ou autre extension. Utilise un nom descriptif simple.
Exemples :
- ✅ "Requete POST Cdiscount"
- ✅ "Analyse XSS"
- ❌ "test.md"
- ❌ "doc.txt"

**UPDATE un document :**
\`\`\`
<!--MEMORY_ACTION
{
  "operation": "update",
  "data": {
    "name": "Test Document",
    "content": "Nouveau contenu"
  }
}
-->
\`\`\`

**APPEND du texte :**
\`\`\`
<!--MEMORY_ACTION
{
  "operation": "append",
  "data": {
    "name": "Test Document",
    "content": "\\\\n\\\\nTexte ajouté"
  }
}
-->
\`\`\`

**DELETE un document :**
\`\`\`
<!--MEMORY_ACTION
{
  "operation": "delete",
  "data": {
    "name": "Test Document"
  }
}
-->
\`\`\`

⚠️ RÈGLES :
- Format JSON valide obligatoire
- Échapper les \\\\n avec \\\\\\\\n dans le JSON
- Le bloc sera invisible pour l'utilisateur
- Utilise-le quand tu dois "ranger", "stocker", "créer" un document

`

    // 6. BUILD FINAL SYSTEM PROMPT (NOUVEAU SYSTÈME PROPRE ET TRANSPARENT)
    // Ordre strict: System Prompts → Rules → Memory → Contexte technique
    const finalSystemPrompt =
      // PARTIE 1: PROMPTS DE BASE (priorité utilisateur)
      styleInstruction +                    // Style temporaire (si présent)
      projectContext +                       // Contexte projet (endpoints, tests)
      basePrompt +                           // System Prompts Panel (cochés actifs)

      // PARTIE 2: RULES (playbooks structurés)
      '\n\n---\n\n' +
      matchedRulesPrompt +                   // Rules auto-détectées (priorité haute)
      rulesContextFormatted +                // Toutes les rules actives

      // PARTIE 3: MEMORY (RAG similarity + Categories)
      '\n\n---\n\n' +
      categoriesContextFormatted +           // Catégories disponibles (Supabase)
      memoryContextFormatted +               // Facts + Docs similaires (RAG)
      httpAnalysisFormatted +                // HTTP analysis

      // PARTIE 4: INSTRUCTIONS TECHNIQUES
      '\n\n---\n\n' +
      memoryActionInstructions +             // Commandes MEMORY_ACTION
      FORMATTING_INSTRUCTIONS                // Instructions formatage

    console.log('✅ Final prompt built, length:', finalSystemPrompt.length)

    console.log('🔍 Project query result:', {
      found: !!project,
      error: projectError?.message,
      hasApiKeys: !!project?.api_keys,
      hasSettings: !!project?.settings
    })

    const anthropicApiKey = project?.api_keys?.anthropic || process.env.ANTHROPIC_API_KEY
    // Correct model name format - handle various formats
    let customModel = project?.settings?.aiModel || 'claude-3-5-sonnet-20241022'

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
      'claude-3-5-sonnet-latest': 'claude-3-5-sonnet-20241022',
      'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022',
      'claude-35-sonnet': 'claude-3-5-sonnet-20241022'
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
      fromProject: !!project?.api_keys?.anthropic,
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

    // PHASE 2.2: CACHE INTELLIGENT - Vérifier cache avant appel API
    const conversationManager = new ConversationManager(projectId)
    const cachedResponse = await conversationManager.checkCache(lastUserMessage, false)

    if (cachedResponse) {
      console.log('💰 CACHE HIT - Économie de 100% des tokens!')

      // Retourner réponse en cache via stream
      const encoder = new TextEncoder()
      const cachedStream = new ReadableStream({
        start(controller) {
          // Envoyer contenu depuis cache
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'content',
            text: cachedResponse
          })}\n\n`))

          // Envoyer métadonnées (coût = 0 car cache)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'usage',
            model: customModel,
            tokens: { input: 0, output: 0 },
            cost: 0,
            cached: true
          })}\n\n`))

          // Fin du stream
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          controller.close()
        }
      })

      return new Response(cachedStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

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

              const pricing = API_PRICING[customModel] || API_PRICING['claude-3-5-sonnet-20241022']
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

              // 6. AUTO-STORAGE AFTER COMPLETION
              console.log('🎬 Stream completed, processing auto-storage...')

              try {
                // 🧠 Extract facts from AI response (Mem0-style)
                const { extractFactsFromMessage } = await import('@/lib/services/factExtractor')
                const factsCount = await extractFactsFromMessage(
                  fullResponse,
                  projectId,
                  process.env.ANTHROPIC_API_KEY || ''
                )
                console.log(`🧠 Extracted ${factsCount} fact(s) from response`)

                // Detect if success or failure
                const isSuccess = detectSuccess(lastUserMessage + ' ' + fullResponse)
                console.log('🔍 Success detected:', isSuccess)

                if (isSuccess !== null) {
                  // Extract technique
                  const technique = extractTechnique(lastUserMessage)
                  console.log('🔧 Technique extracted:', technique)

                  // Note: Auto-storage handled by AI Actions (<!--MEMORY_ACTION-->)
                  // Removed obsolete memory_chunks INSERT (table doesn't exist)

                  // Update learning
                  if (isSuccess) {
                    await learningSystem.recordSuccess({
                      technique,
                      context,
                      target: lastUserMessage,
                      impact: 'Auto-detected from chat'
                    })
                    console.log('✅ Success recorded in learning system')
                  } else {
                    await learningSystem.recordFailure({
                      technique,
                      context,
                      target: lastUserMessage,
                      reason: 'Auto-detected from chat'
                    })
                    console.log('❌ Failure recorded in learning system')
                  }

                  console.log(`📦 Auto-stored in Memory/${isSuccess ? 'Success' : 'Failed'}/${context}`)

                  // ❌ DÉSACTIVÉ: Ancien système memory_nodes Success/Failed
                  // Remplacé par factExtractor.ts → memory_facts uniquement
                  // Note: Learning system toujours actif (lignes 864-880)
                }

                // 🤖 PHASE 4: Auto-parse HTTP requests (Burp) + Detect vulnerabilities
                try {
                  const { OptimizationEngine } = await import('@/lib/services/optimizationEngine')
                  const engine = new OptimizationEngine(projectId)

                  // Parse HTTP requests from user message (Burp format)
                  const httpSuggestions = await engine.analyzeHTTPRequests(lastUserMessage)

                  if (httpSuggestions.length > 0) {
                    console.log(`🔍 Parsed ${httpSuggestions.length} HTTP request(s) from Burp`)

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'http_parsed',
                      count: httpSuggestions.length,
                      message: `🔍 ${httpSuggestions.length} HTTP request(s) captured and stored`
                    })}\n\n`))
                  }

                  // Analyze AI response for vulnerability keywords
                  const vulnSuggestions = await engine.analyzeAIResponse(fullResponse, lastUserMessage)

                  if (vulnSuggestions.length > 0) {
                    console.log(`🚨 Detected potential vulnerability in AI response`)

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'vuln_detected',
                      message: `🚨 Potential vulnerability detected - check Intelligence panel`
                    })}\n\n`))
                  }
                } catch (optimizationError) {
                  console.warn('⚠️ Optimization engine error (non-blocking):', optimizationError)
                }

                // 🤖 PHASE 5: Generate AI test suggestions after each message
                try {
                  const { generateNextTestSuggestions, saveSuggestionsToQueue } = await import('@/lib/services/generateNextTestSuggestions')

                  // Build context from current conversation
                  const testContext = {
                    lastTestEndpoint: extractEndpoint(lastUserMessage),
                    lastTestTechnique: extractTechnique(lastUserMessage),
                    lastTestStatus: isSuccess ? 'success' as const : 'failed' as const,
                  }

                  console.log('🤖 Generating AI test suggestions with context:', testContext)

                  const suggestions = await generateNextTestSuggestions(projectId, testContext)

                  if (suggestions.length > 0) {
                    await saveSuggestionsToQueue(projectId, suggestions)
                    console.log(`🤖 Generated ${suggestions.length} AI suggestions`)

                    // Send suggestion notification in stream
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'ai_suggestions',
                      count: suggestions.length,
                      suggestions: suggestions.slice(0, 3), // Top 3 for preview
                      message: `🤖 ${suggestions.length} new test suggestions generated`
                    })}\n\n`))
                  }
                } catch (suggestionError) {
                  console.warn('⚠️ AI suggestion generation error (non-blocking):', suggestionError)
                }
              } catch (storageError) {
                console.error('⚠️ Auto-storage error (non-blocking):', storageError)
                // Don't fail the response if storage fails
              }

              // Send completion signal
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'done',
                context: context,
                autoStored: detectSuccess(lastUserMessage + ' ' + fullResponse) !== null
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
