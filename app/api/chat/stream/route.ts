import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('API called')
    
    const body = await request.json()
    console.log('Body parsed:', body)
    
    const { messages, projectId } = body

    if (!messages || !projectId) {
      return NextResponse.json(
        { error: 'Messages and projectId are required' },
        { status: 400 }
      )
    }

    // Get API key from environment
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    console.log('API key exists:', !!anthropicApiKey)

    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 400 }
      )
    }

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    })

    console.log('Anthropic initialized')

    // Get memory context for Claude
    const { data: memoryNodes } = await supabase
      .from('memory_nodes')
      .select('name, type, content, parent_id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    const memoryContext = memoryNodes ? 
      `MÉMOIRE ACTUELLE:\n${memoryNodes.map(node => 
        `- ${node.type === 'folder' ? '📁' : '📄'} ${node.name}${node.content ? ` (contenu: ${typeof node.content === 'string' ? node.content.substring(0, 100) : JSON.stringify(node.content).substring(0, 100)})` : ''}`
      ).join('\n')}\n\n` : ''

    // Enhanced system prompt with memory context
    const systemPrompt = `Tu es un assistant IA en français. Réponds de manière concise et utile.

${memoryContext}

MEMORY SYSTEM:
Tu peux gérer la mémoire avec ces opérations:

CRÉER:
<!--MEMORY_ACTION
{
  "operation": "create",
  "data": {
    "type": "folder|document",
    "name": "Nom ou chemin/Nom pour imbriquer",
    "content": "contenu (optionnel)",
    "parent_name": "nom_du_dossier_parent (optionnel)"
  }
}
-->

MODIFIER:
<!--MEMORY_ACTION
{
  "operation": "update",
  "data": {
    "name": "nom_du_document",
    "content": "nouveau contenu"
  }
}
-->

SUPPRIMER:
<!--MEMORY_ACTION
{
  "operation": "delete",
  "data": {
    "name": "nom_à_supprimer"
  }
}
-->

Utilise MEMORY_ACTION quand explicitement demandé pour créer, modifier ou supprimer.
IMPORTANT: Tu as accès à ta mémoire ci-dessus, utilise-la pour répondre aux questions sur ce que tu sais.`

    console.log('Creating stream...')

    // Create the stream
    const stream = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1000,
      temperature: 0.1,
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      stream: true,
    })

    console.log('Stream created')

    // Create a readable stream for the response
    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          console.log('Starting stream processing...')
          
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta') {
              const content = (chunk.delta as any).text || ''
              
              // Send content to client
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'content', 
                text: content 
              })}\n\n`))
            } else if (chunk.type === 'message_stop') {
              // Send completion signal
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'done' 
              })}\n\n`))
              controller.close()
              console.log('Stream completed')
            }
          }
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      }
    })

    console.log('Returning response...')

    // Return the streaming response
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
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
