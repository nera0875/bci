'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { User, Bot, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import ReactMarkdown from 'react-markdown'
import StreamingText from './StreamingText'
import { MemoryActionButtons } from './MemoryActionButtons'
import MemoryActionDisplay from './MemoryActionDisplay'
// import { intentAnalyzer } from '@/lib/memory/contextualIntentAnalyzer' // DÉSACTIVÉ
import { ConversationManager } from '@/lib/services/conversation'
import { formatRulesForAI } from '@/lib/rules/simpleRules'
// Memory services removed - Using Supabase native system only
import '@/app/chat.css'

type ChatMessage = Database['public']['Tables']['chat_messages']['Row']

// Memoized streaming wrapper for performance
const StreamingMessageWrapper = React.memo(({
  content,
  isComplete
}: {
  content: string
  isComplete: boolean
}) => (
  <div className="flex gap-4 justify-start message-streaming chat-message" data-streaming="true">
    <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center flex-shrink-0">
      <Bot className="w-4 h-4 text-background" />
    </div>
    <div className="max-w-[80%] px-4 py-3 rounded-xl bg-muted text-foreground streaming-text-container">
      <div className="message-content">
        <StreamingText
          content={content}
          isComplete={isComplete}
        />
      </div>
    </div>
  </div>
))

