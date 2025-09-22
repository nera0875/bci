'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Bot, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import ReactMarkdown from 'react-markdown'

type ChatMessage = Database['public']['Tables']['chat_messages']['Row']

interface ChatStreamProps {
  projectId: string
}

export default function ChatStream({ projectId }: ChatStreamProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    subscribeToMessages()
  }, [projectId])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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
    const channel = supabase
      .channel(`chat_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage

          // If it's a user message, trigger Claude response
          if (newMessage.role === 'user') {
            streamClaudeResponse(newMessage.content)
          } else {
            setMessages(prev => [...prev, newMessage])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const streamClaudeResponse = async (userMessage: string) => {
    setIsStreaming(true)
    setStreamingContent('')

    try {
      // Get memory context
      const memoryContext = await getMemoryContext()

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
            goal: await getProjectGoal()
          }
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.type === 'content') {
                  fullContent += data.text
                  setStreamingContent(fullContent)
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
      }

      // Save complete message to database
      if (fullContent) {
        await supabase
          .from('chat_messages')
          .insert({
            project_id: projectId,
            role: 'assistant' as const,
            content: fullContent
          })
      }
    } catch (error) {
      console.error('Streaming error:', error)
      setStreamingContent('Error: Failed to get response from Claude.')
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
      loadMessages() // Reload to get the saved message
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

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
                <ReactMarkdown className="prose prose-sm max-w-none">
                  {message.content}
                </ReactMarkdown>
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
        ))}

        {/* Streaming Message */}
        {isStreaming && streamingContent && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-background" />
            </div>
            <div className="max-w-[80%] px-4 py-3 rounded-xl bg-muted text-foreground">
              <ReactMarkdown className="prose prose-sm max-w-none">
                {streamingContent}
              </ReactMarkdown>
              <Loader2 className="w-3 h-3 animate-spin mt-2 text-muted-foreground" />
            </div>
          </div>
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

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}