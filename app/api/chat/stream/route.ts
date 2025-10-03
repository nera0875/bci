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
        for (const pred of httpAnalysis.predictions) {
          await learningSystem.storePattern({
            type: pred.type,
            confidence: pred.probability,
            context: 'http_request_analysis',
            suggestion: pred.suggestedTest
          })
        }
      }
    }

    // 2. SELECT EXPERT PROMPT
    const promptTemplate = selectPrompt(context)
    console.log('👨‍💻 Using expert prompt:', promptTemplate.name)

    // 3. GET MEMORY CONTEXT (recherche sémantique simple)
    let memoryContextFormatted = ''
    try {
      const { data: memories } = await supabase
        .from('memory_chunks')
        .select('*')
        .eq('project_id', projectId)
        .limit(5)
      
      if (memories && memories.length > 0) {
        memoryContextFormatted = formatMemoryContext({
          successes: memories.filter(m => m.metadata?.type === 'success'),
          failures: memories.filter(m => m.metadata?.type === 'failure')
        })
        console.log('🧠 Memory context loaded:', memories.length, 'items')
      }
    } catch (err) {
      console.warn('⚠️ Memory load failed (non-blocking):', err)
    }

    // 4. GET LEARNING PREDICTIONS
    const predictions = await learningSystem.getPredictions(context, 5)
    const predictionsFormatted = formatLearningPredictions(predictions)
    console.log('📊 Learning predictions:', predictions.length)

    // Get API key, model and system prompt from project settings
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('api_keys, settings, system_prompt')
      .eq('id', projectId)
      .single()

    // Use env var as fallback if no API key in DB
    const apiKey = project?.api_keys?.anthropic || process.env.ANTHROPIC_API_KEY

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
      basePrompt,
      memoryContextFormatted + httpAnalysisFormatted,
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

    // Variable to collect full response for auto-storage
    let fullResponse = ''

    // Create a readable stream for the response
    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          console.log('🌊 Starting stream processing...')
          
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta') {
              const content = (chunk.delta as any).text || ''
              fullResponse += content
              
              // Send content to client
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'content', 
                text: content 
              })}\n\n`))
            } else if (chunk.type === 'message_stop') {
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
