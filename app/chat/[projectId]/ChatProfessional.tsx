'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send, Database, Settings, ArrowLeft, ListChecks
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// Simple Supabase client without strict typing for now
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { isValidUUID } from '@/lib/utils/uuid'
import MemorySidebar from '@/components/memory/MemorySidebar'
import ChatStream from '@/components/chat/ChatStream'
import RulesTable from '@/components/rules/RulesTable'
import GoalBar from '@/components/goal/GoalBar'
import ConversationManagerUI from '@/components/chat/ConversationManager'
import { motion, AnimatePresence } from 'framer-motion'

type Project = {
  id: string
  name: string
  goal: string | null
  api_keys: Record<string, string> | null
  settings: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export default function ChatProfessional({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showRules, setShowRules] = useState(false)
  const [showMemory, setShowMemory] = useState(true) // Memory Bank (left sidebar)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [chatKey, setChatKey] = useState(0)

  // Load project
  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      // Validate UUID format first
      if (!isValidUUID(projectId)) {
        console.error('Invalid UUID format:', projectId)
        router.push('/projects')
        return
      }

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

  const handleNewConversation = () => {
    setCurrentConversationId(null)
    setChatKey(prev => prev + 1) // Force ChatStream to reset
  }

  const handleConversationChange = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    setChatKey(prev => prev + 1) // Force ChatStream to reload with new conversation
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !project) return

    const userMessage = message
    setMessage('')

    // If no conversation yet, create one first
    let conversationId = currentConversationId
    if (!conversationId) {
      try {
        // Create a simple conversation directly in Supabase
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            project_id: project.id,
            title: `Chat - ${new Date().toLocaleDateString()}`,
            is_active: true
          })
          .select()
          .single()
        
        if (!error && data) {
          conversationId = data.id
          setCurrentConversationId(data.id)
        }
      } catch (error) {
        console.error('Error creating conversation:', error)
      }
    }

    // Save the user message with conversation ID
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          project_id: project.id,
          role: 'user',
          content: userMessage,
          conversation_id: conversationId
        }])
      
      if (error) {
        console.error('Supabase error:', error)
      }
    } catch (error) {
      console.error('Error saving message:', error)
    }

    // The ChatStream component will detect this via subscription
    // and automatically trigger Claude's response
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header - Clean & Minimal */}
      <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {/* Back to Projects */}
          <button
            onClick={() => router.push('/projects')}
            className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>

          {/* Project Info */}
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
            <p className="text-sm text-gray-500">AI Pentesting Session</p>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Conversation Manager */}
          <ConversationManagerUI
            projectId={project.id}
            currentConversationId={currentConversationId}
            onConversationChange={handleConversationChange}
            onNewConversation={handleNewConversation}
          />

          {/* Memory Bank Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMemory(!showMemory)}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              showMemory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Memory Bank
          </motion.button>

          {/* Rules Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowRules(!showRules)}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              showRules
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            Rules
          </motion.button>

          {/* Settings */}
          <button
            onClick={() => router.push('/settings')}
            className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Memory Sidebar (Original System) */}
        <AnimatePresence>
          {showMemory && (
            <motion.div
              initial={{ x: -350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -350, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="w-[350px] border-r border-gray-200 bg-white"
            >
              <MemorySidebar
                projectId={project.id}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Goal Bar */}
          <div className="border-b border-gray-200 bg-gray-50">
            <GoalBar projectId={project.id} initialGoal={project.goal || ''} />
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="max-w-5xl mx-auto px-6 py-8">
              <ChatStream
                key={chatKey}
                projectId={project.id}
                conversationId={currentConversationId}
                onConversationCreated={(id) => setCurrentConversationId(id)}
              />
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 bg-white p-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Tapez votre message... (L'IA peut gérer sa mémoire automatiquement)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Envoyer
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Rules Sidebar */}
        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ x: 350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 350, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="w-[400px] border-l border-gray-200 bg-white"
            >
              <div className="h-full flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-900">Rules & Instructions</h3>
                  <p className="text-sm text-gray-600">Configure AI behavior</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <RulesTable projectId={project.id} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}