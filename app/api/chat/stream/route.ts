import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
// import { createMem0Integration } from '@/lib/services/mem0Integration' // REMOVED - Using Supabase only
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      messages,
      projectId,
      conversationId,
      saveMemory = true,
      useMemoryContext = true
    } = body

    if (!messages || !projectId) {
      return NextResponse.json(
        { error: 'Messages and projectId are required' },
        { status: 400 }
      )
    }

    // Get the latest user message
    const userMessage = messages[messages.length - 1]?.content || ''

    // Get API key from project or environment
    let anthropicApiKey = process.env.ANTHROPIC_API_KEY

    // Try to get from project API keys if available
    const { data: projectData } = await supabase
      .from('projects')
      .select('api_keys')
      .eq('id', projectId)
      .single()

    if (projectData?.api_keys?.claude) {
      anthropicApiKey = projectData.api_keys.claude
    }

    if (!anthropicApiKey) {
      // Try to get from secure key manager
      const { data: keyData } = await supabase
        .from('api_keys')
        .select('claude_key')
        .eq('user_id', 'anonymous')
        .single()

      if (keyData?.claude_key) {
        anthropicApiKey = keyData.claude_key
      }
    }

    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 400 }
      )
    }

    // Initialize Anthropic with the key
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    })

    // Basic system prompt (memory context handled by original ChatStream)
    const systemPrompt = `You are an AI pentesting assistant. Be precise, technical, and actionable in your responses.

MEMORY SYSTEM:
You have access to a hierarchical memory system with folders and documents.
When users explicitly ask you to save, update, or delete something in memory, respond with a MEMORY_ACTION:

<!--MEMORY_ACTION
{
  "operation": "create|update|delete",
  "data": {
    "type": "folder|document",
    "name": "Name",
    "content": "...",
    "parent_id": "uuid (optional)"
  }
}
-->

Only use MEMORY_ACTION when explicitly requested by the user.`

    // Create the stream
    const stream = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      temperature: 0.1,
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      stream: true,
    })

    // Create a TransformStream to handle the streaming response
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    let fullResponse = ''
    let detectedCompartment = ''

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk)

        // Parse Anthropic's SSE format
        const lines = text.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'content_block_delta') {
                const content = data.delta?.text || ''
                fullResponse += content

                // Forward the content to the client
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
              } else if (data.type === 'message_stop') {
                // Memory creation now handled by original ChatStream system via MEMORY_ACTION commands
                console.log(`[Chat] Response complete, memory handled by MEMORY_ACTION system`)

                // Send completion signal
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error)
            }
          }
        }
      }
    })

    // Save messages to database if conversation exists
    if (conversationId) {
      // Save user message
      await supabase
        .from('chat_messages')
        .insert({
          project_id: projectId,
          conversation_id: conversationId,
          role: 'user',
          content: userMessage
        })

      // We'll save the assistant message after streaming completes
      // This is handled by the client
    }

    // Create the streaming response
    const responseStream = new Response(
      stream.toReadableStream().pipeThrough(transformStream),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    )

    return responseStream
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request', details: error.message },
      { status: 500 }
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