import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { ConversationManager, formatContextForClaude } from '@/lib/services/conversation'
import { createEmbedding } from '@/lib/services/embeddings'

// Helper function to search similar chunks
// NOTE: memory_chunks table removed - using memory_nodes instead
async function searchSimilarChunks(projectId: string, query: string, limit: number = 5) {
  try {
    const embedding = await createEmbedding(query)
    if (!embedding || embedding.length === 0) {
      return []
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('memory_nodes')
      .select('*')
      .eq('project_id', projectId)
      .limit(limit)

    if (error) {
      console.error('Error searching nodes:', error)
      return []
    }

    return data || []
  } catch (e) {
    console.error('searchSimilarChunks error:', e)
    return []
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  try {
    const body = await request.json()
    const { message, projectId, context, conversationHistory = [], conversationId } = body

    // Get API key and rules from project
    const supabase = createServerClient()
    const { data: project } = await (supabase as any)
      .from('projects')
      .select('api_keys, rules_text')
      .eq('id', projectId)
      .single()

    const apiKey = (project as any)?.api_keys?.claude

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
    let relevantChunks: any[] = []
    try {
      relevantChunks = await searchSimilarChunks(projectId, message, 5)
    } catch (e) {
      console.log('Chunk search failed, continuing without:', e)
    }

    // Create system prompt with context and project rules
    const systemPrompt = createSystemPrompt(context, relevantChunks, optimizedContext, (project as any)?.rules_text)

    // Build conversation messages
    const messages: any[] = []

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
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 4096,
              messages: messages,
              system: systemPrompt,
              tools: [
                {
                  name: "analyze_content",
                  description: "Analyse le contenu utilisateur pour déterminer le type de faille et où ranger",
                  input_schema: {
                    type: "object",
                    properties: {
                      content: { type: "string", description: "Contenu à analyser" },
                      intent: { type: "string", description: "Type de faille détectée (SQLi, XSS, etc.)" },
                      confidence: { type: "number", description: "Confiance dans la détection (0-1)" }
                    },
                    required: ["content", "intent"]
                  }
                },
                {
                  name: "create_memory_structure",
                  description: "Crée dossier et/ou tableau dans Memory selon besoin détecté",
                  input_schema: {
                    type: "object",
                    properties: {
                      folder_name: { type: "string", description: "Nom du dossier à créer" },
                      table_name: { type: "string", description: "Nom du tableau à créer dans le dossier" },
                      columns: {
                        type: "array",
                        items: { type: "string" },
                        description: "Colonnes du tableau (ex: ['payload', 'url', 'result'])"
                      }
                    },
                    required: ["folder_name", "table_name", "columns"]
                  }
                },
                {
                  name: "store_in_memory",
                  description: "Range les données dans la structure mémoire appropriée",
                  input_schema: {
                    type: "object",
                    properties: {
                      path: { type: "string", description: "Chemin cible (ex: 'Memory/Auth/SQLi Tests')" },
                      data: {
                        type: "object",
                        description: "Données à stocker (payload, url, result, etc.)"
                      },
                      reasoning: { type: "string", description: "Explication du choix de rangement" }
                    },
                    required: ["path", "data"]
                  }
                }
              ],
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

                  // Handle tool use (function calling)
                  if (parsed.type === 'content_block_start' && parsed.content_block?.type === 'tool_use') {
                    const toolUse = parsed.content_block
                    try {
                      const toolResult = await executeToolCall(toolUse, projectId)
                      
                      // Send tool execution result
                      const toolChunk = encoder.encode(
                        `data: ${JSON.stringify({ 
                          type: 'tool_result', 
                          tool_name: toolUse.name,
                          result: toolResult 
                        })}\n\n`
                      )
                      controller.enqueue(toolChunk)
                    } catch (toolError) {
                      console.error('Tool execution error:', toolError)
                      const errorChunk = encoder.encode(
                        `data: ${JSON.stringify({
                          type: 'tool_error',
                          tool_name: toolUse.name,
                          error: (toolError as any).message || 'Tool execution failed'
                        })}\n\n`
                      )
                      controller.enqueue(errorChunk)
                    }
                  }

                  // Check for Claude actions in the content
                  const actions = await extractActions(parsed.delta?.text || '', projectId)
                  for (const action of actions) {
                    if (action.type === 'memory_action') {
                      const chunk = encoder.encode(
                        `data: ${JSON.stringify({ type: 'action', action: action.action })}\n\n`
                      )
                      controller.enqueue(chunk)
                    } else if (action.type === 'board_action') {
                      const chunk = encoder.encode(
                        `data: ${JSON.stringify({
                          type: 'board_action',
                          action: action.action,
                          status: action.status,
                          result: action.result,
                          error: action.error
                        })}\n\n`
                      )
                      controller.enqueue(chunk)
                    }
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

function createSystemPrompt(context: any, relevantChunks: any[], optimizedContext?: any, projectRules?: string): string {
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
    ? `\nSIMILAR PREVIOUS EXCHANGES:\n${optimizedContext.similarMessages.map((m: any) =>
        `[${m.role}]: ${m.content.substring(0, 200)}...`
      ).join('\n')}\n`
    : '';

  return `Tu es Claude, assistant IA spécialisé en pentesting intégré dans BCI Tool v2.

MISSION PRINCIPALE:
Organiser automatiquement les informations de pentesting selon les règles du projet.

RÈGLES DU PROJET (applique-les systématiquement):
${projectRules || 'Aucune règle définie. Demande à l\'utilisateur où ranger les informations.'}

TOOLS DISPONIBLES:
1. analyze_content - Analyse le contenu selon les règles
2. create_memory_structure - Crée dossiers/tableaux si nécessaire  
3. store_in_memory - Range les données extraites
4. suggest_rule - Propose de nouvelles règles

WORKFLOW AUTOMATIQUE:
1. Quand l'utilisateur partage des infos de test/pentest
2. Utilise analyze_content pour déterminer l'intention
3. Créer structure si besoin (create_memory_structure)
4. Range les données (store_in_memory)
5. Confirme l'action à l'utilisateur

STRUCTURE MEMORY EXISTANTE:
${memoryContext}

CONNAISSANCES PERTINENTES (RAG):
${chunkContext || 'Aucune connaissance similaire trouvée'}

${summaryContext}
${similarContext}

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

BOARD INTERACTIONS:
- You have accès au board unifié avec sections 'memory' et 'rules'
- Référence et utilise les rows du board naturellement dans les conversations
- Quand l'utilisateur EXPLICITEMENT demande d'ajouter, modifier ou supprimer une row sur le board (mots comme "ajoute une row", "modifie la row", "supprime la row" pour memory ou rules), réponds avec un BOARD_ACTION
- DO NOT génère automatiquement des board actions sauf si explicitement demandé
- Target: "memory" pour les rows mémoire, "rules" pour les règles
- Utilise les données du board pour contextualiser tes réponses

EXPLICIT BOARD COMMANDS (Only use when user explicitly requests):
When the user explicitly asks to modify the board (using words like "ajoute une row", "modifie", "supprime" followed by "dans memory" or "dans rules"), respond with:

<!--BOARD_ACTION
{
"operation": "add_row|update_row|delete_row",
"target": "memory|rules",
"data": {
  "name": "Nom de la row",
  "content": "Contenu...",
  "id": "uuid (for update/delete)",
  "instructions": "Instructions optionnelles",
  "trigger": "Trigger pour rules (optionnel)"
}
}
-->

BOARD MANIPULATION:
Tu peux créer et modifier la structure du board. Utilise les commandes explicites dans tes réponses pour créer dossiers, tableaux, rows. Par exemple, si l'utilisateur demande une structure pour pentesting, suggère 'Crée dossier Reconnaissance', 'Ajoute row Port Scanning dans Reconnaissance'. Propose des arborescences adaptées au pentesting: Reconnaissance (URLs, Subdomains), Auth (Login, Sessions), Business Logic, etc.

RESPONSE GUIDELINES:
1. Analyze requests naturally
2. Use memory and board context to provide informed responses
3. Only perform memory or board actions when explicitly requested by the user
4. Your memory and board persist between conversations
5. Use Markdown format for documents when creating them
6. For board actions, provide minimal natural response after the action comment, e.g., "J'ai ajouté la row au board."

IMPORTANT:
- Never automatically save information or modify board unless explicitly asked
- Use existing memory and board to enhance your responses
- The RAG system helps you recall relevant information
- Wait for explicit user instructions before modifying memory or board

When analyzing security:
- Look for injection points
- Identify authentication weaknesses
- Check for information disclosure
- Test input validation
- Detect logic flaws

Remember: You are helping with authorized security testing only. Use your memory and board context intelligently but only modify them when explicitly instructed.`
}

async function extractActions(text: string, projectId: string): Promise<any[]> {
  const actions = []
  const memoryRegex = /<!--MEMORY_ACTION\s*([\s\S]*?)\s*-->/g
  const boardRegex = /<!--BOARD_ACTION\s*([\s\S]*?)\s*-->/g
  let match

  // Parse MEMORY_ACTION (unchanged)
  while ((match = memoryRegex.exec(text)) !== null) {
    try {
      const actionData = JSON.parse(match[1])
      actions.push({ type: 'memory_action', action: actionData })
    } catch (e) {
      console.error('Invalid MEMORY_ACTION JSON:', e)
    }
  }

  return actions
}

// Fonction pour exécuter les tool calls de Claude
async function executeToolCall(toolUse: any, projectId: string) {
  console.log('🔧 Executing tool:', toolUse.name, 'with input:', toolUse.input)
  
  switch (toolUse.name) {
    case 'analyze_content':
      return {
        success: true,
        analysis: {
          content: toolUse.input.content,
          intent: toolUse.input.intent,
          confidence: toolUse.input.confidence || 0.8
        }
      }

    case 'create_memory_structure':
      try {
        const { folder_name, table_name, columns } = toolUse.input
        
        // 1. Créer le dossier
        const folderResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/memory/nodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            type: 'folder',
            name: folder_name,
            section: 'memory',
            parent_id: null
          })
        })
        
        if (!folderResponse.ok) {
          throw new Error('Failed to create folder')
        }
        
        const { node: folder } = await folderResponse.json()
        
        // 2. Créer le tableau dans le dossier
        const tableResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/memory/nodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            type: 'document',
            name: table_name,
            section: 'memory',
            parent_id: folder.id,
            metadata: {
              columns: columns.map((col: string, index: number) => ({
                name: col,
                type: 'text',
                order: index
              }))
            }
          })
        })
        
        if (!tableResponse.ok) {
          throw new Error('Failed to create table')
        }
        
        const { node: table } = await tableResponse.json()
        
        return {
          success: true,
          folder_id: folder.id,
          table_id: table.id,
          message: `Structure créée : ${folder_name}/${table_name}`
        }
      } catch (error: unknown) {
        console.error('Error creating structure:', error)
        let errorMessage = 'Erreur inconnue lors de la création de la structure mémoire';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        return {
          success: false,
          error: errorMessage
        }
      }

    case 'store_in_memory':
      try {
        const { path, data, reasoning } = toolUse.input
        
        // Parser le path pour trouver le tableau cible
        const pathParts = path.split('/')
        if (pathParts.length < 3) {
          throw new Error('Path invalide. Format attendu: Memory/Dossier/Tableau')
        }
        
        const folderName = pathParts[1]
        const tableName = pathParts[2]
        
        // Trouver le tableau par nom (simplification)
        const nodesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/memory/nodes?projectId=${projectId}&section=memory`)
        if (!nodesResponse.ok) {
          throw new Error('Failed to load memory nodes')
        }
        
        const { nodes } = await nodesResponse.json()
        
        // Chercher le tableau cible
        let targetTable = null
        for (const node of nodes) {
          if (node.type === 'folder' && node.name === folderName && node.children) {
            targetTable = node.children.find((child: any) => 
              child.type === 'document' && child.name === tableName
            )
            if (targetTable) break
          }
        }
        
        if (!targetTable) {
          throw new Error(`Tableau non trouvé : ${path}`)
        }
        
        // Ajouter la row
        const rowResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/unified/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: targetTable.id,
            data: {
              ...data,
              created_at: new Date().toISOString(),
              reasoning: reasoning || ''
            }
          })
        })
        
        if (!rowResponse.ok) {
          throw new Error('Failed to store data')
        }
        
        const result = await rowResponse.json()
        
        return {
          success: true,
          row_id: result.row?.id,
          message: `Données rangées dans ${path}`,
          reasoning
        }
      } catch (error: unknown) {
        console.error('Error storing in memory:', error)
        let errorMessage = 'Erreur inconnue lors du rangement en mémoire';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        return {
          success: false,
          error: errorMessage
        }
      }

    default:
      return {
        success: false,
        error: `Tool inconnu : ${toolUse.name}`
      }
  }
}