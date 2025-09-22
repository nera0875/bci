'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { User, Bot, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import ReactMarkdown from 'react-markdown'
import StreamingText from './StreamingText'
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
  <div className="flex gap-4 justify-start message-streaming">
    <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center flex-shrink-0">
      <Bot className="w-4 h-4 text-background" />
    </div>
    <div className="max-w-[80%] px-4 py-3 rounded-xl bg-muted text-foreground">
      <StreamingText
        content={content}
        isComplete={isComplete}
      />
    </div>
  </div>
))

// Memoized message component for performance
const MessageComponent = React.memo(({ message }: { message: ChatMessage }) => (
  <div
    className={`flex gap-4 message-enter ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
          <ReactMarkdown>
            {message.content}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="whitespace-pre-wrap">{message.content}</div>
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
}

export default function ChatStream({ projectId }: ChatStreamProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreamComplete, setIsStreamComplete] = useState(false)
  const lastProcessedMessageId = useRef<string | null>(null)
  const bufferRef = useRef<string>('')
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageCountRef = useRef<number>(0)

  useEffect(() => {
    loadMessages()

    // Start polling for new messages
    // NOTE: Only polling triggers Claude responses to avoid duplicates
    const pollInterval = setInterval(async () => {
      // Skip polling while streaming to avoid refresh
      if (isStreaming) return

      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('project_id', projectId)
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
  }, [projectId, isStreaming])

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
    // Auto-scroll during streaming
    if (isStreaming) {
      debouncedScroll()
    }
  }, [isStreaming, streamingContent, debouncedScroll])

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (data && !error) {
      setMessages(data)
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
          setMessages(prev => [...prev, newMessage])
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
      // Get memory context with RAG similarity search
      const memoryContext = await getMemoryContext()
      const similarContent = await searchSimilarContent(userMessage)
      const rulesContext = await getRulesContext()
      const projectGoal = await getProjectGoal()

      console.log('Context prepared, calling Claude API...')

      const response = await fetch('/api/claude/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          projectId,
          context: {
            memory: memoryContext,
            similar: similarContent,
            rules: rulesContext,
            goal: projectGoal
          }
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
                  fullContent += data.text
                  bufferRef.current = fullContent

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

        // Parse commands only after streaming is complete
        await parseAndExecuteCommands(fullContent)
      }

      // Save complete message to database
      if (fullContent) {
        const { data: newMessage } = await supabase
          .from('chat_messages')
          .insert({
            project_id: projectId,
            role: 'assistant' as const,
            content: fullContent
          })
          .select()
          .single()

        // Add the new message directly without reloading all
        if (newMessage) {
          setMessages(prev => {
            lastMessageCountRef.current = prev.length + 1
            return [...prev, newMessage]
          })
        }
      }
    } catch (error) {
      console.error('Streaming error:', error)
      setStreamingContent('Error: Failed to get response from Claude.')
    } finally {
      setIsStreamComplete(true)
      // Clean up streaming state after animation completes
      setTimeout(() => {
        setIsStreaming(false)
        setStreamingContent('')
        // No need to reload messages - already added above
      }, 300)
    }
  }

  const getMemoryContext = async () => {
    // Get relevant memory nodes for context
    const { data } = await supabase
      .from('memory_nodes')
      .select('name, type, content')
      .eq('project_id', projectId)
      .limit(10)

    return data || []
  }

  const getProjectGoal = async () => {
    const { data } = await supabase
      .from('projects')
      .select('goal')
      .eq('id', projectId)
      .single()

    return data?.goal || ''
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
        limit: 5
      })

      return data || []
    } catch (error) {
      console.error('RAG search error:', error)
      return []
    }
  }

  // Get active rules
  const getRulesContext = async () => {
    const { data } = await supabase
      .from('rules')
      .select('name, trigger, action, enabled')
      .eq('project_id', projectId)
      .eq('enabled', true)
      .order('priority', { ascending: false })

    return data || []
  }

  // Parse and execute memory commands from Claude's response
  const parseAndExecuteCommands = async (text: string) => {
    // Match commands like [CREATE_NODE: {...}]
    const commandRegex = /\[(CREATE_NODE|UPDATE_NODE|DELETE_NODE|CREATE_WIDGET|STORE_PATTERN):\s*({[^}]+})\]/g
    let match

    while ((match = commandRegex.exec(text)) !== null) {
      const [_, command, jsonStr] = match
      try {
        const data = JSON.parse(jsonStr)

        switch (command) {
          case 'CREATE_NODE':
            await createMemoryNode(data)
            break
          case 'UPDATE_NODE':
            await updateMemoryNode(data)
            break
          case 'DELETE_NODE':
            await deleteMemoryNode(data)
            break
          case 'CREATE_WIDGET':
            await createWidget(data)
            break
          case 'STORE_PATTERN':
            await storePattern(data)
            break
        }
      } catch (e) {
        console.error('Command parsing error:', e)
      }
    }
  }

  // Create memory node
  const createMemoryNode = async (data: any) => {
    const { type, name, content, color = '#6E6E80', parent_id = null } = data

    const { error } = await supabase
      .from('memory_nodes')
      .insert({
        project_id: projectId,
        type,
        name,
        content: content || {},
        color,
        parent_id,
        position: 0
      })

    if (!error) {
      console.log('Created memory node:', name)
    }
  }

  // Update memory node
  const updateMemoryNode = async (data: any) => {
    const { id, content } = data

    await supabase
      .from('memory_nodes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
  }

  // Delete memory node
  const deleteMemoryNode = async (data: any) => {
    await supabase
      .from('memory_nodes')
      .delete()
      .eq('id', data.id)
  }

  // Create widget
  const createWidget = async (data: any) => {
    await createMemoryNode({
      ...data,
      type: 'widget'
    })
  }

  // Store attack pattern
  const storePattern = async (data: any) => {
    const { pattern, type, success_rate } = data

    await supabase
      .from('attack_patterns')
      .insert({
        project_id: projectId,
        pattern_type: type,
        pattern: { content: pattern },
        success_rate,
        usage_count: 1
      })
  }

  const handleClaudeAction = async (action: any) => {
    // Handle different action types from Claude
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

  return (
    <div
      ref={containerRef}
      className="flex-1 p-6 chat-container overflow-y-auto"
      style={{ height: 'calc(100vh - 200px)' }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {filteredMessages.map((message) => (
          <MessageComponent key={message.id} message={message} />
        ))}

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
  )
}