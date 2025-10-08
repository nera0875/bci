'use client'

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { User, Bot, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import ReactMarkdown from 'react-markdown'
import StreamingMarkdown from './StreamingMarkdown'
import StreamingMarkdownBatched from './StreamingMarkdownBatched'
import SmoothTypewriter from './SmoothTypewriter'
import StreamingText from './StreamingText'
import MemoryActionDisplay from './MemoryActionDisplay'
import StorageNotification from './StorageNotification'
import { PendingFactsToast } from './PendingFactsToast'
import { MemoryActionPanel } from './MemoryActionPanel'
import { useAppStore } from '@/lib/store/app-store'
import toast from 'react-hot-toast'
import { generateUUID } from '@/lib/utils/uuid'
import { OptimizationEngine } from '@/lib/services/optimizationEngine'
import { AIActionDetector, DetectedAction } from '@/lib/services/aiActionDetector'
import { getStyleSystemPrompt } from '@/components/chat/PromptStyleSelector'
import { ChatScrollAnchor } from './ChatScrollAnchor'
import { buildMemoryContext, formatMemoryForPrompt } from '@/lib/services/memoryContextBuilder'

// Token estimation
const estimateTokens = (text: string) => Math.ceil(text.length / 4)

// Relevance scoring for facts
const scoreFactRelevance = (fact: any, userMessage: string) => {
  let score = 0
  const msgLower = userMessage.toLowerCase()

  // URL/endpoint match
  if (fact.http_request?.url && msgLower.includes(fact.http_request.url.toLowerCase())) score += 10

  // Technique match
  const techniques = ['blv', 'idor', 'sqli', 'xss', 'csrf', 'ssrf', 'rce', 'lfi', 'rfi']
  techniques.forEach(tech => {
    if (fact.technique?.toLowerCase().includes(tech) && msgLower.includes(tech)) score += 8
  })

  // Severity boost
  if (fact.severity === 'critical') score += 5
  else if (fact.severity === 'high') score += 3

  // Attack chain boost
  if (fact.attack_chain) score += 4

  // Relations boost
  if (fact.related_to?.length > 0) score += 2

  // Keyword match
  const factText = `${fact.fact} ${fact.category || ''}`.toLowerCase()
  const keywords = msgLower.match(/\b\w{4,}\b/g) || []
  keywords.forEach(kw => {
    if (factText.includes(kw)) score += 1
  })

  return score
}

// Format HTTP request (compact or full)
const formatHttpRequest = (httpReq: any, mode: 'compact' | 'full') => {
  let text = `\n  URL: ${httpReq.method} ${httpReq.url}`

  if (mode === 'full') {
    // Full headers
    if (httpReq.headers) {
      text += `\n  Headers:`
      Object.entries(httpReq.headers).forEach(([k, v]) => {
        text += `\n    ${k}: ${v}`
      })
    }
    // Full body
    if (httpReq.body) {
      text += `\n  Body: ${typeof httpReq.body === 'object' ? JSON.stringify(httpReq.body, null, 2) : httpReq.body}`
    }
  } else {
    // Compact: key headers only
    if (httpReq.body) {
      const bodyStr = typeof httpReq.body === 'object' ? JSON.stringify(httpReq.body) : httpReq.body
      text += `\n  Body: ${bodyStr.substring(0, 100)}${bodyStr.length > 100 ? '...' : ''}`
    }
    if (httpReq.headers?.Authorization) {
      text += `\n  Auth: ${httpReq.headers.Authorization.substring(0, 50)}...`
    }
    if (httpReq.headers?.['X-Session-Id']) {
      text += `\n  Session: ${httpReq.headers['X-Session-Id']}`
    }
    if (httpReq.headers?.Cookie) {
      text += `\n  Cookie: ${httpReq.headers.Cookie.substring(0, 50)}...`
    }
  }

  return text
}

// Helpers simplifiés
const buildContextualPrompt = (message: string, targetFolder: string, rulesContext: string, memoryContext: any[], projectGoal: string) => {
  const MAX_CONTEXT_TOKENS = 8000
  let currentTokens = 0
  let prompt = message

  currentTokens += estimateTokens(message)

  if (projectGoal) {
    const goalText = `\n\nObjectif du projet: ${projectGoal}`
    prompt += goalText
    currentTokens += estimateTokens(goalText)
  }

  // Score and sort facts by relevance
  const scoredFacts = memoryContext.map(fact => ({
    fact,
    score: scoreFactRelevance(fact, message)
  })).sort((a, b) => b.score - a.score)

  if (scoredFacts.length > 0) {
    let memorySection = `\n\n=== MÉMOIRE ===\n`
    const tempFacts: string[] = []

    scoredFacts.forEach(({ fact }, index) => {
      let factText = `\n[${index + 1}] ${fact.fact}`

      // Metadata
      if (fact.technique) factText += ` [${fact.technique}]`
      if (fact.severity) factText += ` (${fact.severity})`
      if (fact.category) factText += ` - ${fact.category}`

      // HTTP request - try full mode first
      if (fact.http_request) {
        const fullHttp = formatHttpRequest(fact.http_request, 'full')
        const compactHttp = formatHttpRequest(fact.http_request, 'compact')

        // Check if we have space for full version
        const testTokens = estimateTokens(factText + fullHttp)
        if (currentTokens + testTokens < MAX_CONTEXT_TOKENS) {
          factText += fullHttp
        } else {
          factText += compactHttp
        }
      }

      // Relations
      if (fact.related_to?.length > 0) {
        factText += `\n  → Lié à ${fact.related_to.length} fact(s)`
      }

      // Attack chain info
      if (fact.attack_chain) {
        factText += `\n  ⛓️ Chaîne: ${fact.attack_chain.label} (étape ${fact.attack_chain.step}/${fact.attack_chain.total_steps || '?'})`
      }

      factText += `\n`

      const factTokens = estimateTokens(factText)
      if (currentTokens + factTokens < MAX_CONTEXT_TOKENS) {
        tempFacts.push(factText)
        currentTokens += factTokens
      }
    })

    if (tempFacts.length > 0) {
      memorySection += tempFacts.join('')

      // Add note if some facts were truncated
      if (tempFacts.length < scoredFacts.length) {
        memorySection += `\n[${scoredFacts.length - tempFacts.length} facts omis - demandez plus de détails si besoin]\n`
      }

      prompt += memorySection
    }
  }

  if (rulesContext) {
    const rulesTokens = estimateTokens(rulesContext)
    if (currentTokens + rulesTokens < MAX_CONTEXT_TOKENS) {
      prompt += `\n\n${rulesContext}`
    }
  }

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
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isFading, setIsFading] = useState(false)
  const prevIsCompleteRef = useRef(isComplete)

  // Détecte le passage de streaming → complete pour déclencher fade
  useLayoutEffect(() => {
    if (!prevIsCompleteRef.current && isComplete) {
      // Streaming vient de se terminer → fade out puis in
      setIsFading(true)

      // Fade in après 80ms (durée fade out)
      const timeout = setTimeout(() => {
        setIsFading(false)
        // Force recalcul layout pour éviter flash
        if (wrapperRef.current) {
          wrapperRef.current.getBoundingClientRect()
        }
      }, 80)

      return () => clearTimeout(timeout)
    }
    prevIsCompleteRef.current = isComplete
  }, [isComplete])

  return (
    <div
      ref={wrapperRef}
      className="w-full bg-[#F7F7F8]"
      data-streaming={!isComplete}
      style={{
        // Transition fade smooth pour masquer le re-render
        opacity: isFading ? 0.7 : 1,
        transition: 'opacity 0.08s ease-in-out',
        willChange: 'opacity',
        transform: 'translateZ(0)', // Force GPU acceleration
        backfaceVisibility: 'hidden' as const,
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-6 flex gap-4">
        <div className="w-8 h-8 bg-[#202123] rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0 text-[#202123] prose prose-sm max-w-none [&>*]:text-[#202123] [&_p]:leading-7">
          <StreamingMarkdownBatched
            content={content}
            isComplete={isComplete}
          />
          {!isComplete && (
            <span className="typing-cursor-smooth" />
          )}
        </div>
      </div>
    </div>
  )
})
StreamingMessageWrapper.displayName = 'StreamingMessageWrapper'

const SystemIcon = () => (
  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
    <div className="w-4 h-4 bg-blue-600 rounded-full" />
  </div>
)

// Memoized message component for performance
const MessageComponent = React.memo(({
  message,
  memoryActions,
  onValidateMemoryActions,
  onRejectMemoryActions
}: {
  message: ChatMessage
  memoryActions?: any[]
  onValidateMemoryActions?: (actions: any[]) => void
  onRejectMemoryActions?: () => void
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
            (() => {
              // Clean content: remove MEMORY_ACTION blocks (parsing fait dans le parent)
              let cleanContent = message.content.replace(/<!--MEMORY_ACTION[\s\S]*?-->/g, '')

              return (
                <>
                  {/* Display memory actions as compact badges - DÉSACTIVÉ (cause duplication avec panel) */}
                  {/* {memoryActions && memoryActions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {memoryActions.map((action, idx) => (
                        <MemoryActionDisplay key={idx} action={action} />
                      ))}
                    </div>
                  )} */}

                  {/* Display cleaned markdown content with streaming-optimized rendering */}
                  <StreamingMarkdownBatched content={cleanContent} isComplete={true} />
                </>
              )
            })()
          ) : (
            <div>
              {/* Use StreamingMarkdown for real-time rendering */}
              {message.role === 'assistant' ? (
                <StreamingMarkdown content={message.content} />
              ) : (
                <div className="text-[#202123] leading-7">
                  {message.content}
                </div>
              )}
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
              {(message.metadata as any).tokens && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    {(message.metadata as any).tokens.input + (message.metadata as any).tokens.output} tokens
                  </span>
                  {(message.metadata as any).cost !== undefined && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                      (message.metadata as any).cached
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {(message.metadata as any).cached ? '💾' : '💰'}
                      ${(message.metadata as any).cost.toFixed(6)}
                      {(message.metadata as any).cached && ' (cached)'}
                    </span>
                  )}
                </div>
              )}
              {(message.metadata as any).model && (
                <span className="text-[#6E6E80]">
                  {(message.metadata as any).model.replace('claude-', '')}
                </span>
              )}
            </div>
          )}

          {/* ✅ Panel validation MEMORY_ACTION inline */}
          {message.role === 'assistant' && memoryActions && memoryActions.length > 0 && (
            <MemoryActionPanel
              actions={memoryActions}
              onValidate={onValidateMemoryActions!}
              onReject={onRejectMemoryActions!}
            />
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
  promptStyle?: string
  customStyles?: any[]
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

export default function ChatStream({ projectId, conversationId: propConversationId, promptStyle = 'concis', customStyles = [], onConversationCreated, onStreamingChange }: ChatStreamProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreamComplete, setIsStreamComplete] = useState(false)
  // ❌ REMOVED: pendingMemoryAction, pendingActions (old validation system)
  const [lastUserMessage, setLastUserMessage] = useState<string>('')
  const [storageNotifications, setStorageNotifications] = useState<Array<{
    icon: string
    message: string
    path: string
    documentId?: string
    metadata?: any
  }>>([])
  const [pendingDecisions, setPendingDecisions] = useState<Array<{
    id: string
    type: string
    suggestion: string
    context: any
    proposedAction: any
    timestamp: number
  }>>([])
  const [detectedActions, setDetectedActions] = useState<DetectedAction[]>([])
  const actionDetectorRef = useRef<AIActionDetector | null>(null)
  const lastProcessedMessageId = useRef<string | null>(null)
  const bufferRef = useRef<string>('')
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageCountRef = useRef<number>(0)
  const [conversationId, setConversationId] = useState<string | null>(propConversationId || null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const onStreamingChangeRef = useRef(onStreamingChange)
  const isSubscribedRef = useRef<boolean>(false) // Prevent duplicate subscriptions
  const [isAtBottom, setIsAtBottom] = useState(true) // Track if user is at bottom
  const [modalAction, setModalAction] = useState<DetectedAction | null>(null) // Modal state

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

  // ✅ Cleanup: abort ongoing streams when component unmounts or conversation changes
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [conversationId]) // Reset when conversation changes

  // 🎯 DECISION TRACKING FUNCTIONS
  const handleAISuggestion = (data: any) => {
    const decisionId = generateUUID()
    const decision = {
      id: decisionId,
      type: data.suggestion_type || 'general',
      suggestion: data.suggestion || data.message,
      context: data.context || {},
      proposedAction: data.proposed_action || {},
      timestamp: Date.now()
    }

    setPendingDecisions(prev => [...prev, decision])

    // Show interactive toast with decision buttons
    toast.custom((t) => (
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 max-w-md border-l-4 border-purple-500">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              AI Suggestion
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {decision.suggestion}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  handleDecisionAccept(decision)
                  toast.dismiss(t.id)
                }}
                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded flex items-center gap-1"
                title="Accept suggestion"
              >
                <span>✅</span> Accept
              </button>
              <button
                onClick={() => {
                  handleDecisionModify(decision)
                  toast.dismiss(t.id)
                }}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded flex items-center gap-1"
                title="Modify suggestion"
              >
                <span>✏️</span> Modify
              </button>
              <button
                onClick={() => {
                  handleDecisionReject(decision)
                  toast.dismiss(t.id)
                }}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded flex items-center gap-1"
                title="Reject suggestion"
              >
                <span>❌</span> Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    ), {
      duration: 10000, // 10 seconds to decide
      position: 'top-right'
    })
  }

  const handleDecisionAccept = async (decision: any) => {
    console.log('✅ Decision ACCEPTED:', decision)
    await trackUserDecision(decision, 'accept', null)
    setPendingDecisions(prev => prev.filter(d => d.id !== decision.id))
    toast.success('Suggestion accepted! Learning from your preference.', { icon: '✅' })
  }

  const handleDecisionModify = async (decision: any) => {
    console.log('✏️ Decision MODIFIED:', decision)
    // TODO: Open modal for modification
    toast('Modification UI coming soon...', { icon: '✏️' })
    await trackUserDecision(decision, 'modify', { note: 'User requested modification' })
    setPendingDecisions(prev => prev.filter(d => d.id !== decision.id))
  }

  const handleDecisionReject = async (decision: any) => {
    console.log('❌ Decision REJECTED:', decision)
    await trackUserDecision(decision, 'reject', null)
    setPendingDecisions(prev => prev.filter(d => d.id !== decision.id))
    toast.error('Suggestion rejected. Learning from your preference.', { icon: '❌' })
  }

  const trackUserDecision = async (decision: any, userChoice: 'accept' | 'reject' | 'modify', modification: any) => {
    try {
      const { error } = await (supabase as any).from('user_decisions').insert({
        project_id: projectId,
        decision_type: decision.type,
        context: decision.context,
        proposed_action: decision.proposedAction,
        user_choice: userChoice,
        user_modification: modification,
        confidence_score: decision.context?.confidence || 0.5,
        tags: [decision.type, userChoice],
        created_at: new Date().toISOString()
      })

      if (error) {
        console.error('Failed to track decision:', error)
      } else {
        console.log('🎯 Decision tracked successfully')
      }
    } catch (error) {
      console.error('Error tracking decision:', error)
    }
  }

  // 🎯 ACTION DETECTION & VALIDATION
  const detectAndProposeActions = useCallback((text: string) => {
    if (!actionDetectorRef.current) {
      actionDetectorRef.current = new AIActionDetector(projectId)
    }

    const actions = actionDetectorRef.current.detectActions(text)

    if (actions.length > 0) {
      console.log(`🔍 Detected ${actions.length} AI actions:`, actions)

      // Show interactive toast for each detected action
      actions.forEach((action) => {
        const actionId = generateUUID()

        const actionLabels = {
          'create_document': '📄 Créer document',
          'create_folder': '📁 Créer dossier',
          'edit_document': '✏️ Éditer document',
          'organize': '🗂️ Organiser',
          'move': '↔️ Déplacer'
        }

        const actionLabel = actionLabels[action.type] || action.type

        toast.custom((t) => (
          <div className="bg-white shadow-xl rounded-lg p-4 max-w-md border-l-4 border-blue-500">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{actionLabel}</p>
                <p className="text-sm text-gray-700 mt-1">
                  {action.data.name || 'Sans nom'}
                </p>
                {action.data.content && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {action.data.content.substring(0, 80)}...
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                    Confiance: {Math.round(action.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  toast.dismiss(t.id)
                  toast.loading('Exécution...')

                  const result = await actionDetectorRef.current!.executeAction(action)

                  if (result.success) {
                    toast.dismiss()
                    toast.success(`✅ ${actionLabel} réussi!`, { duration: 3000 })
                    // Reload memory board
                    window.dispatchEvent(new CustomEvent('board-reload', {
                      detail: { projectId, section: 'memory' }
                    }))
                  } else {
                    toast.dismiss()
                    toast.error(`❌ Erreur: ${result.error}`)
                  }
                }}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                ✅ Exécuter
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  setModalAction(action)
                }}
                className="px-3 py-2 bg-violet-500 text-white text-sm rounded hover:bg-violet-600 transition-colors"
              >
                ✏️ Modifier
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
              >
                ❌ Ignorer
              </button>
            </div>
          </div>
        ), {
          duration: 15000,
          position: 'top-right'
        })
      })

      setDetectedActions(prev => [...prev, ...actions])
    }
  }, [projectId])

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

  // ✅ FIX: Separate subscription useEffect (no dependencies on isStreaming)
  useEffect(() => {
    if (!projectId) return

    console.log('🔌 Setting up ONE subscription for project:', projectId)
    const unsubscribe = subscribeToMessages()

    return () => {
      console.log('🔌 Cleaning up subscription')
      unsubscribe()
    }
  }, [projectId]) // Only re-subscribe if project changes

  // ✅ Polling + message processing useEffect
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
          setMessages(data as any)
          // Store user message for context
          setLastUserMessage(lastMessage.content)
          // Trigger Claude response (ONLY here, not in subscription)
          streamClaudeResponse(lastMessage.content).catch(err => {
            console.error('❌ streamClaudeResponse error:', err)
          })
        } else if (data.length !== lastMessageCountRef.current && !isStreaming) {
          // Only update if count changed and not streaming
          lastMessageCountRef.current = data.length
          setMessages(data as any)
        }
      }
    }, 1500) // Poll every 1.5 seconds

    return () => {
      clearInterval(pollInterval)
      // Clean up RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (debouncedScrollRef.current) {
        clearTimeout(debouncedScrollRef.current)
      }
    }
  }, [projectId, conversationId]) // ✅ Removed isStreaming from dependencies

  // Smart scroll management without jumps using RAF
  const rafRef = useRef<number | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle scroll to detect if user is at bottom
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const atBottom = scrollHeight - clientHeight <= scrollTop + 1
    setIsAtBottom(atBottom)
  }, [])

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
  const debouncedScrollRef = useRef<NodeJS.Timeout | undefined>(undefined)
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
      setMessages(data as any)
    }
  }

  const initializeConversation = async () => {
    if (propConversationId) {
      setConversationId(propConversationId)
    }
  }

  const subscribeToMessages = () => {
    // Prevent duplicate subscriptions
    if (isSubscribedRef.current) {
      console.log('⏭️ Already subscribed, skipping...')
      return () => {} // Return empty cleanup
    }

    console.log('Setting up subscription for project:', projectId)
    isSubscribedRef.current = true

    // Cleanup previous channel if exists
    const existingChannel = supabase.channel(`chat_${projectId}`)
    if (existingChannel) {
      supabase.removeChannel(existingChannel)
    }

    let retryCount = 0
    const maxRetries = 3 // Réduit de 5 à 3
    const baseDelay = 1000 // 1 second

    const setupChannel = (): any => {
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

            // ✅ Filter by conversation_id to prevent cross-conversation pollution
            if (newMessage.conversation_id !== conversationId) {
              console.log('⏭️ Message belongs to different conversation, ignoring')
              return
            }

            // Only update messages, don't trigger Claude here
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
          // Silent logging - no console spam
          if (status === 'SUBSCRIBED') {
            retryCount = 0 // Reset retry count on success
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            supabase.removeChannel(channel)

            // Exponential backoff - silent retry
            if (retryCount < maxRetries) {
              const delay = baseDelay * Math.pow(2, retryCount)
              retryCount++
              setTimeout(setupChannel, delay)
            }
            // Max retries reached - fail silently, realtime not critical
          }
        })

      return channel
    }

    const channel = setupChannel()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
        isSubscribedRef.current = false // Reset on cleanup
      }
    }
  }

  // Handler pour commandes slash dans le chat
  const handleSlashCommand = useCallback((command: string) => {
    console.log('🔧 Processing slash command:', command)

    // Note: Board opening functionality handled by parent component
    switch (command.trim()) {
      case '/add rule':
      case '/add-rule':
        toast.success('📋 Commande: Ajouter une règle')
        break

      case '/add memory':
      case '/add-memory':
        toast.success('🧠 Commande: Ajouter à la mémoire')
        break

      case '/add optimization':
      case '/add-optimization':
        toast.success('⚡ Commande: Ajouter une optimisation')
        break

      case '/board':
      case '/open-board':
        toast.success('📊 Commande: Ouvrir le board')
        break

      default:
        toast('❓ Commande non reconnue. Essayez /add rule, /add memory, /board')
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
      let currentConvId = conversationId

      // Get additional context - RÈGLES EN PRIORITÉ avec templates dynamiques
      const targetFolder = detectTargetFolder(userMessage)
      const rulesContext = await getRulesContext(userMessage)
      const memoryContext = await getMemoryContext(userMessage)
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

      // ✅ SIMPLIFIED: Build messages array directly from current conversation
      // Get last 10 messages for context (no ConversationManager needed)
      const recentMessages = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      // Build API messages array
      const apiMessages = [
        ...recentMessages,
        {
          role: 'user' as const,
          content: contextualPrompt
        }
      ]

      // Créer un nouvel AbortController pour cette requête
      abortControllerRef.current = new AbortController()

      // Use the new chat/stream endpoint with Mem0 integration
      let response
      try {
        response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: apiMessages,       // ✅ FIXED: Use apiMessages instead of undefined messages
            projectId,
            conversationId: currentConvId,
            useMemoryContext: true,
            saveMemory: true,
            enableAutoOrganization: true,
            stylePrompt: getStyleSystemPrompt(promptStyle as any, customStyles),
            currentTemplateId: promptStyle
          }),
          signal: abortControllerRef.current.signal
        })
      } catch (fetchError: any) {
        // Ne pas logger AbortError comme une vraie erreur
        if (fetchError.name === 'AbortError') {
          console.log('✅ Request aborted by user')
          setIsStreaming(false)
          return
        }
        throw fetchError // Re-throw other fetch errors
      }

      console.log('Claude API response:', response.status, response.ok)
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

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
                } else if (data.type === 'facts_pending') {
                  // ❌ DÉSACTIVÉ: Ancien système factExtractor (hors contrôle)
                  // ✅ NOUVEAU: Validation via MEMORY_ACTION inline panels
                  console.log('⚠️ facts_pending ignoré (système désactivé)')
                } else if (data.type === 'ai_suggestion') {
                  // 🎯 DECISION TRACKING: AI a fait une suggestion
                  console.log('🤖 AI Suggestion detected:', data)
                  handleAISuggestion(data)
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

      // Save complete message to database
      if (fullContent) {
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

        // Add the new message directly (Realtime will also add it, but this is instant fallback)
        if (newMessage) {
          setMessages(prev => {
            // Check if already added by Realtime
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) return prev
            return [...prev, newMessage as ChatMessage]
          })

          // Process MEMORY_ACTION commands from Claude's response
          try {
            const actions = await parseMemoryActions(fullContent)
            if (actions.length > 0) {
              console.log(`✅ ${actions.length} memory action(s) detected - waiting for user validation`)
              // Note: Pending actions handled elsewhere in the component
            }
          } catch (error) {
            console.log('⚠️ Memory action processing skipped:', error)
          }

          // DÉSACTIVÉ: Auto-organize (ancien système memory_nodes)
          // const organized = await autoOrganizeContent(fullContent, userMessage)
          // if (organized) {
          //   console.log('✅ Auto-organization completed')
          // }

          // DÉSACTIVÉ: AI ACTION DETECTION (ancien système memory_nodes - toasts "Rangé dans...")
          // detectAndProposeActions(fullContent)

          // ✅ NOUVEAU: Facts extraction activée dans route.ts:773-780

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
                  return [...prev, newMessage as ChatMessage]
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

          // MEMORY_ACTION parsing is now handled above (lines 1247-1257)
          // This ensures validation UI shows for all MEMORY_ACTION blocks
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
      if (!userMessage) {
        console.log('🔍 No user message for memory search')
        return []
      }

      // Count total facts
      const { count } = await supabase
        .from('memory_facts')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      const totalFacts = count || 0
      console.log(`🧠 Memory: ${totalFacts} facts`)

      if (totalFacts === 0) return []

      // Strategy: < 100 facts = load ALL (best for pentest)
      if (totalFacts < 100) {
        console.log('🔍 Loading ALL facts (< 100, optimal for pentest)')

        const { data: allFacts } = await supabase
          .from('memory_facts')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })

        console.log(`✅ Loaded ${allFacts?.length || 0} facts with relations & attack chains`)

        return (allFacts || []).map(f => {
          const metadata = f.metadata as any
          return {
            id: f.id,
            fact: f.fact,
            category: metadata?.category || 'uncategorized',
            tags: metadata?.tags || [],
            technique: metadata?.technique,
            severity: metadata?.severity,
            related_to: metadata?.related_to || [],
            attack_chain: metadata?.attack_chain,
            http_request: metadata?.http_request,
            http_response: metadata?.http_response
          }
        })
      }

      // Strategy: >= 100 facts = use SQL filters (NO embeddings!)
      console.log('🔍 Using filtered search (>= 100 facts)')

      // Detect keywords for filtering
      const keywords = {
        endpoint: userMessage.match(/\/[\w/-]+/)?.[0],
        technique: ['BLV', 'IDOR', 'SQLi', 'XSS', 'CSRF', 'SSRF', 'RCE'].find(t =>
          userMessage.toUpperCase().includes(t)
        ),
        severity: ['critical', 'high', 'medium', 'low'].find(s =>
          userMessage.toLowerCase().includes(s)
        )
      }

      let query = supabase
        .from('memory_facts')
        .select('*')
        .eq('project_id', projectId)

      // Apply filters
      if (keywords.endpoint) {
        query = query.or(`metadata->http_request->>url.ilike.%${keywords.endpoint}%,metadata->>endpoint.ilike.%${keywords.endpoint}%`)
      }
      if (keywords.technique) {
        query = query.eq('metadata->>technique', keywords.technique)
      }
      if (keywords.severity) {
        query = query.eq('metadata->>severity', keywords.severity)
      }

      // Limit results
      const { data: filteredFacts } = await query
        .order('created_at', { ascending: false })
        .limit(keywords.endpoint || keywords.technique ? 100 : 50)

      console.log(`✅ Found ${filteredFacts?.length || 0} facts (filters: ${JSON.stringify(keywords)})`)

      return (filteredFacts || []).map(f => {
        const metadata = f.metadata as any
        return {
          id: f.id,
          fact: f.fact,
          category: metadata?.category || 'uncategorized',
          tags: metadata?.tags || [],
          technique: metadata?.technique,
          severity: metadata?.severity,
          related_to: metadata?.related_to || [],
          attack_chain: metadata?.attack_chain,
          http_request: metadata?.http_request,
          http_response: metadata?.http_response
        }
      })

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
        const jsonStr = match[1].trim()
        if (!jsonStr || jsonStr.length === 0) continue // Skip empty
        const action = JSON.parse(jsonStr)
        actions.push(action)
        console.log('📋 Parsed memory action:', action.operation, action.data?.name)
      } catch (e) {
        // Silently skip malformed JSON (incomplete streaming)
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
      const { data } = await (supabase as any).rpc('search_similar_nodes', {
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

      // ✅ FIX: trigger_type au lieu de trigger
      // Les rules "always" s'appliquent toujours (comme MEMORY_ACTION, Formatting)
      const relevantRules = data.filter(rule =>
        rule.trigger_type === 'always' ||
        rule.trigger_type === 'context' // Toutes les rules context aussi
      )

      if (relevantRules.length === 0) {
        return ''
      }

      // Formater les règles pour l'IA (utiliser action_instructions si disponible)
      return relevantRules.map(rule =>
        `- ${rule.name}: ${rule.action_instructions || rule.description || rule.action || ''}`
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
        // Note: Pending actions handling removed - processed elsewhere
        console.log('Memory action detected:', memoryAction)

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

  // ⚠️ LEGACY: Create memory node in memory_nodes table (obsolete, kept for backward compatibility)
  // New system uses memory_facts with create_fact/update_fact/delete_fact
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

  // ⚠️ LEGACY: Update memory node (obsolete, use update_fact instead)
  const updateMemoryNode = async (data: any) => {
    const { id, name, content: inputContent, append = false, new_name } = data

    console.log('📝 Updating memory node:', { id, name, content: inputContent?.substring(0, 50) })

    if (!id && !name) {
      console.error('❌ Cannot update node without ID or name')
      showToast('Erreur: nom ou ID manquant pour la mise à jour', 'error')
      return
    }

    try {
      // Find the node by name if no ID provided
      let nodeId = id
      let finalContent = inputContent

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
            finalContent = existingContent + '\n\n' + inputContent
          }
        }
      }

      // Update in Supabase
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (finalContent !== undefined) updateData.content = finalContent
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

  // ⚠️ LEGACY: Delete memory node (obsolete, use delete_fact instead)
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


  // Process a single fact in background
  const processFactCreation = async (factData: any) => {
    try {
      // ✅ Générer embedding
      let embedding = null
      try {
        const embeddingRes = await fetch('/api/openai/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: factData.fact, projectId })
        })
        if (embeddingRes.ok) {
          const embData = await embeddingRes.json()
          embedding = embData.embedding
        }
      } catch (err) {
        console.warn('Embedding generation failed, fact will be created without embedding:', err)
      }

      // Auto-créer les templates pour les nouveaux tags (support Category:tag format)
      if (factData.tags && factData.tags.length > 0) {
        const existingTemplatesRes = await fetch(`/api/tags/templates?projectId=${projectId}`)
        if (existingTemplatesRes.ok) {
          const existingTemplates = await existingTemplatesRes.json()
          const existingTagNames = existingTemplates.map((t: any) => t.name)

          // Créer templates pour nouveaux tags avec couleurs et catégories automatiques
          const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'yellow', 'red', 'gray']
          const categoryColors: Record<string, string> = {
            'security': 'red',
            'severity': 'orange',
            'status': 'green',
            'type': 'blue',
            'general': 'gray'
          }

          const templatePromises = []
          for (let i = 0; i < factData.tags.length; i++) {
            const tagSpec = factData.tags[i]

            // Parse format "Category:tagname" ou juste "tagname"
            let category = 'general'
            let tagName = tagSpec

            if (tagSpec.includes(':')) {
              const parts = tagSpec.split(':')
              category = parts[0].toLowerCase()
              tagName = parts[1]
            }

            if (!existingTagNames.includes(tagName)) {
              // Couleur basée sur la catégorie ou rotation automatique
              const color = categoryColors[category] || colors[i % colors.length]

              // Créer le template (parallèle)
              templatePromises.push(
                fetch('/api/tags/templates', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    projectId,
                    name: tagName,
                    color,
                    category,
                    position: i
                  })
                })
              )
            }
          }

          // Attendre tous les templates en parallèle
          if (templatePromises.length > 0) {
            await Promise.all(templatePromises)
          }
        }
      }

      // Nettoyer les tags (enlever préfixe "Category:" si présent)
      const cleanedTags = (factData.tags || []).map((tag: string) => {
        return tag.includes(':') ? tag.split(':')[1] : tag
      })

      const { data: insertedFact, error: factError } = await supabase
        .from('memory_facts')
        .insert({
          project_id: projectId,
          fact: factData.fact,
          embedding,
          metadata: {
            category: factData.category || 'general',
            tags: cleanedTags,
            severity: factData.severity || 'low',
            technique: factData.technique || null,
            endpoint: factData.endpoint || null
          }
        })
        .select()
        .single()

      if (factError) throw factError

      return { success: true, fact: insertedFact }
    } catch (error) {
      console.error('Error processing fact:', error)
      return { success: false, error }
    }
  }

  const handleClaudeAction = async (action: any) => {
    if (!action) return

    console.log('🔄 Processing Claude action:', action.operation || action.type)

    // Handle MEMORY_ACTION format
    if (action.operation) {
      try {
        switch (action.operation) {
          case 'create_fact':
            // Traitement asynchrone en arrière-plan
            const factData = action.data

            // Toast optimiste immédiat
            showToast(`💾 Saving fact: "${factData.fact.substring(0, 40)}..."`, 'info')

            // Process in background without blocking
            processFactCreation(factData).then(result => {
              if (result.success) {
                showToast(`✅ Fact saved successfully!`, 'success')
              } else {
                showToast(`❌ Failed to save fact`, 'error')
              }
            })

            // Return immediately without blocking UI
            break

          case 'update_fact':
            // Mettre à jour un fact existant
            const updateData = action.data
            const { data: factsToUpdate, error: findError } = await supabase
              .from('memory_facts')
              .select('*')
              .eq('project_id', projectId)
              .ilike('fact', `%${updateData.find_by_fact_contains}%`)

            if (findError) throw findError
            if (!factsToUpdate || factsToUpdate.length === 0) {
              showToast('❌ Aucun fact trouvé avec ce texte', 'error')
              break
            }

            const factToUpdate = factsToUpdate[0]
            const { error: updateError } = await supabase
              .from('memory_facts')
              .update({
                fact: updateData.new_fact || factToUpdate.fact,
                metadata: {
                  ...(factToUpdate.metadata as any),
                  category: updateData.new_category || (factToUpdate.metadata as any).category,
                  severity: updateData.new_severity || (factToUpdate.metadata as any).severity
                }
              })
              .eq('id', factToUpdate.id)

            if (updateError) throw updateError
            showToast(`✅ Fact mis à jour`, 'success')
            break

          case 'delete_fact':
            // Supprimer un fact
            const deleteData = action.data
            const { data: factsToDelete, error: findDeleteError } = await supabase
              .from('memory_facts')
              .select('*')
              .eq('project_id', projectId)
              .ilike('fact', `%${deleteData.find_by_fact_contains}%`)

            if (findDeleteError) throw findDeleteError
            if (!factsToDelete || factsToDelete.length === 0) {
              showToast('❌ Aucun fact trouvé avec ce texte', 'error')
              break
            }

            const { error: deleteError } = await supabase
              .from('memory_facts')
              .delete()
              .eq('id', factsToDelete[0].id)

            if (deleteError) throw deleteError
            showToast(`✅ Fact supprimé`, 'success')
            break

          case 'add_tags':
            // Ajouter des tags à un fact
            const addTagsData = action.data
            const { data: factsForTags, error: findTagsError } = await supabase
              .from('memory_facts')
              .select('*')
              .eq('project_id', projectId)
              .ilike('fact', `%${addTagsData.find_by_fact_contains}%`)

            if (findTagsError) throw findTagsError
            if (!factsForTags || factsForTags.length === 0) {
              showToast('❌ Aucun fact trouvé avec ce texte', 'error')
              break
            }

            const factForTags = factsForTags[0]
            const metadata = factForTags.metadata as any
            const currentTags = metadata?.tags || []
            const newTags = [...new Set([...currentTags, ...addTagsData.tags])]

            const { error: addTagsError } = await supabase
              .from('memory_facts')
              .update({
                metadata: {
                  ...metadata,
                  tags: newTags
                }
              })
              .eq('id', factForTags.id)

            if (addTagsError) throw addTagsError
            showToast(`✅ Tags ajoutés: ${addTagsData.tags.join(', ')}`, 'success')
            break

          case 'remove_tags':
            // Retirer des tags d'un fact
            const removeTagsData = action.data
            const { data: factsForRemoveTags, error: findRemoveTagsError } = await supabase
              .from('memory_facts')
              .select('*')
              .eq('project_id', projectId)
              .ilike('fact', `%${removeTagsData.find_by_fact_contains}%`)

            if (findRemoveTagsError) throw findRemoveTagsError
            if (!factsForRemoveTags || factsForRemoveTags.length === 0) {
              showToast('❌ Aucun fact trouvé avec ce texte', 'error')
              break
            }

            const factForRemoveTags = factsForRemoveTags[0]
            const metadataRemove = factForRemoveTags.metadata as any
            const tagsAfterRemoval = (metadataRemove?.tags || []).filter(
              (tag: string) => !removeTagsData.tags.includes(tag)
            )

            const { error: removeTagsError } = await supabase
              .from('memory_facts')
              .update({
                metadata: {
                  ...metadataRemove,
                  tags: tagsAfterRemoval
                }
              })
              .eq('id', factForRemoveTags.id)

            if (removeTagsError) throw removeTagsError
            showToast(`✅ Tags supprimés: ${removeTagsData.tags.join(', ')}`, 'success')
            break

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

  // ❌ REMOVED: handleConfirmAction, handleCancelAction (old system with green/red buttons)
  // New system uses MemoryActionPanel with checkboxes

  return (
    <>
      <div
        ref={containerRef}
        className="flex-1 p-6 chat-container overflow-y-auto"
        style={{ height: 'calc(100vh - 200px)' }}
        onScroll={handleScroll}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {filteredMessages.map((message, index) => {
            // Extract MEMORY_ACTION from message content
            let memoryActions: any[] = []
            if (message.role === 'assistant') {
              const regex = /<!--MEMORY_ACTION\s*([\s\S]*?)-->/g
              let match
              while ((match = regex.exec(message.content)) !== null) {
                try {
                  const jsonStr = match[1].trim()
                  if (jsonStr && jsonStr.length > 0) {
                    const action = JSON.parse(jsonStr)
                    memoryActions.push(action)
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }

            return (
              <MessageComponent
                key={message.id}
                message={message}
                memoryActions={memoryActions}
                onValidateMemoryActions={async (actions) => {
                  for (const action of actions) {
                    await handleClaudeAction({ operation: action.operation, data: action.data })
                  }
                  toast.success(`✅ ${actions.length} action(s) validée(s)`)

                  // Remove MEMORY_ACTION blocks from message content after validation
                  const updatedContent = message.content.replace(/<!--MEMORY_ACTION[\s\S]*?-->/g, '')
                  await supabase
                    .from('chat_messages')
                    .update({ content: updatedContent })
                    .eq('id', message.id)

                  loadMessages() // Reload to show updated state
                }}
                onRejectMemoryActions={async () => {
                  // Track rejection decision
                  await (supabase as any).from('user_decisions').insert({
                    project_id: projectId,
                    decision_type: 'memory_action',
                    proposed_action: { actions: memoryActions },
                    user_choice: 'reject'
                  })

                  // Remove MEMORY_ACTION blocks from message content
                  const updatedContent = message.content.replace(/<!--MEMORY_ACTION[\s\S]*?-->/g, '')
                  await supabase
                    .from('chat_messages')
                    .update({ content: updatedContent })
                    .eq('id', message.id)

                  toast('❌ Actions ignorées')
                  loadMessages() // Reload to hide the panel
                }}
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
                // Note: Board opening handled by parent component
                toast.success('📄 Document trouvé dans la mémoire')
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

          {/* Invisible anchor for scroll detection */}
          <ChatScrollAnchor
            trackVisibility={isStreaming}
            isAtBottom={isAtBottom}
            scrollAreaRef={containerRef}
          />
        </div>
      </div>

      {/* Memory Action Modal - Deprecated: handled inline with MemoryActionPanel */}
    </>
  )
}
