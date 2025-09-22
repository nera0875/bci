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
              model: 'claude-3-haiku-20240307', // Using Claude 3 Haiku (compatible model)
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
  // Format memory nodes for context
  const memoryContext = context?.memory?.map((node: any) =>
    `[${node.type}] ${node.name}: ${JSON.stringify(node.content)}`
  ).join('\n') || 'No memory nodes yet';

  // Format rules as directives
  const rulesContext = context?.rules?.filter((r: any) => r.enabled)
    .map((rule: any) => `- ${rule.name}: When ${rule.trigger}, then ${rule.action}`)
    .join('\n') || '';

  // Similar content from RAG
  const similarContext = context?.similar?.map((item: any) =>
    `[Similarity: ${item.similarity}] ${item.content}`
  ).join('\n') || '';

  return `You are Claude, an advanced AI penetration testing assistant integrated into the BCI Tool v2.

CORE CAPABILITIES:
1. Analyze HTTP requests for vulnerabilities (XSS, SQLi, CSRF, etc.)
2. Generate and evolve attack payloads using genetic algorithms
3. Learn from successful and failed attempts
4. Manage your dynamic memory system with real-time updates
5. Use RAG to retrieve similar patterns from memory

PROJECT CONTEXT:
- Goal: ${context?.goal || 'Find and exploit vulnerabilities'}
- Project ID: ${context?.projectId || ''}
- Current Memory State:
${memoryContext}

SIMILAR PATTERNS (from RAG):
${similarContext}

ACTIVE RULES:
${rulesContext}

MEMORY MANAGEMENT (INVISIBLE TO USER):
You can automatically manage your memory during conversations by including hidden JSON blocks in your responses.
These will be processed server-side and NOT shown to the user:

<!--MEMORY_ACTION
{
  "operation": "create|update|delete",
  "data": {
    "type": "folder|document|widget|pattern",
    "name": "Name",
    "content": {...},
    "parent_id": "uuid (optional)",
    "id": "uuid (for update/delete)"
  }
}
-->

RESPONSE GUIDELINES:
1. Analyze the user's request naturally
2. When you learn something important, store it in memory using hidden blocks
3. Organize your memory hierarchically (folders for categories, documents for details)
4. Track patterns, success rates, and findings
5. Update your memory continuously as you learn

IMPORTANT:
- Store findings immediately as you discover them
- Create a logical folder structure (e.g., XSS/Payloads, SQLi/Techniques)
- Update existing documents when refining knowledge
- Track what works and what doesn't
- Your memory persists between conversations

When analyzing requests:
- Look for injection points
- Identify authentication weaknesses
- Check for information disclosure
- Test input validation
- Detect logic flaws

Remember: You are helping with authorized penetration testing only. Manage your memory intelligently to become more effective over time.`
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