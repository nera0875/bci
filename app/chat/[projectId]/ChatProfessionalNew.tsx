'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send, Settings, ArrowLeft, DollarSign, Zap, MessageSquare, Plus
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/utils/uuid'
import ChatStream from '@/components/chat/ChatStream'
import GoalBar from '@/components/goal/GoalBar'
import { motion, AnimatePresence } from 'framer-motion'
import { UnifiedBoardModular } from '@/components/unified/UnifiedBoardModular'
import { CostsDashboard } from '@/components/costs/CostsDashboard'

// Simple Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Project = {
  id: string
  name: string
  goal: string | null
  api_keys: Record<string, string> | null
  settings: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type Conversation = {
  id: string
  title: string
  created_at: string
  message_count: number
  is_active: boolean
}

export default function ChatProfessionalNew({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [chatKey, setChatKey] = useState(0)
  
  // Dashboards
  const [showUnifiedBoard, setShowUnifiedBoard] = useState(false)
  const [showCostsDashboard, setShowCostsDashboard] = useState(false)

  useEffect(() => {
    loadProject()
    loadConversations()
  }, [projectId])

  const loadProject = async () => {
    try {
      if (!isValidUUID(projectId)) {
        router.push('/projects')
        return
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error || !data) {
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

  const loadConversations = async () => {
    try {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })

      if (data) {
        setConversations(data)
        // Sélectionner la conversation la plus récente par défaut
        if (data.length > 0 && !currentConversationId) {
          setCurrentConversationId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  const createNewConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          project_id: projectId,
          title: `Chat - ${new Date().toLocaleDateString('fr-FR')}`,
          is_active: true
        })
        .select()
        .single()
      
      if (!error && data) {
        setCurrentConversationId(data.id)
        setChatKey(prev => prev + 1)
        await loadConversations()
      }
    } catch (error) {
      console.error('Error creating conversation:', error)
    }
  }

  const selectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    setChatKey(prev => prev + 1)
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !project) return

    const userMessage = message
    setMessage('')

    // Créer conversation si nécessaire
    let conversationId = currentConversationId
    if (!conversationId) {
      await createNewConversation()
      conversationId = currentConversationId
    }

    // Sauvegarder le message
    try {
      await supabase
        .from('chat_messages')
        .insert([{
          project_id: project.id,
          role: 'user',
          content: userMessage,
          conversation_id: conversationId
        }])
    } catch (error) {
      console.error('Error saving message:', error)
    }
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
    <div className="h-screen bg-[#FFFFFF] flex overflow-hidden">
      {/* Sidebar Conversations (comme ChatGPT) */}
      <div className="w-80 bg-[#F7F7F8] border-r border-[#E5E5E7] flex flex-col">
        {/* Header Sidebar */}
        <div className="p-4 border-b border-[#E5E5E7]">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/projects')}
              className="flex items-center gap-2 text-[#6E6E80] hover:text-[#202123]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Projets</span>
            </button>
          </div>
          
          <h2 className="font-semibold text-[#202123] mb-2">{project.name}</h2>
          
          <button
            onClick={createNewConversation}
            className="w-full flex items-center gap-2 px-3 py-2 bg-[#202123] text-[#FFFFFF] rounded-lg hover:bg-[#202123]/90"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Conversation
          </button>
        </div>

        {/* Liste Conversations */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  currentConversationId === conv.id
                    ? 'bg-[#FFFFFF] border border-[#E5E5E7] shadow-sm'
                    : 'hover:bg-[#FFFFFF]/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-[#6E6E80]" />
                  <span className="text-sm font-medium text-[#202123] truncate">
                    {conv.title}
                  </span>
                </div>
                <div className="text-xs text-[#6E6E80]">
                  {conv.message_count || 0} messages • {new Date(conv.created_at).toLocaleDateString('fr-FR')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Espace vide pour conversations seulement */}
        <div className="p-4">
          {conversations.length === 0 && (
            <div className="text-center text-[#6E6E80]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#E5E5E7]" />
              <p className="text-sm">Aucune conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#FFFFFF]">
        {/* Header avec boutons */}
        <div className="border-b border-[#E5E5E7] bg-[#FFFFFF] px-6 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-semibold text-[#202123]">{project.name}</h1>
              <p className="text-sm text-[#6E6E80]">AI Pentesting Session</p>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowUnifiedBoard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#202123] text-[#FFFFFF] rounded-lg hover:bg-[#202123]/90"
              >
                <Zap className="w-4 h-4" />
                Board
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCostsDashboard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#F7F7F8] text-[#202123] rounded-lg hover:bg-[#E5E5E7] border border-[#E5E5E7]"
              >
                <DollarSign className="w-4 h-4" />
                Coûts
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/settings')}
                className="flex items-center gap-2 px-4 py-2 bg-[#F7F7F8] text-[#202123] rounded-lg hover:bg-[#E5E5E7] border border-[#E5E5E7]"
              >
                <Settings className="w-4 h-4" />
                Settings
              </motion.button>
            </div>
          </div>
        </div>

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
              onConversationCreated={(id) => {
                setCurrentConversationId(id)
                loadConversations()
              }}
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
                  placeholder="Tapez votre message... (L'IA respecte automatiquement les règles)"
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

      {/* Dashboards Modaux */}
      
      {/* Board Unifié */}
      <UnifiedBoardModular
        projectId={project.id}
        isOpen={showUnifiedBoard}
        onClose={() => setShowUnifiedBoard(false)}
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
