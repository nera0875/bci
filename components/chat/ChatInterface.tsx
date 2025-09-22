'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Trash2, Settings } from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import type { ChatMessage } from '@/lib/types'

export default function ChatInterface() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { currentProject, addChatMessage, clearChat, apiConfig } = useAppStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentProject?.chatHistory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !apiConfig.claude.apiKey) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }

    addChatMessage(userMessage)
    setInput('')
    setIsLoading(true)

    try {
      // Include context from current project
      const context = {
        requests: currentProject?.requests?.length || 0,
        tasks: currentProject?.tasks || [],
        vulnerabilities: currentProject?.vulnerabilities || [],
      }

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiConfig.claude.apiKey,
          messages: [
            {
              role: 'system',
              content: `You are an expert pentesting assistant. You have access to the current project context:
- ${context.requests} HTTP requests analyzed
- ${context.tasks.length} tasks in progress
- ${context.vulnerabilities.length} vulnerabilities found

Help the user analyze security vulnerabilities, plan testing strategies, and manage tasks efficiently.`,
            },
            ...currentProject?.chatHistory.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })) || [],
            { role: 'user', content: input },
          ],
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content[0].text,
        timestamp: new Date().toISOString(),
        context,
      }

      addChatMessage(assistantMessage)
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: new Date().toISOString(),
      }
      addChatMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select or create a project to start chatting
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-card">
        <div>
          <h2 className="text-xl font-semibold">Claude Assistant</h2>
          <p className="text-sm text-muted-foreground">AI-powered pentesting analysis</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearChat}
            className="p-2.5 hover:bg-muted rounded-lg transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            className="p-2.5 hover:bg-muted rounded-lg transition-colors"
            title="Chat settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {currentProject.chatHistory.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Start a conversation with Claude</p>
            <p className="text-sm">
              Ask about vulnerabilities, testing strategies, or task planning
            </p>
          </div>
        ) : (
          currentProject.chatHistory.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              } animate-slide-up`}
            >
              <div
                className={`max-w-[75%] p-4 rounded-xl ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : message.role === 'system'
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-wrap text-base">{message.content}</p>
                <span className="text-xs opacity-70 mt-2 block">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start animate-slide-up">
            <div className="bg-muted p-3 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-6 border-t bg-card">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              apiConfig.claude.apiKey
                ? 'Ask Claude about vulnerabilities, strategies, or tasks...'
                : 'Configure Claude API key in settings first'
            }
            disabled={!apiConfig.claude.apiKey || isLoading}
            className="flex-1 px-5 py-3 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-base"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !apiConfig.claude.apiKey}
            className="px-5 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}