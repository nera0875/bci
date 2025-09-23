'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send, Menu, Sliders, FolderTree, X, Plus,
  MessageSquare, Code, Database, Brain,
  ChevronLeft, Settings, Target, Shield,
  Layers, FileText, History, Zap, BrainCircuit,
  Search, Filter, Copy, Download, ChevronDown,
  Activity, Terminal, Lock, Unlock, AlertCircle,
  CheckCircle2, XCircle, ArrowLeft, MoreHorizontal,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  ListChecks
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import MemorySidebar from '@/components/memory/MemorySidebar'
import ChatStream from '@/components/chat/ChatStream'
import RulesTable from '@/components/rules/RulesTable'
import GoalBar from '@/components/goal/GoalBar'
import ConversationManagerUI from '@/components/chat/ConversationManager'
import { Database } from '@/lib/supabase/database.types'
import { motion, AnimatePresence } from 'framer-motion'

type Project = Database['public']['Tables']['projects']['Row']

export default function ChatProfessional({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showRules, setShowRules] = useState(false)
  const [showMemory, setShowMemory] = useState(true)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [chatKey, setChatKey] = useState(0)

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
      const { ConversationManager } = await import('@/lib/services/conversation')
      const manager = new ConversationManager(project.id)
      const conversation = await manager.initConversation()
      if (conversation) {
        conversationId = conversation.id
        setCurrentConversationId(conversation.id)
      }
    }

    // Save the user message with conversation ID
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        project_id: project.id,
        role: 'user' as const,
        content: userMessage,
        conversation_id: conversationId
      })

    if (error) {
      console.error('Error sending message:', error)
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

          <div className="w-px h-8 bg-gray-200" />

          {/* Memory Toggle */}
          <button
            onClick={() => setShowMemory(!showMemory)}
            className={`p-2.5 rounded-lg transition-all ${
              showMemory
                ? 'bg-gray-900 text-white'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            {showMemory ? <PanelLeftClose className="w-6 h-6" /> : <PanelLeftOpen className="w-6 h-6" />}
          </button>

          {/* Rules Toggle */}
          <button
            onClick={() => setShowRules(!showRules)}
            className={`px-5 py-2.5 rounded-lg transition-all flex items-center gap-2.5 ${
              showRules
                ? 'bg-gray-900 text-white'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <ListChecks className="w-5 h-5" />
            <span className="text-base font-medium">Rules</span>
          </button>

          <div className="w-px h-8 bg-gray-200" />

          <button
            onClick={() => router.push('/settings')}
            className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Memory Sidebar */}
        <AnimatePresence>
          {showMemory && (
            <motion.div
              initial={{ x: -450, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -450, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="w-[450px] border-r border-gray-200 bg-gray-50"
            >
              <div className="w-full h-full flex flex-col">
                <div className="px-5 py-4 border-b border-gray-200 bg-white">
                  <h2 className="text-base font-semibold text-gray-900">Memory Bank</h2>
                  <p className="text-sm text-gray-500 mt-1">Virtual file system</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <MemorySidebar projectId={project.id} />
                </div>
              </div>
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

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Describe your objective or paste HTTP requests..."
                    className="w-full min-h-[120px] max-h-[300px] px-5 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-400 text-lg"
                    style={{ paddingRight: '70px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    className="absolute bottom-4 right-4 p-3.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Rules Panel */}
        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ x: 500, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 500, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="w-[500px] border-l border-gray-200 bg-gray-50"
            >
              <div className="w-full h-full flex flex-col">
                <div className="px-5 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Active Rules</h2>
                    <p className="text-sm text-gray-500 mt-1">Detection patterns</p>
                  </div>
                  <button
                    onClick={() => setShowRules(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <RulesTable projectId={project.id} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <div className="h-10 border-t border-gray-200 bg-gray-50 px-6 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-600">Claude 3 Haiku Connected</span>
          </span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">Zero-Day Hunter Mode</span>
        </div>
        <span className="text-gray-500">Project: {project.id.slice(0, 8)}</span>
      </div>
    </div>
  )
}