'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send, Menu, Sparkles, FolderTree, X, Plus,
  MessageSquare, Code, Database, Brain,
  ChevronLeft, Settings, Target, Shield,
  Layers, FileText, History, Zap, BrainCircuit,
  Search, Filter, Copy, Download, ChevronDown,
  Activity, Terminal, Lock, Unlock, AlertCircle,
  CheckCircle2, XCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import MemorySidebarEnhanced from '@/components/memory/MemorySidebarEnhanced'
import ChatStream from '@/components/chat/ChatStream'
import RulesTable from '@/components/rules/RulesTable'
import GoalBar from '@/components/goal/GoalBar'
import { Database } from '@/lib/supabase/database.types'
import { motion, AnimatePresence } from 'framer-motion'

type Project = Database['public']['Tables']['projects']['Row']

export default function ChatInterfaceModern({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showRules, setShowRules] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const [activeView, setActiveView] = useState<'chat' | 'analyze' | 'exploit'>('chat')

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
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-3 border-zinc-700 border-t-cyan-500 rounded-full"
        />
      </div>
    )
  }

  if (!project) return null

  const sidebarAnimation = {
    initial: { x: -320, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -320, opacity: 0 },
    transition: { type: "spring", damping: 25, stiffness: 300 }
  }

  const rulesAnimation = {
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -100, opacity: 0 },
    transition: { type: "spring", damping: 20, stiffness: 300 }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-zinc-900 via-zinc-950 to-black flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <motion.header
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 py-3 flex items-center justify-between relative z-50"
      >
        <div className="flex items-center gap-4">
          {/* Sidebar Toggles */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMemory(!showMemory)}
            className={`p-2.5 rounded-xl transition-all ${
              showMemory
                ? 'bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <FolderTree className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowRules(!showRules)}
            className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${
              showRules
                ? 'bg-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/20 px-4'
                : 'bg-zinc-800 text-zinc-400 hover:text-white px-4'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Rules Engine</span>
          </motion.button>

          <div className="h-8 w-px bg-zinc-800" />

          {/* View Tabs */}
          <div className="flex gap-2 bg-zinc-800/50 rounded-xl p-1">
            {[
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'analyze', label: 'Analyze', icon: BrainCircuit },
              { id: 'exploit', label: 'Exploit', icon: Zap }
            ].map((tab) => (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveView(tab.id as any)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  activeView === tab.id
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Project Info */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <h1 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              {project.name}
            </h1>
            <p className="text-xs text-zinc-500">Project ID: {project.id.slice(0, 8)}</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/projects')}
            className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.header>

      {/* Rules Panel (Top Slide) */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            {...rulesAnimation}
            className="absolute top-16 left-0 right-0 z-40 bg-gradient-to-b from-zinc-900 via-zinc-900/95 to-transparent backdrop-blur-xl border-b border-zinc-800/50 max-h-96 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Active Rules & Patterns
                </h2>
                <button
                  onClick={() => setShowRules(false)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
              <RulesTable projectId={project.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Memory Sidebar */}
        <AnimatePresence>
          {showMemory && (
            <motion.div
              {...sidebarAnimation}
              className="w-80 bg-zinc-900/50 backdrop-blur-xl border-r border-zinc-800/50 flex-shrink-0"
            >
              <div className="h-full overflow-hidden">
                <div className="p-4 border-b border-zinc-800/50">
                  <h2 className="text-sm font-semibold text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-cyan-400" />
                      Memory Bank
                    </span>
                    <button
                      onClick={() => setShowMemory(false)}
                      className="p-1 hover:bg-zinc-800 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-zinc-500" />
                    </button>
                  </h2>
                </div>
                <MemorySidebarEnhanced projectId={project.id} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gradient-to-b from-transparent to-zinc-950/50">
          {/* Goal Bar */}
          <div className="bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border-b border-zinc-800/50 backdrop-blur-sm">
            <GoalBar projectId={project.id} initialGoal={project.goal || ''} />
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <ChatStream projectId={project.id} />
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-800/50 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="Describe your pentesting objective or paste HTTP requests..."
                  className="w-full min-h-[80px] max-h-[200px] px-5 py-4 pr-14 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent resize-none text-white placeholder:text-zinc-500 text-base"
                />

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="absolute bottom-3 right-3 p-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 flex items-center gap-3">
                {[
                  { icon: Target, label: 'Scan Target', color: 'cyan' },
                  { icon: Lock, label: 'Test Auth', color: 'purple' },
                  { icon: AlertCircle, label: 'Find Vulns', color: 'red' },
                  { icon: Code, label: 'Generate Payload', color: 'green' },
                ].map((action, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-4 py-2 bg-zinc-800/50 hover:bg-${action.color}-500/10 border border-zinc-700/50 hover:border-${action.color}-500/50 rounded-xl flex items-center gap-2 text-zinc-400 hover:text-${action.color}-400 transition-all`}
                  >
                    <action.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="bg-zinc-900 border-t border-zinc-800/50 px-6 py-2 flex items-center justify-between text-xs"
      >
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-green-400" />
            <span className="text-zinc-500">AI Engine:</span>
            <span className="text-green-400 font-medium">Claude Opus 4.1</span>
          </span>
          <span className="text-zinc-700">|</span>
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span className="text-zinc-500">Mode:</span>
            <span className="text-cyan-400 font-medium">Zero-Day Hunter</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            <span className="text-zinc-500">Connected</span>
          </span>
        </div>
      </motion.div>
    </div>
  )
}