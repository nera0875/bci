'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { User, Bot, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import ReactMarkdown from 'react-markdown'
import StreamingText from './StreamingText'
import { MemoryActionButtons } from './MemoryActionButtons'
import MemoryActionDisplay from './MemoryActionDisplay'
import StorageNotification from './StorageNotification'
import { useAppStore } from '@/lib/store/app-store'
import toast from 'react-hot-toast'
// import { intentAnalyzer } from '@/lib/memory/contextualIntentAnalyzer' // DÉSACTIVÉ
import { ConversationManager } from '@/lib/services/conversation'
import { generateUUID } from '@/lib/utils/uuid'
import { OptimizationEngine } from '@/lib/services/optimizationEngine'

// Helpers simplifiés
const buildContextualPrompt = (message: string, targetFolder: string, rulesContext: string, memoryContext: any[], projectGoal: string) => {
  let prompt = message
  if (projectGoal) prompt += `\n\nObjectif du projet: ${projectGoal}`
  if (memoryContext.length > 0) prompt += `\n\nContexte mémoire: ${memoryContext.map(m => m.name).join(', ')}`
  if (rulesContext) prompt += `\n\n${rulesContext}`
  return prompt
}

const getPromptTemplate = (folder: string) => ({
  systemPrompt: `Vous êtes un assistant pentesting expert. Focus sur: ${folder}`
})
// Memory services removed - Using Supabase native system only
import '@/app/chat.css'

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'] & { role: 'user' | 'assistant' | 'system' }

