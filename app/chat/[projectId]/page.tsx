'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Target, Send, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import MemorySidebar from '@/components/memory/MemorySidebar'
import ChatStream from '@/components/chat/ChatStream'
import RulesTable from '@/components/rules/RulesTable'
import GoalBar from '@/components/goal/GoalBar'
import { Database } from '@/lib/supabase/database.types'

type Project = Database['public']['Tables']['projects']['Row']

export default function ChatInterface({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showRules, setShowRules] = useState(false)

  // Load project
  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      if (!data) {
        router.push('/projects')
        return
      }

      setProject(data)
    } catch (error) {
      console.error('Error loading project:', error)
      router.push('/projects')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !project) return

    const userMessage = message
    setMessage('')

    // Save user message to database
    await supabase
      .from('chat_messages')
      .insert({
        project_id: project.id,
        role: 'user' as const,
        content: userMessage
      })

    // Stream Claude response will be handled by ChatStream component
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Goal Bar */}
      <GoalBar projectId={project.id} initialGoal={project.goal || ''} />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Memory Sidebar */}
        <div className="w-80 border-r border-border bg-muted flex-shrink-0 overflow-y-auto">
          <MemorySidebar projectId={project.id} />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <ChatStream projectId={project.id} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-background p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-3">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="Type your message or paste HTTP requests..."
                  className="flex-1 min-h-[60px] max-h-[200px] px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-foreground resize-none text-foreground placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="px-6 py-3 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 self-end"
                >
                  <Send className="w-5 h-5" />
                  Send
                </button>
              </div>

              {/* Quick Actions */}
              <div className="mt-3 flex items-center gap-4">
                <button
                  onClick={() => setShowRules(!showRules)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showRules ? 'Hide' : 'Show'} Rules
                </button>
                <span className="text-sm text-muted-foreground">
                  Project: {project.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rules Panel (Toggleable) */}
        {showRules && (
          <div className="w-96 border-l border-border bg-muted flex-shrink-0 overflow-y-auto">
            <RulesTable projectId={project.id} />
          </div>
        )}
      </div>
    </div>
  )
}