// Memoized message component for performance
const MessageComponent = React.memo(({
  message,
  pendingAction,
  onConfirmAction,
  onRejectAction
}: {
  message: ChatMessage
  pendingAction?: any
  onConfirmAction?: () => void
  onRejectAction?: () => void
}) => (
  <div
    className={`flex gap-4 message-enter chat-message ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    {message.role === 'assistant' && (
      <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-background" />
      </div>
    )}

    <div
      className={`
        max-w-[80%] px-4 py-3 rounded-xl
        ${message.role === 'user'
          ? 'bg-foreground text-background'
          : 'bg-muted text-foreground'
        }
      `}
    >
      {message.role === 'assistant' ? (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              // Custom renderer for MEMORY_ACTION blocks
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '')
                const content = String(children).replace(/\n$/, '')
                
                // Check if this is a MEMORY_ACTION block
                if (content.includes('MEMORY_ACTION')) {
                  try {
                    const actionMatch = content.match(/<!--MEMORY_ACTION\s*([\s\S]*?)-->/)
                    if (actionMatch) {
                      const action = JSON.parse(actionMatch[1])
                      return <MemoryActionDisplay action={action} />
                    }
                  } catch (e) {
                    // Fallback to regular code block
                  }
                }
                
                return inline ? (
                  <code className={className} {...props}>
                    {children}
                  </code>
                ) : (
                  <pre className={className} {...props}>
                    <code>{children}</code>
                  </pre>
                )
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="whitespace-pre-wrap">{message.content}</div>
      )}

      {/* Afficher les boutons d'action si c'est le dernier message assistant avec une action */}
      {message.role === 'assistant' && pendingAction && (
        <MemoryActionButtons
          action={pendingAction}
          onConfirm={onConfirmAction!}
          onReject={onRejectAction!}
          confidence={pendingAction.confidence}
        />
      )}
    </div>

    {message.role === 'user' && (
      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
        <User className="w-4 h-4 text-foreground" />
      </div>
    )}
  </div>
))

interface ChatStreamProps {
  projectId: string
  conversationId?: string | null
  onConversationCreated?: (conversationId: string) => void
}

export default function ChatStream({ projectId, conversationId: propConversationId, onConversationCreated }: ChatStreamProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreamComplete, setIsStreamComplete] = useState(false)
  const [pendingMemoryAction, setPendingMemoryAction] = useState<any>(null)
  const [pendingActions, setPendingActions] = useState<any[]>([])
  const [lastUserMessage, setLastUserMessage] = useState<string>('')
  const lastProcessedMessageId = useRef<string | null>(null)
  const bufferRef = useRef<string>('')
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageCountRef = useRef<number>(0)
  const conversationManagerRef = useRef<ConversationManager | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(propConversationId || null)

  // Supabase Memory Integration (original system) - Pure Supabase

  // Update conversation when prop changes OR when internal conversationId changes
  useEffect(() => {
    if (propConversationId !== undefined) {
      setConversationId(propConversationId || null)
      setMessages([]) // Clear messages when conversation changes
      if (propConversationId) {
        loadMessages()
      }
      initializeConversation()
    }
  }, [propConversationId])

  useEffect(() => {
    loadMessages()
    initializeConversation()

    // Start polling for new messages
    // NOTE: Only polling triggers Claude responses to avoid duplicates
    const pollInterval = setInterval(async () => {
      // Skip polling while streaming to avoid refresh
      if (isStreaming) return

      // Don't poll if no conversation ID yet
      if (!conversationId) return

      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        const lastMessage = data[data.length - 1]

        // Check if this is a new user message we haven't processed
        if (lastMessage.role === 'user' &&
            lastMessage.id !== lastProcessedMessageId.current) {
          console.log('New user message detected via polling:', lastMessage.content)
          lastProcessedMessageId.current = lastMessage.id
          lastMessageCountRef.current = data.length
          setMessages(data)
          // Store user message for context
          setLastUserMessage(lastMessage.content)
          // Save user message to ConversationManager
          if (conversationManagerRef.current) {
            await conversationManagerRef.current.saveMessage({
              role: 'user',
              content: lastMessage.content
            })
          }
          // intentAnalyzer.addToContext(lastMessage.content) // DÉSACTIVÉ
          // Trigger Claude response (ONLY here, not in subscription)
          streamClaudeResponse(lastMessage.content)
        } else if (data.length !== lastMessageCountRef.current && !isStreaming) {
          // Only update if count changed and not streaming
          lastMessageCountRef.current = data.length
          setMessages(data)
        }
      }
    }, 1500) // Poll every 1.5 seconds

    // Also set up subscription (may work intermittently)
    const unsubscribe = subscribeToMessages()

    return () => {
      clearInterval(pollInterval)
      unsubscribe()
      // Clean up RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (debouncedScrollRef.current) {
        clearTimeout(debouncedScrollRef.current)
      }
    }
  }, [projectId, isStreaming, conversationId])

  // Smart scroll management without jumps using RAF
  const rafRef = useRef<number>()
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    // Use RAF for smooth scroll timing
    rafRef.current = requestAnimationFrame(() => {
      const container = containerRef.current
      if (!container) return

      // Calculate target scroll position
      const targetScroll = container.scrollHeight
      const currentScroll = container.scrollTop + container.clientHeight
      const isAtBottom = Math.abs(targetScroll - currentScroll) < 50 // More tolerance

      // Always scroll for new messages or streaming
      if (!isAtBottom || isStreaming) {
        // Use native smooth scroll with RAF timing
        container.style.scrollBehavior = 'smooth'
        container.scrollTop = container.scrollHeight

        // Clean up after animation
        requestAnimationFrame(() => {
          if (container) {
            container.style.scrollBehavior = 'auto'
          }
        })
      }
    })
  }, [isStreaming])

  // Debounced scroll to prevent multiple triggers
  const debouncedScrollRef = useRef<NodeJS.Timeout>()
  const debouncedScroll = useCallback(() => {
    if (debouncedScrollRef.current) {
      clearTimeout(debouncedScrollRef.current)
    }
    debouncedScrollRef.current = setTimeout(() => {
      scrollToBottom()
    }, 100)
  }, [scrollToBottom])

  useEffect(() => {
    // Auto-scroll when messages change
    if (messages.length > 0) {
      debouncedScroll()
    }
  }, [messages, debouncedScroll])

  useEffect(() => {
    // Auto-scroll only when streaming content updates, not when streaming ends
    if (isStreaming && streamingContent) {
      debouncedScroll()
    }
  }, [streamingContent, debouncedScroll])

  const loadMessages = async () => {
    // Don't load any messages if no conversation ID (new conversation)
    if (!conversationId) {
      setMessages([])
      return
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (data && !error) {
      setMessages(data)
    }
  }

  const initializeConversation = async () => {
    // Initialize ConversationManager
    conversationManagerRef.current = new ConversationManager(projectId)

    // If we have a specific conversation ID, use it
    if (propConversationId) {
      await conversationManagerRef.current.initConversation(propConversationId)
      setConversationId(propConversationId)
    } else {
      // Don't auto-create conversation here, wait for first message
      setConversationId(null)
    }
  }

  const subscribeToMessages = () => {
    console.log('Setting up subscription for project:', projectId)

    const channel = supabase
      .channel(`chat_${projectId}`, {
        config: {
          presence: { key: projectId },
          broadcast: { ack: false }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('New message received via subscription:', payload)
          const newMessage = payload.new as ChatMessage

          // Only update messages, don't trigger Claude here
          // (Polling will handle Claude responses to avoid duplicates)
          // Check if message already exists to avoid duplicates
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) {
              return prev
            }
            return [...prev, newMessage]
          })
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        if (status === 'CHANNEL_ERROR') {
          console.error('Subscription error - retrying...')
          // Retry after a delay
          setTimeout(() => {
            supabase.removeChannel(channel)
            subscribeToMessages()
          }, 2000)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const streamClaudeResponse = async (userMessage: string) => {
    console.log('Starting Claude response for:', userMessage)
    setIsStreaming(true)
    setStreamingContent('')
    setIsStreamComplete(false)
    bufferRef.current = ''

    try {
      // Initialize ConversationManager if not done
      if (!conversationManagerRef.current) {
        conversationManagerRef.current = new ConversationManager(projectId)
      }

      // Create new conversation if needed
      let currentConvId = conversationId
      if (!currentConvId) {
        const conversation = await conversationManagerRef.current.initConversation()
        if (conversation) {
          currentConvId = conversation.id
          setConversationId(conversation.id)
          // Notify parent component about new conversation
          if (onConversationCreated) {
            onConversationCreated(conversation.id)
          }
        }
      } else {
        await conversationManagerRef.current.initConversation(currentConvId)
      }

      // Get optimized context from ConversationManager
      const convContext = await conversationManagerRef.current.getOptimizedContext(userMessage)

      // If we have a cached response, use it!
      if (convContext.cachedResponse) {
        console.log('💰 Using cached response - saving tokens!')
        setStreamingContent(convContext.cachedResponse)
        setIsStreamComplete(true)

        // Save to database with conversation ID
        await supabase
          .from('chat_messages')
          .insert({
            project_id: projectId,
            role: 'assistant' as const,
            content: convContext.cachedResponse,
            conversation_id: currentConvId
          })

        setIsStreaming(false)
        return
      }

      // Get additional context - RÈGLES EN PRIORITÉ
      const rulesContext = await getRulesContext(userMessage)
      const memoryContext = await getMemoryContext(userMessage)
      const similarContent = await searchSimilarContent(userMessage)
      const projectGoal = await getProjectGoal()

      console.log('Context prepared, calling Claude API...')

      // Combine recent messages from ConversationManager with similar messages
      const conversationHistory = [...convContext.recentMessages, ...convContext.similarMessages]

      // Prepare messages in the format expected by our new endpoint
      let finalUserMessage = userMessage
      
      // Add rules context to the user message if rules exist
      if (rulesContext) {
        finalUserMessage = userMessage + '\n\n' + rulesContext
      }

      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: finalUserMessage
        }
      ]

      // Use the new chat/stream endpoint with Mem0 integration
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,                    // Full conversation history
          projectId,                   // Project ID for Mem0
          conversationId: currentConvId, // Conversation ID for tracking
          useMemoryContext: true,      // Enable Mem0 memory injection
          saveMemory: true             // Auto-save responses to Mem0
        })
      })

      console.log('Claude API response:', response.status, response.ok)
      if (!response.ok) throw new Error(`Failed to get response: ${response.status}`)

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      if (reader) {
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.type === 'content') {
                  fullContent += data.text // Keep original for command execution

                  // Build cleaned version for display - more aggressive cleaning
                  const displayContent = fullContent
                    .replace(/<!--MEMORY_ACTION[^>]*>[\s\S]*?<!--END_MEMORY_ACTION-->/g, '')
                    .replace(/\[MEMORY:[\s\S]*?\]/g, '')
                    .replace(/\/memory_\w+\s+[^\n]+/g, '')

                  bufferRef.current = displayContent

                  // Clear previous buffer timeout
                  if (bufferTimeoutRef.current) {
                    clearTimeout(bufferTimeoutRef.current)
                  }

                  // Use buffered updates for smoother streaming
                  bufferTimeoutRef.current = setTimeout(() => {
                    setStreamingContent(bufferRef.current)
                  }, 10) // Very short delay for buffering
                } else if (data.type === 'action') {
                  // Handle Claude actions (memory CRUD, etc.)
                  await handleClaudeAction(data.action)
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        // DÉSACTIVÉ : Plus de parsing automatique des commandes
        // Les commandes ne sont parsées que si explicitement demandées

        // Just clean the content for display
        fullContent = fullContent
          .replace(/<!--MEMORY_ACTION[^>]*>[\s\S]*?<!--END_MEMORY_ACTION-->/g, '')
          .replace(/\[MEMORY:[\s\S]*?\]/g, '')
          .replace(/\/memory_\w+\s+[^\n]+/g, '')
      }

      // Save complete message to database and ConversationManager
      if (fullContent) {
        // Save assistant message to ConversationManager with caching
        if (conversationManagerRef.current) {
          await conversationManagerRef.current.saveMessage({
            role: 'assistant',
            content: fullContent
          })

          // Cache the response for future identical questions
          await conversationManagerRef.current.cacheResponse(userMessage, fullContent)
        }

        const { data: newMessage } = await supabase
          .from('chat_messages')
          .insert({
            project_id: projectId,
            role: 'assistant' as const,
            content: fullContent,
            conversation_id: currentConvId
          })
          .select()
          .single()

        // Add the new message directly without reloading all
        if (newMessage) {
          // Process MEMORY_ACTION commands from Claude's response
          try {
            const actions = await parseMemoryActions(fullContent)
            if (actions.length > 0) {
              console.log('✅ Processing', actions.length, 'memory actions')
              for (const action of actions) {
                await handleClaudeAction(action)
              }
            }
          } catch (error) {
            console.log('⚠️ Memory action processing skipped:', error)
          }

          // V3 disabled - causes CORS errors
          // Mem0 V4 with server-side routes is now the primary system

          // Use requestAnimationFrame for seamless transition without visual jumps
          await new Promise<void>(resolve => {
            requestAnimationFrame(() => {
              // Mark streaming as complete but keep content visible
              setIsStreamComplete(true)

              requestAnimationFrame(() => {
                // Add the final message while streaming content is still showing
                setMessages(prev => {
                  // Check if message already exists to avoid duplicates
                  const exists = prev.some(msg => msg.id === newMessage.id)
                  if (exists) {
                    return prev
                  }
                  lastMessageCountRef.current = prev.length + 1
                  return [...prev, newMessage]
                })

                // Hide streaming content after the message is in DOM
                requestAnimationFrame(() => {
                  setIsStreaming(false)
                  setStreamingContent('')
                  resolve()
                })
              })
            })
          })

          // DÉSACTIVÉ : Plus d'analyse automatique d'intention
          // L'utilisateur doit demander explicitement les actions mémoire

          // Analyser SEULEMENT si l'utilisateur demande explicitement
          if (checkExplicitMemoryRequest(lastUserMessage)) {
            // Parse les actions depuis la réponse de Claude
            const actions = await parseMemoryActions(fullContent)
            if (actions.length > 0) {
              setPendingActions(actions)
              setPendingMemoryAction(actions[0])
            }
          }
        } else {
          // If no message saved, still clean up smoothly
          setIsStreamComplete(true)
          await new Promise(resolve => setTimeout(resolve, 50))
          setIsStreaming(false)
          setStreamingContent('')
        }
      }
    } catch (error) {
      console.error('Streaming error:', error)
      setStreamingContent('Error: Failed to get response from Claude.')
      setIsStreamComplete(true)
      await new Promise(resolve => setTimeout(resolve, 100))
      setIsStreaming(false)
    }
  }

  const getMemoryContext = async (userMessage?: string) => {
    try {
      // Use direct Supabase query for memory context
      const { data } = await supabase
        .from('memory_nodes')
        .select('name, type, content')
        .eq('project_id', projectId)
        .limit(10)

      return data || []
    } catch (error) {
      console.warn('Memory context error:', error)
      return []
    }
  }

  const getProjectGoal = async () => {
    const { data } = await supabase
      .from('projects')
      .select('goal')
      .eq('id', projectId)
      .single()

    return data?.goal || ''
  }

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // For now, log to console - can be replaced with a proper toast system
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'
    console.log(`${icon} ${message}`)

    // TODO: Implement visual toast notifications
  }

  // Parse memory actions from Claude's response
  const parseMemoryActions = async (text: string): Promise<any[]> => {
    const actions = []
    const regex = /<!--MEMORY_ACTION\s*([\s\S]*?)-->/g
    let match

    while ((match = regex.exec(text)) !== null) {
      try {
        const action = JSON.parse(match[1])
        actions.push(action)
        console.log('📋 Parsed memory action:', action.operation, action.data?.name)
      } catch (e) {
        console.error('Invalid memory action JSON:', e)
      }
    }

    if (actions.length > 0) {
      console.log(`Found ${actions.length} memory action(s) to process`)
    }

    return actions
  }

  // RAG similarity search
  const searchSimilarContent = async (query: string) => {
    try {
      // Generate embedding for the query
      const embeddingResponse = await fetch('/api/openai/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query })
      })

      if (!embeddingResponse.ok) return []

      const { embedding } = await embeddingResponse.json()

      // Search similar content using pgvector
      const { data } = await supabase.rpc('search_similar_nodes', {
        query_embedding: embedding,
        project_id: projectId,
        match_limit: 5
      })

      return data || []
    } catch (error) {
      console.error('RAG search error:', error)
      return []
    }
  }

  // Détecter le dossier cible dans le message utilisateur
  const detectTargetFolder = (message: string): string => {
    const lowerMessage = message.toLowerCase()
    
    // Détection par mots-clés
    if (lowerMessage.includes('requête') || lowerMessage.includes('post') || lowerMessage.includes('get')) {
      return 'requetes'
    }
    if (lowerMessage.includes('faille') || lowerMessage.includes('vulnérabilité') || lowerMessage.includes('exploit')) {
      return 'failles'
    }
    if (lowerMessage.includes('test') || lowerMessage.includes('payload')) {
      return 'tests'
    }
    if (lowerMessage.includes('analyse') || lowerMessage.includes('rapport')) {
      return 'analysis'
    }
    if (lowerMessage.includes('plan') || lowerMessage.includes('stratégie')) {
      return 'plan'
    }
    
    return '*' // Global par défaut
  }

  // Get active rules and format them for AI with folder detection
  const getRulesContext = async (userMessage: string) => {
    try {
      // Détecter le dossier cible
      const targetFolder = detectTargetFolder(userMessage)
      console.log('🎯 Dossier cible détecté:', targetFolder)

      // Récupérer les règles depuis la table 'rules'
      const { data } = await supabase
        .from('rules')
        .select('*')
        .eq('project_id', projectId)
        .eq('enabled', true)
        .order('priority', { ascending: true })

      if (!data || data.length === 0) {
        return ''
      }

      // Filtrer les règles pertinentes (dossier spécifique + globales)
      const relevantRules = data.filter(rule => 
        rule.trigger === '*' || 
        rule.trigger === targetFolder
      )

      if (relevantRules.length === 0) {
        return ''
      }

      // Convertir vers format SimpleRule pour formatRulesForAI
      const simpleRules = relevantRules.map(rule => ({
        id: rule.id,
        project_id: rule.project_id,
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        action: rule.action,
        enabled: rule.enabled,
        priority: rule.priority,
        config: rule.config
      }))

      return formatRulesForAI(targetFolder, simpleRules)
    } catch (error) {
      console.error('Erreur chargement règles:', error)
      return ''
    }
  }

  // Check if user explicitly asks for memory modifications
  const checkExplicitMemoryRequest = (userMessage: string): boolean => {
    const lowerMessage = userMessage.toLowerCase()

    // Explicit memory commands
    const explicitCommands = [
      'ajoute', 'ajouter', 'enregistre', 'enregistrer',
      'mémorise', 'mémoriser', 'garde', 'garder',
      'sauvegarde', 'sauvegarder', 'stocke', 'stocker',
      'modifie', 'modifier', 'met à jour', 'mettre à jour',
      'supprime', 'supprimer', 'efface', 'effacer',
      'crée un document', 'crée un dossier',
      'ajoute dans la mémoire', 'ajoute à la mémoire',
      'note ça', 'note ceci', 'prend note'
    ]

    return explicitCommands.some(cmd => lowerMessage.includes(cmd))
  }


  // Parse and execute memory commands from Claude's response
  const parseAndExecuteCommands = async (text: string): Promise<string> => {
    // Remove and execute hidden memory actions
    const hiddenRegex = /<!--MEMORY_ACTION\s*([\s\S]*?)\s*-->/g
    let cleanedText = text
    let hasActions = false

    // Find all matches first
    const matches = [...text.matchAll(hiddenRegex)]

    // Process each action
    for (const match of matches) {
      try {
        const actionData = JSON.parse(match[1])
        const { operation, data } = actionData
        hasActions = true

        console.log('Processing memory action:', operation, data)

        // Execute memory operation
        // Instead of executing directly, add to pending actions
        const memoryAction = { operation, data }
        setPendingActions(prev => [...prev, memoryAction])

        // Show the first pending action for confirmation
        if (!pendingMemoryAction) {
          setPendingMemoryAction(memoryAction)
        }

        // Remove the hidden block from displayed text
        cleanedText = cleanedText.replace(match[0], '')
      } catch (e) {
        console.error('Hidden action parsing error:', e)
      }
    }

    // Also handle old bracket format for backward compatibility
    const bracketRegex = /\[(CREATE_NODE|UPDATE_NODE|DELETE_NODE|APPEND_NODE|MEMORY_ADD|MEMORY_FOLDER):\s*({[^}]+})\]/g
    let bracketMatch

    // Handle bracket commands [COMMAND: {...}]
    while ((bracketMatch = bracketRegex.exec(text)) !== null) {
      const [_, command, jsonStr] = bracketMatch
      try {
        const data = JSON.parse(jsonStr)

        switch (command) {
          case 'CREATE_NODE':
          case 'MEMORY_ADD':
            await createMemoryNode(data)
            break
          case 'MEMORY_FOLDER':
            await createMemoryNode({ ...data, type: 'folder' })
            break
          case 'UPDATE_NODE':
            await updateMemoryNode(data)
            break
          case 'APPEND_NODE':
            await updateMemoryNode({ ...data, append: true })
            break
          case 'DELETE_NODE':
            await deleteMemoryNode(data)
            break
        }
      } catch (e) {
        console.error('Command parsing error:', e)
      }
    }

    // Handle slash commands /memory_add ...
    const slashRegex = /\/(memory_add|memory_folder)\s+([^\n]+)/g
    let slashMatch
    while ((slashMatch = slashRegex.exec(text)) !== null) {
      const [_, action, params] = slashMatch
      try {
        // Parse params as path/to/folder "Item name" type=document content="..."
        const pathMatch = params.match(/^([^\s"]+)/)
        const nameMatch = params.match(/"([^"]+)"/)
        const typeMatch = params.match(/type=(\w+)/)
        const contentMatch = params.match(/content="([^"]+)"/)

        if (pathMatch && nameMatch) {
          const path = pathMatch[1].split('/')
          const name = nameMatch[1]
          const type = typeMatch ? typeMatch[1] : 'document'
          const content = contentMatch ? contentMatch[1] : ''

          // Find parent folder by path
          let parentId = null
          if (path[0] && path[0] !== '.') {
            // TODO: Implement path resolution
          }

          await createMemoryNode({
            name,
            type,
            content,
            parent_id: parentId
          })
        }
      } catch (e) {
        console.error('Slash command error:', e)
      }
    }

    // Return cleaned text or original if no actions found
    return cleanedText.trim() || text
  }

  // Create memory node (Using Supabase only)
  const createMemoryNode = async (data: any) => {
    const { type, name, content, color = '#6E6E80', parent_id = null, parent_name } = data

    if (!name) {
      console.error('❌ Cannot create node without name')
      return
    }

    try {
      // Handle path-based names (like "salade/document")
      let actualName = name
      let actualParentId = parent_id
      
      if (name.includes('/')) {
        const parts = name.split('/')
        const parentFolderName = parts[0]
        actualName = parts[parts.length - 1]
        
        // Find parent folder by name
        const { data: parentNode } = await supabase
          .from('memory_nodes')
          .select('id')
          .eq('project_id', projectId)
          .eq('name', parentFolderName)
          .eq('type', 'folder')
          .single()

        if (parentNode) {
          actualParentId = parentNode.id
        }
      } else if (!parent_id && parent_name) {
        // Find parent by name
        const { data: parentNode } = await supabase
          .from('memory_nodes')
          .select('id')
          .eq('project_id', projectId)
          .eq('name', parent_name)
          .eq('type', 'folder')
          .single()

        if (parentNode) {
          actualParentId = parentNode.id
        }
      }

      // Determine type from name if not specified
      let nodeType = type
      if (!type && actualName) {
        nodeType = actualName.endsWith('.md') || actualName.includes('.') ? 'document' : 'folder'
      }

      // Create in Supabase
      const icon = nodeType === 'folder' ? '📁' : '📄'
      const { data: created, error } = await supabase
        .from('memory_nodes')
        .insert({
          project_id: projectId,
          type: nodeType || 'document',
          name: actualName,
          content: content || (nodeType === 'document' ? `# ${actualName}\n\nContenu ici...` : null),
          icon,
          color,
          parent_id: actualParentId,
          position: 0
        })
        .select()

      if (!error && created && created[0]) {
        console.log('✅ Created in Supabase:', nodeType || 'document', actualName, 'parent:', actualParentId)
        showToast(`${nodeType === 'folder' ? 'Dossier' : 'Document'} "${actualName}" créé avec succès`, 'success')
        return created[0]
      } else {
        console.error('❌ Error creating in Supabase:', error)
        showToast(`Erreur lors de la création: ${error?.message}`, 'error')
        return null
      }

    } catch (error: any) {
      console.error('❌ Error creating node:', error)
      showToast(`Erreur lors de la création: ${error.message}`, 'error')
      return null
    }
  }

  // Update memory node (Using Supabase only)
  const updateMemoryNode = async (data: any) => {
    const { id, name, content, append = false, new_name } = data

    console.log('📝 Updating memory node:', { id, name, content: content?.substring(0, 50) })

    if (!id && !name) {
      console.error('❌ Cannot update node without ID or name')
      showToast('Erreur: nom ou ID manquant pour la mise à jour', 'error')
      return
    }

    try {
      // Find the node by name if no ID provided
      let nodeId = id
      if (!id && name) {
        const { data: nodes, error: findError } = await supabase
          .from('memory_nodes')
          .select('id, content')
          .eq('project_id', projectId)
          .eq('name', name)
          .single()

        if (findError) {
          console.error('❌ Node not found:', name)
          showToast(`Document "${name}" non trouvé`, 'error')
          return
        }

        if (nodes) {
          nodeId = nodes.id
          
          // If append mode, add to existing content
          if (append && nodes.content) {
            const existingContent = typeof nodes.content === 'string'
              ? nodes.content
              : JSON.stringify(nodes.content)
            content = existingContent + '\n\n' + content
          }
        }
      }

      // Update in Supabase
      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      
      if (content !== undefined) updateData.content = content
      if (new_name) updateData.name = new_name

      const { error } = await supabase
        .from('memory_nodes')
        .update(updateData)
        .eq('id', nodeId)

      if (!error) {
        console.log('✅ Updated in Supabase:', name || nodeId)
        showToast(`Document "${new_name || name}" mis à jour avec succès`, 'success')
      } else {
        console.error('❌ Error updating in Supabase:', error)
        showToast(`Erreur lors de la mise à jour: ${error.message}`, 'error')
      }

    } catch (error: any) {
      console.error('❌ Error updating node:', error)
      showToast(`Erreur lors de la mise à jour: ${error.message}`, 'error')
    }
  }

  // Helper function to update node in Mem0
  const updateNodeInMem0 = async (
    memoryService: any,
    nodePath: string,
    content: any,
    set_content: any,
    append: boolean,
    new_name: string | undefined,
    existingNode: any
  ) => {
    let finalContent = set_content || content

    // If append mode, get existing content from Mem0 first
    if (append) {
      const existing = await memoryService.findNodeByPath(nodePath)
      if (existing?.memory) {
        const existingContent = typeof existing.memory === 'string'
          ? existing.memory
          : JSON.stringify(existing.memory)
        finalContent = existingContent + '\n\n' + (content || '')
      } else if (existingNode?.content) {
        // Fallback to Supabase content if Mem0 doesn't have it
        const existingContent = typeof existingNode.content === 'string'
          ? existingNode.content
          : JSON.stringify(existingNode.content)
        finalContent = existingContent + '\n\n' + (content || '')
      }
    }

    // Update in Mem0
    await memoryService.updateNode(nodePath, {
      content: finalContent,
      name: new_name,
      metadata: {
        updated_by: 'assistant',
        updated_at: new Date().toISOString()
      }
    })

    console.log('✅ Updated in Mem0:', nodePath, append ? '(appended)' : '')

    // Minimal sync to Supabase for UI if node exists
    if (existingNode?.id) {
      await supabase
        .from('memory_nodes')
        .update({
          content: finalContent,
          name: new_name || existingNode.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingNode.id)
    }

    showToast(`Document "${new_name || nodePath.split('/').pop() || 'mémoire'}" mis à jour avec succès`, 'success')
  }

  // Delete memory node (Using Supabase only)
  const deleteMemoryNode = async (data: any) => {
    const { id, name } = data

    if (!name && !id) {
      console.error('❌ Cannot delete node without name or id')
      return
    }

    try {
      // Find the node by name if no ID provided
      let nodeId = id
      if (!id && name) {
        const { data: nodes, error: findError } = await supabase
          .from('memory_nodes')
          .select('id')
          .eq('project_id', projectId)
          .eq('name', name)
          .single()

        if (findError) {
          console.error('❌ Node not found:', name)
          showToast(`Élément "${name}" non trouvé`, 'error')
          return
        }

        if (nodes) {
          nodeId = nodes.id
        }
      }

      // Delete from Supabase
      const { error } = await supabase
        .from('memory_nodes')
        .delete()
        .eq('id', nodeId)

      if (!error) {
        console.log('✅ Deleted from Supabase:', name || nodeId)
        showToast(`Élément "${name}" supprimé avec succès`, 'success')
      } else {
        console.error('❌ Error deleting from Supabase:', error)
        showToast(`Erreur lors de la suppression: ${error.message}`, 'error')
      }

    } catch (error: any) {
      console.error('❌ Error deleting node:', error)
      showToast(`Erreur lors de la suppression: ${error.message}`, 'error')
    }
  }


  const handleClaudeAction = async (action: any) => {
    if (!action) return

    console.log('🔄 Processing Claude action:', action.operation || action.type)

    // Handle MEMORY_ACTION format
    if (action.operation) {
      try {
        switch (action.operation) {
          case 'create':
            await createMemoryNode(action.data)
            showToast(`Document "${action.data?.name}" créé avec succès`, 'success')
            break
          case 'update':
            await updateMemoryNode(action.data)
            // Toast is already shown in updateMemoryNode function
            break
          case 'append':
            await updateMemoryNode({ ...action.data, append: true })
            showToast(`Contenu ajouté à "${action.data?.name}"`, 'success')
            break
          case 'delete':
            await deleteMemoryNode(action.data)
            showToast(`Document "${action.data?.name}" supprimé`, 'success')
            break
          case 'update-section':
            // Handle section updates
            await updateMemoryNode({
              id: action.data.id,
              name: action.data.name,
              content: action.data.content,
              section_id: action.data.section_id
            })
            showToast(`Section mise à jour dans "${action.data?.name}"`, 'success')
            break
          default:
            console.warn('Unknown operation:', action.operation)
        }
      } catch (error) {
        console.error('Action execution error:', error)
        showToast(`Erreur lors de l'exécution de l'action: ${error.message}`, 'error')
      }
      return
    }

    // Handle old format for backward compatibility
    if (action.type === 'create_memory_node') {
      await supabase
        .from('memory_nodes')
        .insert({
          project_id: projectId,
          ...action.data
        })
    } else if (action.type === 'update_memory_node') {
      await supabase
        .from('memory_nodes')
        .update(action.data)
        .eq('id', action.nodeId)
    }
    // Add more action handlers as needed
  }

  // Memoize filtered messages to prevent recalculation
  const filteredMessages = useMemo(() => {
    return messages.filter((message, index, self) =>
      index === self.findIndex(m => m.id === message.id)
    )
  }, [messages])

  // Handlers pour la confirmation des actions
  const handleConfirmAction = async () => {
    if (!pendingMemoryAction) return

    const { operation, data } = pendingMemoryAction

    try {
      // Exécuter l'action
      switch (operation) {
        case 'create':
          await createMemoryNode(data)
          break
        case 'update':
          await updateMemoryNode(data)
          break
        case 'append':
          await updateMemoryNode({ ...data, append: true })
          break
        case 'delete':
          await deleteMemoryNode(data)
          break
      }

      console.log('✅ Action mémoire exécutée:', operation)
    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution:', error)
    }

    // Passer à l'action suivante
    setPendingMemoryAction(null)
    setPendingActions(prev => {
      const remaining = prev.slice(1)
      if (remaining.length > 0) {
        setPendingMemoryAction(remaining[0])
      }
      return remaining
    })
  }

  const handleCancelAction = () => {
    // Annuler l'action et passer à la suivante
    setPendingMemoryAction(null)
    setPendingActions(prev => {
      const remaining = prev.slice(1)
      if (remaining.length > 0) {
        setPendingMemoryAction(remaining[0])
      }
      return remaining
    })
  }

  return (
    <>
      <div
        ref={containerRef}
        className="flex-1 p-6 chat-container overflow-y-auto"
        style={{ height: 'calc(100vh - 200px)' }}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {filteredMessages.map((message, index) => {
            const isLastAssistantMessage =
              index === filteredMessages.length - 1 &&
              message.role === 'assistant' &&
              !isStreaming

            return (
              <MessageComponent
                key={message.id}
                message={message}
                pendingAction={isLastAssistantMessage ? pendingMemoryAction : undefined}
                onConfirmAction={isLastAssistantMessage ? handleConfirmAction : undefined}
                onRejectAction={isLastAssistantMessage ? handleCancelAction : undefined}
              />
            )
          })}

          {/* Streaming Message with memoized component */}
          {isStreaming && streamingContent && (
            <StreamingMessageWrapper
              content={streamingContent}
              isComplete={isStreamComplete}
            />
          )}

          {/* Typing Indicator */}
          {isStreaming && !streamingContent && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-background" />
              </div>
              <div className="px-4 py-3 rounded-xl bg-muted">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
