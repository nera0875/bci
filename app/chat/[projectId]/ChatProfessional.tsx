'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send, Database, Settings, ArrowLeft, ListChecks, DollarSign, Zap
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// Simple Supabase client without strict typing for now
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { isValidUUID } from '@/lib/utils/uuid'
import MemorySidebarOptimized from '@/components/memory/MemorySidebarOptimized'
import ChatStream from '@/components/chat/ChatStream'
import RulesTableProfessional from '@/components/rules/RulesTableProfessional'
import GoalBar from '@/components/goal/GoalBar'
import ConversationManagerUI from '@/components/chat/ConversationManager'
import ResizablePanel from '@/components/ui/ResizablePanel'
import { motion, AnimatePresence } from 'framer-motion'
import { UnifiedBoardModular } from '@/components/unified/UnifiedBoardModular'
import { CostsDashboard } from '@/components/costs/CostsDashboard'
import { toast } from 'react-toastify'

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
  
  // Nouveaux états pour les dashboards
  const [showUnifiedBoard, setShowUnifiedBoard] = useState(false)
  const [showCostsDashboard, setShowCostsDashboard] = useState(false)
  const [unifiedBoardTab, setUnifiedBoardTab] = useState<'memory' | 'rules' | 'optimization'>('memory')

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

    // Parser for board commands
    let assistantResponse = null
    if (userMessage.toLowerCase().startsWith('crée dossier ')) {
      const name = userMessage.substring(12).trim()
      if (name) {
        try {
          const res = await fetch('/api/board/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'folder',
              title: name,
              section: 'rules',
              projectId,
              parent_id: null
            })
          })
          if (res.ok) {
            const result = await res.json()
            assistantResponse = `Dossier créé avec succès: ${name}`
            toast.success('Dossier créé')
          } else {
            assistantResponse = 'Erreur création dossier'
            toast.error('Erreur création dossier')
          }
        } catch (err) {
          assistantResponse = 'Erreur réseau création dossier'
          toast.error('Erreur réseau')
        }
      } else {
        assistantResponse = 'Nom de dossier manquant après "crée dossier "'
      }
    } else if (userMessage.toLowerCase().startsWith('crée tableau ')) {
      const name = userMessage.substring(12).trim()
      if (name) {
        try {
          const res = await fetch('/api/board/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'table',
              title: name,
              section: 'rules',
              projectId,
              parent_id: null,
              view_mode: 'table'
            })
          })
          if (res.ok) {
            const result = await res.json()
            assistantResponse = `Tableau créé: ${name}`
            toast.success('Tableau créé')
          } else {
            assistantResponse = 'Erreur création tableau'
            toast.error('Erreur création tableau')
          }
        } catch (err) {
          assistantResponse = 'Erreur réseau création tableau'
          toast.error('Erreur réseau')
        }
      } else {
        assistantResponse = 'Nom de tableau manquant après "crée tableau "'
      }
    } else if (userMessage.toLowerCase().startsWith('ajoute row ')) {
      const name = userMessage.substring(10).trim()
      if (name) {
        try {
          const res = await fetch('/api/board/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'row',
              title: name,
              section: 'rules',
              projectId,
              parent_id: null  // Assume root, or get from context if possible
            })
          })
          if (res.ok) {
            const result = await res.json()
            assistantResponse = `Row ajoutée: ${name}`
            toast.success('Row ajoutée')
          } else {
            assistantResponse = 'Erreur ajout row'
            toast.error('Erreur ajout row')
          }
        } catch (err) {
          assistantResponse = 'Erreur réseau ajout row'
          toast.error('Erreur réseau')
        }
      } else {
        assistantResponse = 'Titre de row manquant après "ajoute row "'
      }
    }

    // If assistantResponse, insert assistant message first, then user
    if (assistantResponse) {
      // Insert assistant message
      await supabase.from('chat_messages').insert([{
        project_id: project.id,
        role: 'assistant',
        content: assistantResponse,
        conversation_id: conversationId
      }])
    }

    // Then insert user message
    await supabase.from('chat_messages').insert([{
      project_id: project.id,
      role: 'user',
      content: userMessage,
      conversation_id: conversationId
    }])

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
    <div className="h-screen bg-[#FFFFFF] flex flex-col overflow-hidden">
      {/* Header - Clean & Minimal */}
      <header className="h-16 border-b border-[#E5E5E7] bg-[#FFFFFF] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {/* Back to Projects */}
          <button
            onClick={() => router.push('/projects')}
            className="p-2.5 hover:bg-[#F7F7F8] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>

          {/* Project Info */}
          <div>
            <h1 className="text-lg font-semibold text-[#202123]">{project.name}</h1>
            <p className="text-sm text-[#6E6E80]">AI Pentesting Session</p>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Coûts Dashboard */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCostsDashboard(true)}
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors bg-[#F7F7F8] text-[#202123] hover:bg-[#E5E5E7]"
          >
            <DollarSign className="w-4 h-4" />
            Coûts
          </motion.button>

          {/* Board Unifié - Optimisation */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setUnifiedBoardTab('optimization')
              setShowUnifiedBoard(true)
            }}
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors bg-[#F7F7F8] text-[#202123] hover:bg-[#E5E5E7]"
          >
            <Zap className="w-4 h-4" />
            Optimisation
          </motion.button>

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
            onClick={() => {
              if (showMemory) {
                setShowMemory(false)
              } else {
                setUnifiedBoardTab('memory')
                setShowUnifiedBoard(true)
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              showMemory
                ? 'bg-[#202123] text-[#FFFFFF]'
                : 'bg-[#F7F7F8] text-[#202123] hover:bg-[#E5E5E7]'
            }`}
          >
            <Database className="w-4 h-4" />
            Memory Bank
          </motion.button>

          {/* Rules Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (showRules) {
                setShowRules(false)
              } else {
                setUnifiedBoardTab('rules')
                setShowUnifiedBoard(true)
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              showRules
                ? 'bg-[#202123] text-[#FFFFFF]'
                : 'bg-[#F7F7F8] text-[#202123] hover:bg-[#E5E5E7]'
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
        {/* Memory Sidebar - Resizable */}
        <AnimatePresence>
          {showMemory && (
            <motion.div
              initial={{ x: -450, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -450, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <ResizablePanel
                defaultWidth={450}
                minWidth={300}
                maxWidth={800}
                side="left"
                className="border-r border-[#E5E5E7] bg-white"
              >
                <MemorySidebarOptimized
                  projectId={project.id}
                />
              </ResizablePanel>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-[#FFFFFF]">
          {/* Goal Bar */}
          <div className="border-b border-[#E5E5E7] bg-[#F7F7F8]">
            <GoalBar projectId={project.id} initialGoal={project.goal || ''} />
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto bg-[#FFFFFF]">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <ChatStream
                key={chatKey}
                projectId={project.id}
                conversationId={currentConversationId}
                onConversationCreated={(id) => setCurrentConversationId(id)}
              />
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t border-[#E5E5E7] bg-[#FFFFFF] p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Tapez votre message... (L'IA peut gérer sa mémoire automatiquement)"
                    className="w-full px-4 py-3 border border-[#E5E5E7] rounded-xl focus:outline-none focus:border-[#202123] focus:ring-1 focus:ring-[#202123]/20 bg-[#FFFFFF] text-[#202123] placeholder-[#6E6E80]"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="px-6 py-3 bg-[#202123] hover:bg-[#202123]/90 disabled:bg-[#E5E5E7] disabled:text-[#6E6E80] text-[#FFFFFF] rounded-xl font-medium flex items-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Envoyer
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Rules Sidebar - Resizable */}
        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <ResizablePanel
                defaultWidth={400}
                minWidth={300}
                maxWidth={800}
                side="right"
                className="border-l border-[#E5E5E7] bg-white"
              >
                <RulesTableProfessional projectId={project.id} />
              </ResizablePanel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dashboards Modaux */}
      
      {/* Board Unifié */}
      <UnifiedBoardModular
        projectId={project.id}
        isOpen={showUnifiedBoard}
        onClose={() => setShowUnifiedBoard(false)}
        initialTab={unifiedBoardTab}
      />

      {/* Dashboard Coûts */}
      <CostsDashboard
        projectId={project.id}
        conversationId={currentConversationId || undefined}
        isOpen={showCostsDashboard}
        onClose={() => setShowCostsDashboard(false)}
      />
    </div>
  )
}
