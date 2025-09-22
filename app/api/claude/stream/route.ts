import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  try {
    const body = await request.json()
    const { message, projectId, context } = body

    // Get API key from project
    const supabase = createServerClient()
    const { data: project } = await supabase
      .from('projects')
      .select('api_keys')
      .eq('id', projectId)
      .single()

    const apiKey = project?.api_keys?.claude

    if (!apiKey) {
      return new Response('Claude API key not configured', { status: 401 })
    }

    // Create system prompt with context
    const systemPrompt = createSystemPrompt(context)

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-opus-4-1-20250805', // Claude Opus 4.1
              max_tokens: 4096,
              messages: [
                { role: 'user', content: message }
              ],
              system: systemPrompt,
              stream: true
            })
          })

          if (!response.ok) {
            throw new Error(`Claude API error: ${response.statusText}`)
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error('No response body')

          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue

                try {
                  const parsed = JSON.parse(data)

                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    // Send text chunk
                    const chunk = encoder.encode(
                      `data: ${JSON.stringify({ type: 'content', text: parsed.delta.text })}\n\n`
                    )
                    controller.enqueue(chunk)
                  }

                  // Check for Claude actions in the content
                  const actions = extractActions(parsed.delta?.text || '')
                  for (const action of actions) {
                    const chunk = encoder.encode(
                      `data: ${JSON.stringify({ type: 'action', action })}\n\n`
                    )
                    controller.enqueue(chunk)
                  }
                } catch (e) {
                  console.error('Parse error:', e)
                }
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error)
          const errorChunk = encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: 'Stream interrupted' })}\n\n`
          )
          controller.enqueue(errorChunk)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

function createSystemPrompt(context: any): string {
  return `You are Claude, an AI penetration testing assistant integrated into the BCI Tool.

Your capabilities:
1. Analyze HTTP requests for vulnerabilities
2. Generate and evolve attack payloads
3. Learn from successful and failed attempts
4. Manage a dynamic memory system

Context:
- Project Goal: ${context?.goal || 'Find vulnerabilities'}
- Memory Nodes: ${JSON.stringify(context?.memory || [])}

Memory Management Commands (use in your responses):
- To create a memory node: [CREATE_NODE: {"type": "folder", "name": "XSS Patterns", "color": "#FF0000"}]
- To update a node: [UPDATE_NODE: {"id": "node_id", "data": {...}}]
- To create a widget: [CREATE_WIDGET: {"type": "metric", "name": "Success Rate", "value": 95}]

Rules:
1. Be concise and technical
2. Focus on finding vulnerabilities
3. Learn from each interaction
4. Organize findings in the memory system
5. Suggest next steps based on patterns

When analyzing requests:
- Look for injection points
- Identify authentication weaknesses
- Check for information disclosure
- Test input validation
- Detect logic flaws

Remember: You are helping with authorized penetration testing only.`
}

function extractActions(text: string): any[] {
  const actions = []
  const actionRegex = /\[([A-Z_]+):\s*({[^}]+})\]/g
  let match

  while ((match = actionRegex.exec(text)) !== null) {
    try {
      const actionType = match[1]
      const actionData = JSON.parse(match[2])

      actions.push({
        type: actionType.toLowerCase(),
        data: actionData
      })
    } catch (e) {
      // Invalid JSON in action, skip
    }
  }

  return actions
}