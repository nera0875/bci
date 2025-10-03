import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// Import our new prompt system
import {
  detectContext,
  selectPrompt,
  extractTechnique,
  detectSuccess
} from '@/lib/services/promptSystem'
import {
  parseNaturalCommand,
  commandToApiCall,
  generateCommandResponse
} from '@/lib/services/commandParser'
import {
  buildFinalPrompt,
  formatMemoryContext,
  formatLearningPredictions
} from '@/lib/services/systemPrompt'
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
    const { messages, projectId } = body

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

    // PHASE 1.2: GET REAL MEMORY NODES FROM PROJECT
    let memoryContextFormatted = ''
    try {
      // Charger les VRAIS documents mémoire du projet
      const { data: memoryNodes } = await supabase
        .from('memory_nodes')
        .select('id, name, type, content, path')
        .eq('project_id', projectId)
        .eq('type', 'document')
        .order('updated_at', { ascending: false })
        .limit(10) // Top 10 documents les plus récents

      if (memoryNodes && memoryNodes.length > 0) {
        memoryContextFormatted = `
## 📁 MÉMOIRE DU PROJET

${memoryNodes.map(node => `
**[${node.path}] ${node.name}**
${node.content ? node.content.substring(0, 300) + (node.content.length > 300 ? '...' : '') : '(vide)'}
`).join('\n')}

---
`
        console.log('🧠 Memory nodes loaded:', memoryNodes.length, 'documents')
      } else {
        memoryContextFormatted = `
## 📁 MÉMOIRE DU PROJET

Aucun document en mémoire pour ce projet.
Dis-le clairement à l'utilisateur au lieu d'inventer du contenu.

---
`
        console.log('⚠️ No memory nodes found for project')
      }
    } catch (err) {
      console.warn('⚠️ Memory load failed (non-blocking):', err)
      memoryContextFormatted = ''
    }

    // PHASE 1.3: GET ACTIVE RULES FROM PROJECT
    let rulesContextFormatted = ''
    try {
      const { data: activeRules } = await supabase
        .from('rules')
        .select('id, name, trigger, action, enabled')
        .eq('project_id', projectId)
        .eq('enabled', true)
        .limit(20)

      if (activeRules && activeRules.length > 0) {
        rulesContextFormatted = `
## ⚙️ RÈGLES ACTIVES DU PROJET

${activeRules.map(rule => `
**${rule.name}**
- TRIGGER: ${rule.trigger || 'Non défini'}
- ACTION: ${rule.action || 'Non défini'}
`).join('\n')}

⚠️ Respecte ces règles pour ce projet uniquement.

---
`
        console.log('⚙️ Active rules loaded:', activeRules.length, 'rules')
      } else {
        console.log('⚠️ No active rules for this project')
      }
    } catch (err) {
      console.warn('⚠️ Rules load failed (non-blocking):', err)
    }

    // 4. GET LEARNING PREDICTIONS
    const predictions = await learningSystem.getPredictions(context, 5)
    const predictionsFormatted = formatLearningPredictions(predictions)
    console.log('📊 Learning predictions:', predictions.length)

    // Get API key, model and system prompt from project settings
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, goal, api_keys, settings, system_prompt')
      .eq('id', projectId)
      .single()

    // Use env var as fallback if no API key in DB
    const apiKey = project?.api_keys?.anthropic || process.env.ANTHROPIC_API_KEY

    // PHASE 1.1: BUILD PROJECT CONTEXT (Isolation)
    const projectContext = `
# CONTEXTE PROJET ACTUEL

**PROJET**: ${project?.name || 'Sans nom'}
**ID**: ${projectId}
**OBJECTIF**: ${project?.goal || 'Non défini'}

⚠️ RÈGLE CRITIQUE: Tu travailles UNIQUEMENT sur ce projet "${project?.name}".
JAMAIS inventer d'autres noms de projets ou de contexte fictif.
Si aucune donnée n'existe, DIS-LE clairement au lieu d'inventer.

---
`

    // 5. BUILD FINAL PROMPT (use project system_prompt if available)
    const basePrompt = project?.system_prompt || promptTemplate.systemPrompt

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

    const finalSystemPrompt = buildFinalPrompt(
      projectContext + basePrompt,
      memoryContextFormatted + rulesContextFormatted + httpAnalysisFormatted,
      predictionsFormatted
    )

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
                // Detect if success or failure
                const isSuccess = detectSuccess(lastUserMessage + ' ' + fullResponse)
                console.log('🔍 Success detected:', isSuccess)

                if (isSuccess !== null) {
                  // Extract technique
                  const technique = extractTechnique(lastUserMessage)
                  console.log('🔧 Technique extracted:', technique)

                  // Store in memory (simple storage)
                  const type = isSuccess ? 'success' : 'failure'
                  const embedding = await createEmbedding(lastUserMessage)
                  
                  if (embedding && embedding.length > 0) {
                    await supabase
                      .from('memory_chunks')
                      .insert({
                        project_id: projectId,
                        content: `${lastUserMessage}\n\nRésultat: ${fullResponse}`,
                        embedding,
                        metadata: {
                          context,
                          type,
                          technique,
                          auto_stored: true,
                          timestamp: new Date().toISOString()
                        }
                      })
                  }

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

                  // 7. CREATE VISUAL ELEMENTS IN BOARD & SEND NOTIFICATION
                  try {
                    const folderName = isSuccess ? 'Success' : 'Failed'
                    const section = 'memory'
                    
                    const boardResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'http://localhost:3000' : ''}/api/board/auto-create`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        projectId,
                        section,
                        folderName: `${folderName}/${context}`,
                        itemName: technique,
                        itemContent: `${lastUserMessage}\n\nRésultat: ${fullResponse.substring(0, 500)}`,
                        context,
                        technique
                      })
                    })

                    if (boardResponse.ok) {
                      const boardResult = await boardResponse.json()
                      console.log('🎨 Board visual created:', boardResult.message)
                      
                      // Envoyer notification de rangement dans le stream
                      const notificationPath = boardResult.path || `${section}/${folderName}/${context}`
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'storage_notification',
                        icon: isSuccess ? '✅' : '❌',
                        message: `Rangé dans ${notificationPath}`,
                        path: notificationPath,
                        documentId: boardResult.documentId,
                        metadata: {
                          context,
                          technique,
                          success: isSuccess
                        }
                      })}\n\n`))
                    } else {
                      console.warn('⚠️ Board creation failed (non-blocking)')
                    }
                  } catch (boardError) {
                    console.warn('⚠️ Board creation error (non-blocking):', boardError)
                  }
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
