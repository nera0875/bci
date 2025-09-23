import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { searchSimilarChunks } from '@/lib/services/chunking'
import { ConversationManager, formatContextForClaude } from '@/lib/services/conversation'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  try {
    const body = await request.json()
    const { message, projectId, context, conversationHistory = [], conversationId } = body

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

    // Initialize ConversationManager if we have tables set up
    let conversationManager = null
    let optimizedContext = null

    try {
      conversationManager = new ConversationManager(projectId)
      await conversationManager.initConversation(conversationId)
      optimizedContext = await conversationManager.getOptimizedContext(message)

      // If we have a cached response, return it immediately
      if (optimizedContext.cachedResponse) {
        console.log('👰 Using cached response!')
        const chunk = encoder.encode(
          `data: ${JSON.stringify({ type: 'content', text: optimizedContext.cachedResponse })}\n\n`
        )
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(chunk)
              controller.close()
            }
          }),
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          }
        )
      }
    } catch (e) {
      console.log('ConversationManager not available yet:', e)
    }

    // Search for relevant chunks using RAG
    let relevantChunks = []
    try {
      relevantChunks = await searchSimilarChunks(projectId, message, 5)
    } catch (e) {
      console.log('Chunk search failed, continuing without:', e)
    }

    // Create system prompt with context
    const systemPrompt = createSystemPrompt(context, relevantChunks, optimizedContext)

    // Build conversation messages
    const messages = []

    // Use optimized context if available, otherwise fall back to provided history
    if (optimizedContext?.recentMessages) {
      for (const msg of optimizedContext.recentMessages) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })
      }
    } else {
      // Add conversation history (limit to last 10 messages to avoid huge context)
      const recentHistory = conversationHistory.slice(-10)
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message })

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
              model: 'claude-opus-4-1-20250805',
              max_tokens: 4096,
              messages: messages,
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

function createSystemPrompt(context: any, relevantChunks: any[], optimizedContext?: any): string {
  // Format memory nodes for context
  const memoryContext = context?.memory?.map((node: any) =>
    `[${node.type}] ${node.name}: ${JSON.stringify(node.content)}`
  ).join('\n') || 'No memory nodes yet';

  // Format relevant chunks from RAG
  const chunkContext = relevantChunks.length > 0
    ? relevantChunks.map(chunk =>
        `[From: ${chunk.memory_nodes?.name || 'Unknown'}] ${chunk.content}`
      ).join('\n\n')
    : '';

  // Format rules as directives
  const rulesContext = context?.rules?.filter((r: any) => r.enabled)
    .map((rule: any) => `- ${rule.name}: When ${rule.trigger}, then ${rule.action}`)
    .join('\n') || '';

  // Add conversation summary if available
  const summaryContext = optimizedContext?.summary
    ? `\nCONVERSATION SUMMARY:\n${optimizedContext.summary}\n`
    : '';

  // Add similar messages context if available
  const similarContext = optimizedContext?.similarMessages?.length > 0
    ? `\nSIMILAR PREVIOUS EXCHANGES:\n${optimizedContext.similarMessages.map(m =>
        `[${m.role}]: ${m.content.substring(0, 200)}...`
      ).join('\n')}\n`
    : '';

  return `You are Claude, an advanced AI assistant integrated into the BCI Tool v2.

CORE CAPABILITIES:
1. Analyze security vulnerabilities
2. Access a persistent memory system with folders and documents
3. Learn and adapt from conversations
4. Use RAG to retrieve relevant information

PROJECT CONTEXT:
- Goal: ${context?.goal || 'Security testing and analysis'}
- Project ID: ${context?.projectId || ''}

MEMORY SYSTEM CONTEXT:
You have access to a hierarchical memory system with folders and documents:
📁 Memory (root)
  ├── 📁 Knowledge (what you've learned)
  ├── 📁 Projects (per project/site)
  ├── 📁 Tools (commands, scripts)
  └── 📄 README.md

${chunkContext ? 'RELEVANT KNOWLEDGE (from RAG):\n' + chunkContext + '\n' : ''}
${summaryContext}
${similarContext}
CURRENT MEMORY STATE:
${memoryContext}

ACTIVE RULES:
${rulesContext}

MEMORY INTERACTIONS:
- You have full context of the memory system
- Reference and use information from memory naturally in conversations
- When the user EXPLICITLY asks you to save, update, or delete something in memory, you will respond with a MEMORY_ACTION
- DO NOT automatically generate memory actions unless explicitly requested

EXPLICIT MEMORY COMMANDS (Only use when user explicitly requests):
When the user explicitly asks to modify memory (using words like "ajoute", "enregistre", "mémorise", "modifie", "supprime", etc.), respond with:

<!--MEMORY_ACTION
{
  "operation": "create|update|delete|update-section",
  "data": {
    "type": "folder|document",
    "name": "Name",
    "content": "...",
    "parent_id": "uuid (optional)",
    "id": "uuid (for update/delete)",
    "section_id": "section-name (for partial updates)"
  }
}
-->

RESPONSE GUIDELINES:
1. Analyze requests naturally
2. Use memory context to provide informed responses
3. Only perform memory actions when explicitly requested by the user
4. Your memory persists between conversations
5. Use Markdown format for documents when creating them

IMPORTANT:
- Never automatically save information unless explicitly asked
- Use existing memory to enhance your responses
- The RAG system helps you recall relevant information
- Wait for explicit user instructions before modifying memory

When analyzing security:
- Look for injection points
- Identify authentication weaknesses
- Check for information disclosure
- Test input validation
- Detect logic flaws

Remember: You are helping with authorized security testing only. Use your memory context intelligently but only modify it when explicitly instructed.`
}

function extractActions(text: string): any[] {
  const actions = []
  const actionRegex = /<!--MEMORY_ACTION\s*([\s\S]*?)\s*-->/g
  let match

  while ((match = actionRegex.exec(text)) !== null) {
    try {
      const actionData = JSON.parse(match[1])
      actions.push(actionData)
    } catch (e) {
      console.error('Invalid action JSON:', e)
    }
  }

  return actions
}