// Memoized streaming wrapper for performance
const StreamingMessageWrapper = React.memo(({
  content,
  isComplete
}: {
  content: string
  isComplete: boolean
}) => (
  <div className="w-full bg-[#F7F7F8]" data-streaming="true">
    <div className="max-w-4xl mx-auto px-4 py-6 flex gap-4">
      <div className="w-8 h-8 bg-[#202123] rounded-full flex items-center justify-center flex-shrink-0">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0 text-[#202123] prose prose-sm max-w-none [&>*]:text-[#202123] [&_p]:leading-7">
        <StreamingText
          content={content}
          isComplete={isComplete}
        />
      </div>
    </div>
  </div>
))
StreamingMessageWrapper.displayName = 'StreamingMessageWrapper'

const SystemIcon = () => (
  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
    <div className="w-4 h-4 bg-blue-600 rounded-full" />
  </div>
)

// Memoized message component for performance
const MessageComponent = React.memo(({
  message,
  pendingAction,
  onConfirmAction,
  onRejectAction
}: {
  message: ChatMessage
  pendingAction?: { operation: string; data: any; confidence?: number }
  onConfirmAction?: () => void
  onRejectAction?: () => void
}) => {
  const isSystem = message.role === 'system'

  return (
    <div
      className={`group w-full ${
        message.role === 'assistant' ? 'bg-[#F7F7F8]' : ''
      } ${message.role === 'user' ? 'bg-white' : ''}`}
    >
      <div className="max-w-4xl mx-auto px-4 py-6 flex gap-4">
        {/* Avatar */}
        {message.role === 'assistant' && (
          <div className="w-8 h-8 bg-[#202123] rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
        )}

        {message.role === 'user' && (
          <div className="w-8 h-8 bg-[#5436DA] rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
        )}

        {isSystem && <SystemIcon />}

        <div className="flex-1 min-w-0">
          {!isSystem && message.role === 'assistant' ? (
            <div className="prose prose-sm max-w-none text-[#202123] [&>*]:text-[#202123] [&_p]:leading-7 [&_p]:mb-4 [&_pre]:bg-[#000000] [&_pre]:text-[#FFFFFF] [&_pre]:p-4 [&_pre]:rounded-lg [&_code]:text-sm [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg">
              <ReactMarkdown
                components={{
                  // Custom renderer for paragraphs - prevent nesting issues
                  p: ({ children }) => (
                    <div className="mb-4 leading-7">{children}</div>
                  ),
                  // Custom renderer for MEMORY_ACTION blocks
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '')
                    const content = String(children).replace(/\n$/, '')

                    // Check if this is a MEMORY_ACTION block
                    if (content.includes('MEMORY_ACTION')) {
                      try {
                        const actionMatch = content.match(/<!--MEMORY_ACTION\s*([\s\S]*?)-->/)
                        if (actionMatch) {
                          const action = JSON.parse(actionMatch[1])
                          return <MemoryActionDisplay key={Math.random()} action={action} />
                        }
                      } catch (e) {
                        // Fallback to regular code block
                      }
                    }

                    // Inline code
                    if (!match) {
                      return (
                        <code className="bg-[#000000] text-[#FFFFFF] px-1 py-0.5 rounded text-sm" {...props}>
                          {children}
                        </code>
                      )
                    }

                    // Code block
                    return (
                      <pre className="bg-[#000000] text-[#FFFFFF] p-4 rounded-lg overflow-x-auto my-4">
                        <code className={className}>{children}</code>
                      </pre>
                    )
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-[#202123] leading-7">
              {message.content}
              {message.role === 'user' ? null : (
                <div className="text-xs text-[#6E6E80] mt-2">
                  {new Date(message.created_at || Date.now()).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

          {/* Afficher métadonnées (tokens, coût) pour messages assistant */}
          {message.role === 'assistant' && message.metadata && (
            <div className="mt-3 flex items-center gap-4 text-xs text-[#6E6E80]">
              {message.metadata.tokens && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    {message.metadata.tokens.input + message.metadata.tokens.output} tokens
                  </span>
                  {message.metadata.cost !== undefined && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                      message.metadata.cached
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {message.metadata.cached ? '💾' : '💰'}
                      ${message.metadata.cost.toFixed(6)}
                      {message.metadata.cached && ' (cached)'}
                    </span>
                  )}
                </div>
              )}
              {message.metadata.model && (
                <span className="text-[#6E6E80]">
                  {message.metadata.model.replace('claude-', '')}
                </span>
              )}
            </div>
          )}

          {/* Afficher les boutons d'action si c'est le dernier message assistant avec une action */}
          {message.role === 'assistant' && pendingAction && (
            <div className="mt-4">
              <MemoryActionButtons
                action={pendingAction}
                onConfirm={onConfirmAction!}
                onReject={onRejectAction!}
                confidence={pendingAction.confidence}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
MessageComponent.displayName = 'MessageComponent'

interface ChatStreamProps {
  projectId: string
  conversationId?: string | null
  onConversationCreated?: (conversationId: string) => void
  onStreamingChange?: (isStreaming: boolean, stopFn?: () => void) => void
}

interface BoardAction {
  type: 'create_row' | 'open_modal' | 'organize_content'
  section?: 'rules' | 'memory' | 'optimization'
  folder?: string
  data?: any
  tab?: 'rules' | 'memory' | 'optimization'
  content?: string
  userMessage?: string
}

export default function ChatStream({ projectId, conversationId: propConversationId, onConversationCreated, onStreamingChange }: ChatStreamProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreamComplete, setIsStreamComplete] = useState(false)
  const [pendingMemoryAction, setPendingMemoryAction] = useState<{ operation: string; data: any; confidence?: number } | null>(null)
  const [pendingActions, setPendingActions] = useState<{ operation: string; data: any; confidence?: number }[]>([])
  const [lastUserMessage, setLastUserMessage] = useState<string>('')
  const [storageNotifications, setStorageNotifications] = useState<Array<{
    icon: string
    message: string
    path: string
    documentId?: string
    metadata?: any
  }>>([])
  const lastProcessedMessageId = useRef<string | null>(null)
  const bufferRef = useRef<string>('')
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageCountRef = useRef<number>(0)
  const conversationManagerRef = useRef<ConversationManager | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(propConversationId || null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const onStreamingChangeRef = useRef(onStreamingChange)

  // Mettre à jour la ref quand la callback change
  useEffect(() => {
    onStreamingChangeRef.current = onStreamingChange
  }, [onStreamingChange])

  const { currentProject } = useAppStore()

  // Fonction pour stopper le streaming
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setStreamingContent('')
    setIsStreamComplete(true)
  }, [])

  // Notifier le parent quand le streaming change
  useEffect(() => {
    onStreamingChangeRef.current?.(isStreaming, isStreaming ? stopStreaming : undefined)
  }, [isStreaming, stopStreaming])

  const addSystemMessage = async (content: string) => {
    const systemMessage: ChatMessage = {
      id: generateUUID(),
      role: 'system' as const,
      content,
      created_at: new Date().toISOString(),
      project_id: projectId,
      conversation_id: conversationId || null,
      streaming: null,
      metadata: {}
    } as ChatMessage

    // Add to local state
    setMessages(prev => [...prev, systemMessage])

    // Save to database
    if (conversationId) {
      const { error } = await supabase
        .from('chat_messages')
        .insert(systemMessage)
        .select()
        .single()

      if (error) {
        console.error('Failed to save system message:', error)
      }
    }

    // Optional toast notification
    toast.success(content, {
      duration: 3000,
      position: 'top-right'
    })
  }

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
  const rafRef = useRef<number | undefined>()
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
  const debouncedScrollRef = useRef<NodeJS.Timeout | undefined>()
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

  // Handler pour commandes slash dans le chat
  const handleSlashCommand = useCallback((command: string) => {
    console.log('🔧 Processing slash command:', command)
    
    // Ouvrir le board modulaire avec le bon onglet
    const appStore = useAppStore.getState()
    if (appStore.setShowUnifiedBoard && appStore.setUnifiedBoardTab) {
      const { setShowUnifiedBoard, setUnifiedBoardTab } = appStore
      
      switch (command.trim()) {
        case '/add rule':
        case '/add-rule':
          setUnifiedBoardTab('rules')
          setShowUnifiedBoard(true)
          toast.success('📋 Ouverture du board Règles pour ajout')
          break
        
        case '/add memory':
        case '/add-memory':
          setUnifiedBoardTab('memory')
          setShowUnifiedBoard(true)
          toast.success('🧠 Ouverture du board Mémoire pour ajout')
          break
        
        case '/add optimization':
        case '/add-optimization':
          setUnifiedBoardTab('optimization')
          setShowUnifiedBoard(true)
          toast.success('⚡ Ouverture du board Optimisation pour ajout')
          break
        
        case '/board':
        case '/open-board':
          setShowUnifiedBoard(true)
          toast.success('📊 Board modulaire ouvert')
          break
        
        default:
          toast('❓ Commande non reconnue. Essayez /add rule, /add memory, /board')
      }
    } else {
      toast('⚠️ Board non disponible')
    }
  }, [])

  // Calculer score de confiance pour auto-rangement
  const calculateConfidence = useCallback((content: string, userMessage: string): number => {
    let score = 0
    const combinedText = (content + ' ' + userMessage).toLowerCase()

    // Indicateurs forts : structure markdown pentest
    if (content.includes('## Payload') && content.includes('## Impact')) score += 0.5
    if (content.includes('## Exploitation')) score += 0.3
    if (content.match(/Efficacité.*?:\s*\d+%/i)) score += 0.2
    if (content.includes('```http') || content.includes('```bash')) score += 0.15

    // Indicateurs contextuels
    const keywords = ['idor', 'sql injection', 'xss', 'payload', 'exploitation', 'vulnérabilité', 'business logic', 'race condition']
    const keywordCount = keywords.filter(k => combinedText.includes(k)).length
    score += Math.min(0.3, keywordCount * 0.05)

    // Longueur appropriée
    if (content.length > 200 && content.length < 5000) score += 0.1

    // Structure de test (endpoint, résultat, etc.)
    if (content.match(/endpoint.*?:/i) && content.match(/résultat.*?:/i)) score += 0.15

    return Math.min(1.0, score)
  }, [])

  // Fonction intelligente pour rangement automatique
  const autoOrganizeContent = useCallback(async (content: string, userMessage: string) => {
    try {
      // Calculer confiance
      const confidence = calculateConfidence(content, userMessage)
      console.log('🤖 Score de confiance:', (confidence * 100).toFixed(0) + '%')

      // Détection dossier cible (améliorée)
      const targetFolder = detectTargetFolder(content + ' ' + userMessage)

      // Décision basée sur confiance
      if (confidence > 0.85 && targetFolder !== '*') {
        // HAUTE CONFIANCE → Auto-rangement direct
        console.log('✅ Haute confiance → Auto-rangement')

        const memoryResponse = await fetch('/api/memory/nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            parentId: null,
            name: `Auto: ${targetFolder} (${new Date().toLocaleDateString('fr-FR')})`,
            type: 'document',
            content: content,
            section: 'memory',
            category: targetFolder
          })
        })

        if (memoryResponse.ok) {
          const { success, node } = await memoryResponse.json()
          if (success && node) {
            console.log('✅ Document créé:', node.name)

            const toastContent = (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-sm">📁 Contenu rangé en mémoire</div>
                  <div className="text-xs text-gray-600 mt-1">{node.name}</div>
                  <div className="text-xs text-green-600 mt-0.5">Confiance: {(confidence * 100).toFixed(0)}%</div>
                </div>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-bci-board', { detail: { section: 'memory' } }))
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  Voir
                </button>
              </div>
            )
            toast.success(toastContent, { duration: 6000 })
            window.dispatchEvent(new CustomEvent('board-reload', { detail: { projectId, section: 'memory' } }))
            return true
          }
        }
      } else if (confidence > 0.5 && targetFolder !== '*') {
        // CONFIANCE MOYENNE → Log pour future modal validation
        console.log('⚠️ Confiance moyenne (' + (confidence * 100).toFixed(0) + '%) → Validation future')
        // TODO: Implémenter modal validation
      } else {
        console.log('ℹ️ Confiance faible ou pas de dossier cible → Pas de rangement')
      }
    } catch (error) {
      console.error('❌ Erreur rangement automatique:', error)
    }

    return false
  }, [projectId, calculateConfidence])

  const streamClaudeResponse = async (userMessage: string) => {
    console.log('Starting Claude response for:', userMessage)
    setIsStreaming(true)
    setStreamingContent('')
    setIsStreamComplete(false)
    bufferRef.current = ''

    // Vérifier si c'est une commande slash avant de streamer
    if (userMessage.startsWith('/')) {
      handleSlashCommand(userMessage)
      // Ne pas streamer Claude pour les commandes, mais ajouter un message système
      const commandMessage: ChatMessage = {
        id: generateUUID(),
        role: 'system' as const,
        content: `Commande exécutée: ${userMessage}`,
        created_at: new Date().toISOString(),
        project_id: projectId,
        conversation_id: conversationId || null,
        streaming: null,
        metadata: {}
      } as ChatMessage
      setMessages(prev => [...prev, commandMessage])
      setIsStreaming(false)
      return
    }

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
            conversation_id: currentConvId,
            streaming: null,
            metadata: {}
          })

        // Auto-organize si applicable
        await autoOrganizeContent(convContext.cachedResponse, userMessage)

        setIsStreaming(false)
        return
      }

      // Get additional context - RÈGLES EN PRIORITÉ avec templates dynamiques
      const targetFolder = detectTargetFolder(userMessage)
      const rulesContext = await getRulesContext(userMessage)
      const memoryContext = await getMemoryContext(userMessage)
      const similarContent = await searchSimilarContent(userMessage)
      const projectGoal = await getProjectGoal()

      console.log('🎯 Context detected:', targetFolder)
      console.log('📋 Rules loaded:', rulesContext ? 'YES' : 'NO')
      console.log('🧠 Memory context:', memoryContext.length, 'items')

      // Construire le prompt contextuel avec template dynamique
      const contextualPrompt = buildContextualPrompt(
        userMessage,
        targetFolder,
        rulesContext,
        memoryContext,
        projectGoal
      )

      console.log('🚀 Using contextual prompt for:', targetFolder)

      // 🧠 AUTO-REINFORCEMENT: Analyze user message for auto-storage
      try {
        const analyzeResponse = await fetch('/api/chat/analyze-and-act', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            userMessage,
            confidence: 0
          })
        })

        if (analyzeResponse.ok) {
          const analysisResult = await analyzeResponse.json()
          console.log('🧠 Analysis result:', analysisResult)

          // Show notification based on action
          if (analysisResult.action === 'auto_stored') {
            setStorageNotifications(prev => [...prev, {
              icon: '✅',
              message: analysisResult.message,
              path: analysisResult.suggestedPath,
              documentId: analysisResult.nodeId,
              metadata: analysisResult
            }])
          } else if (analysisResult.action === 'needs_confirmation') {
            toast(analysisResult.message, {
              duration: 5000,
              icon: '⚠️'
            })
          }
        }
      } catch (error) {
        console.error('Analysis failed:', error)
      }

      // Combine recent messages from ConversationManager with similar messages
      const conversationHistory = [...convContext.recentMessages, ...convContext.similarMessages]

      // Ajouter un message système avec le template si contexte spécifique
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ]

      // Si contexte spécifique détecté, ajouter le prompt système
      if (targetFolder !== '*') {
        const template = getPromptTemplate(targetFolder)
        messages.push({
          role: 'system' as const,
          content: template.systemPrompt + (rulesContext ? `\n\nRÈGLES SPÉCIFIQUES:\n${rulesContext}` : '')
        })
      }


      messages.push({
        role: 'user',
        content: contextualPrompt
      })

      // Créer un nouvel AbortController pour cette requête
      abortControllerRef.current = new AbortController()

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
          saveMemory: true,            // Auto-save responses to Mem0
          enableAutoOrganization: true // Flag pour activer auto-org côté serveur si implémenté
        }),
        signal: abortControllerRef.current.signal
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
                } else if (data.type === 'usage') {
                  // PHASE 2.1: Sauvegarder métadonnées tokens
                  console.log('💰 API Usage:', data)
                  // Stocker pour sauvegarde avec le message
                  window.sessionStorage.setItem('lastApiUsage', JSON.stringify(data))
                } else if (data.type === 'storage_notification') {
                  // Afficher notification de rangement
                  console.log('📦 Storage notification:', data.message)
                  setStorageNotifications(prev => [...prev, {
                    icon: data.icon,
                    message: data.message,
                    path: data.path,
                    documentId: data.documentId,
                    metadata: data.metadata
                  }])
                } else if (data.type === 'action') {
                  // Handle Claude actions (memory CRUD, etc.)
                  await handleClaudeAction(data.action)
                } else if (data.type === 'board_action') {
                  // Nouvelle action pour board depuis le stream
                  console.log('🛡️ Board action from stream:', data.action)
                  // Ex: data.action = { type: 'create_row', section: 'rules', data: {...} }
                  // await handleBoardAction(data.action)
                  console.log('Board action received:', data.action)
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

        // Récupérer les métadonnées de tokens depuis sessionStorage
        const usageData = window.sessionStorage.getItem('lastApiUsage')
        const metadata = usageData ? JSON.parse(usageData) : {}

        const { data: newMessage } = await supabase
          .from('chat_messages')
          .insert({
            project_id: projectId,
            role: 'assistant' as const,
            content: fullContent,
            conversation_id: currentConvId,
            metadata: metadata
          })
          .select()
          .single()

        // Nettoyer sessionStorage après utilisation
        if (usageData) {
          window.sessionStorage.removeItem('lastApiUsage')
        }

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

          // Auto-organize le contenu de la réponse
          const organized = await autoOrganizeContent(fullContent, userMessage)
          if (organized) {
            console.log('✅ Auto-organization completed')
          }

          // Analyse de patterns pour suggestions d'optimisation
          try {
            const optimizationEngine = new OptimizationEngine(projectId)

            // Récupérer l'historique de conversation
            const conversationHistory = messages.map((msg: any) => ({
              role: msg.role,
              content: msg.content || '',
              timestamp: msg.created_at || new Date().toISOString()
            }))

            // Ajouter le dernier échange
            conversationHistory.push(
              { role: 'user' as const, content: userMessage, timestamp: new Date().toISOString() },
              { role: 'assistant' as const, content: fullContent, timestamp: new Date().toISOString() }
            )

            // Analyser et générer des suggestions
            const suggestions = await optimizationEngine.analyzeConversation(conversationHistory)

            // Queue les suggestions pour review
            for (const suggestion of suggestions) {
              await optimizationEngine.queueSuggestion(suggestion)
            }

            if (suggestions.length > 0) {
              console.log(`🎯 ${suggestions.length} nouvelles suggestions d'optimisation générées`)

              // Notification si suggestions importantes
              const highConfidenceSuggestions = suggestions.filter(s => s.confidence > 0.9)
              if (highConfidenceSuggestions.length > 0) {
                toast.success(`${highConfidenceSuggestions.length} suggestions d'optimisation disponibles`, {
                  duration: 5000,
                  icon: '✨'
                })
              }
            }
          } catch (error) {
            console.error('Erreur analyse patterns:', error)
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
    } catch (error: any) {
      // Ignorer l'erreur AbortError (arrêt volontaire du streaming)
      if (error.name === 'AbortError') {
        console.log('Streaming stopped by user')
        return
      }

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

  // Détecter le dossier cible - VERSION AMÉLIORÉE avec parsing markdown
  const detectTargetFolder = (message: string): string => {
    const lowerMessage = message.toLowerCase()

    // Détecter depuis structure markdown (priorité maximale)
    const titleMatch = message.match(/# (.+?) -/)
    if (titleMatch) {
      const title = titleMatch[1].trim()
      return title.replace(/\s+/g, '_')
    }

    // IDOR (patterns larges)
    if (lowerMessage.match(/idor|insecure direct object|unauthorized access|object reference/)) {
      return 'IDOR'
    }

    // SQL Injection
    if (lowerMessage.match(/sql injection|sqli|union select|or 1=1/)) {
      return 'SQL_Injection'
    }

    // XSS
    if (lowerMessage.match(/xss|cross.site.script|alert\(|<script>/)) {
      return 'XSS'
    }

    // Business Logic
    if (lowerMessage.match(/business logic|negative price|race condition|prix négatif/)) {
      return 'Business_Logic'
    }

    // Authentication
    if (lowerMessage.match(/authentication|auth bypass|jwt|session|token/)) {
      return 'Authentication'
    }

    // API Security
    if (lowerMessage.match(/api security|api key|rate limit|cors/)) {
      return 'API_Security'
    }

    // Détection générique si structure pentest présente
    if (message.includes('## Payload') && message.includes('## Impact')) {
      // Parser depuis type si disponible
      const typeMatch = message.match(/Type.*?:\s*(.+)/i)
      if (typeMatch) {
        return typeMatch[1].trim().replace(/\s+/g, '_')
      }
      return 'Pentest_Result'
    }

    // Détection Planning/Stratégie
    if (lowerMessage.includes('plan') || lowerMessage.includes('stratégie') || lowerMessage.includes('méthodologie')) {
      return 'planning'
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

      // Formater les règles pour l'IA
      return relevantRules.map(rule =>
        `- ${rule.name}: ${rule.description || rule.action}`
      ).join('\n')
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

          {/* Storage Notifications */}
          {storageNotifications.map((notification, index) => (
            <StorageNotification
              key={`storage-${index}`}
              icon={notification.icon}
              message={notification.message}
              path={notification.path}
              documentId={notification.documentId}
              metadata={notification.metadata}
              onNavigate={(docId) => {
                // Ouvrir le board et naviguer vers le document
                const appStore = useAppStore.getState()
                if (appStore.setShowUnifiedBoard) {
                  appStore.setShowUnifiedBoard(true)
                  appStore.setUnifiedBoardTab?.('memory')
                  toast.success('Board ouvert - Document sélectionné')
                }
              }}
            />
          ))}

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