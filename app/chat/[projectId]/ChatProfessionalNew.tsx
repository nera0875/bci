'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send, Settings, ArrowLeft, DollarSign, Zap, MessageSquare, Plus, BookOpen, Trash2, Square, Edit2
} from 'lucide-react'
import { isValidUUID } from '@/lib/utils/uuid'
import ChatStream from '@/components/chat/ChatStream'
import { motion } from 'framer-motion'
import UnifiedBoard from '@/components/board/unified/UnifiedBoardUltra'

import { supabase } from '@/lib/supabase/client'

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
  console.log('ChatProfessionalNew loaded successfully, projectId:', projectId);
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [chatKey, setChatKey] = useState(0)

  // Streaming control
  const [isStreaming, setIsStreaming] = useState(false)
  const [stopStreamingFn, setStopStreamingFn] = useState<(() => void) | null>(null)

  // Rename conversation
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  // Unified Board
  const [showUnifiedBoard, setShowUnifiedBoard] = useState(false)

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

  const deleteConversation = async (conversationId: string) => {
    try {
      // Supprimer tous les messages de la conversation
      await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId)

      // Supprimer la conversation
      await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      // Si c'était la conversation active, sélectionner une autre
      if (currentConversationId === conversationId) {
        const remaining = conversations.filter(c => c.id !== conversationId)
        if (remaining.length > 0) {
          setCurrentConversationId(remaining[0].id)
        } else {
          setCurrentConversationId(null)
        }
        setChatKey(prev => prev + 1)
      }

      // Recharger la liste
      await loadConversations()
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  const renameConversation = async (conversationId: string, newTitle: string) => {
    try {
      await supabase
        .from('conversations')
        .update({ title: newTitle })
        .eq('id', conversationId)

      await loadConversations()
      setEditingConvId(null)
      setEditingTitle('')
    } catch (error) {
      console.error('Error renaming conversation:', error)
    }
  }

  // Callback stabilisé pour éviter les boucles de re-render
  const handleStreamingChange = useCallback((streaming: boolean, stopFn?: () => void) => {
    setIsStreaming(streaming)
    setStopStreamingFn(() => stopFn || null)
  }, [])

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
              <div
                key={conv.id}
                className={`group relative rounded-lg transition-colors ${
                  currentConversationId === conv.id
                    ? 'bg-[#FFFFFF] border border-[#E5E5E7] shadow-sm'
                    : 'hover:bg-[#FFFFFF]/50'
                }`}
              >
                {editingConvId === conv.id ? (
                  <div className="p-3 pr-10">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          renameConversation(conv.id, editingTitle)
                        } else if (e.key === 'Escape') {
                          setEditingConvId(null)
                          setEditingTitle('')
                        }
                      }}
                      onBlur={() => {
                        if (editingTitle.trim()) {
                          renameConversation(conv.id, editingTitle)
                        } else {
                          setEditingConvId(null)
                        }
                      }}
                      className="w-full px-2 py-1 text-sm border border-[#202123] rounded focus:outline-none focus:ring-1 focus:ring-[#202123]"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => selectConversation(conv.id)}
                    className="w-full text-left p-3 pr-20"
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
                )}

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingConvId(conv.id)
                      setEditingTitle(conv.title)
                    }}
                    className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded text-blue-600"
                    title="Renommer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Supprimer cette conversation ?')) {
                        deleteConversation(conv.id)
                      }
                    }}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
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
                className="flex items-center gap-2 px-4 py-2 bg-[#202123] text-[#FFFFFF] rounded-lg hover:bg-[#202123]/90 border border-[#E5E5E7]"
              >
                <Zap className="w-4 h-4" />
                BCI
              </motion.button>
            </div>
          </div>
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
              onStreamingChange={handleStreamingChange}
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
              {isStreaming ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => stopStreamingFn?.()}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Arrêter
                </motion.button>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Knowledge Management System */}
      <UnifiedBoard
        projectId={project.id}
        projectName={project.name}
        isOpen={showUnifiedBoard}
        onClose={() => setShowUnifiedBoard(false)}
      />
    </div>
  )
}
