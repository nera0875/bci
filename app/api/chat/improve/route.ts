import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * Lightweight API endpoint for prompt improvement
 * NO context loading, NO memory, NO rules
 * Just pure LLM streaming for fast responses
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt, apiKey, model = 'claude-sonnet-4-5-20250929' } = await req.json()

    if (!prompt) {
      return new Response('Missing prompt', { status: 400 })
    }

    if (!apiKey) {
      return new Response('Missing API key', { status: 400 })
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey
    })

    // Create stream
    const stream = await anthropic.messages.stream({
      model: model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })

    // Create ReadableStream for SSE
    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const data = {
                content: chunk.delta.text,
                type: 'content'
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            }
          }

          // Send done signal
          controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        }
      }
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('Improve API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
