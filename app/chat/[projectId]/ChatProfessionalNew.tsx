'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send, Settings, ArrowLeft, DollarSign, Zap, MessageSquare, Plus, BookOpen, Trash2, Square, Edit2, Target
} from 'lucide-react'
import { isValidUUID } from '@/lib/utils/uuid'
import ChatStream from '@/components/chat/ChatStream'
import { motion } from 'framer-motion'
import UnifiedBoard from '@/components/board/unified/UnifiedBoardUltra'
import { PromptStyle } from '@/components/chat/PromptStyleSelector'
import { QuickContextBar } from '@/components/chat/QuickContextBar'
import FloatingAIButton from '@/components/ai/FloatingAIButton'
import ProjectGoalHeader from '@/components/chat/ProjectGoalHeader'
import TaskManager from '@/components/pentesting/TaskManager'

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

  // Task Funnel Panel
  const [showTaskFunnel, setShowTaskFunnel] = useState(false)

  // Prompt Style
  const [promptStyle, setPromptStyle] = useState<PromptStyle | string>('')
  const [customStyles, setCustomStyles] = useState<any[]>([])

  // AI Text Assistant
  const [aiTextAssistantSettings, setAiTextAssistantSettings] = useState({
    enabled: false,
    shortcut: 'Ctrl+Shift+P'
  })
  const [buttonPosition, setButtonPosition] = useState({ x: 20, y: 80 })

  useEffect(() => {
    loadProject()
    loadConversations()

    // Écouter l'événement d'ouverture du board depuis les toasts
    const handleOpenBoard = (e: Event) => {
      setShowUnifiedBoard(true)
    }
    window.addEventListener('open-bci-board', handleOpenBoard as EventListener)

    // Écouter les changements de settings AI Text Assistant
    const handleSettingsChange = (e: CustomEvent) => {
      setAiTextAssistantSettings(e.detail)
    }
    window.addEventListener('ai-text-assistant-settings-changed', handleSettingsChange as EventListener)

    // Load button position from localStorage
    const savedPosition = localStorage.getItem(`ai-button-position-${projectId}`)
    if (savedPosition) {
      setButtonPosition(JSON.parse(savedPosition))
    }

    return () => {
      window.removeEventListener('open-bci-board', handleOpenBoard as EventListener)
      window.removeEventListener('ai-text-assistant-settings-changed', handleSettingsChange as EventListener)
    }
  }, [projectId])

  const loadProject = async () => {
    try {
      if (!isValidUUID(projectId)) {
        router.push('/chat/6eb4e422-a10c-437e-a962-61af206d79ff')
        return
      }

      const { data, error } = await (supabase as any)
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error || !data) {
        router.push('/chat/6eb4e422-a10c-437e-a962-61af206d79ff')
        return
      }

      setProject(data)

      // Load AI Text Assistant settings
      if (data.settings?.aiTextAssistant) {
        setAiTextAssistantSettings(data.settings.aiTextAssistant)
      }

      // ✅ Charger les templates depuis Supabase system_prompts
      const { data: systemPrompts } = await (supabase as any)
        .from('system_prompts')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })

      if (systemPrompts && systemPrompts.length > 0) {
        const styles = systemPrompts.map((p: any) => ({
          id: p.id,
          label: p.name,
          description: p.description || p.category || 'Custom',
          systemPrompt: p.content,
          custom: true,
          category: p.category,
          icon: p.icon || '✨'
        }))
        setCustomStyles(styles)

        // Charger le style de prompt sauvegardé
        if (data.settings?.promptStyle) {
          setPromptStyle(data.settings.promptStyle)
        } else if (styles.length > 0) {
          // Par défaut, utiliser le premier template
          setPromptStyle(styles[0].id)
        }

        console.log('✅ Loaded', styles.length, 'system prompts from Supabase')
      }
    } catch (error) {
      console.error('Error loading project:', error)
      router.push('/chat/6eb4e422-a10c-437e-a962-61af206d79ff')
    } finally {
      setLoading(false)
    }
  }

  const loadConversations = async () => {
    try {
      const { data } = await (supabase as any)
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

  const createNewConversation = async (): Promise<string | null> => {
    try {
      const { data, error } = await (supabase as any)
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
        return data.id // ✅ Return ID directly to avoid race condition
      }
      return null
    } catch (error) {
      console.error('Error creating conversation:', error)
      return null
    }
  }

  const selectConversation = (conversationId: string) => {
    // ✅ Stop any ongoing streaming before switching conversations
    if (isStreaming && stopStreamingFn) {
      stopStreamingFn()
    }
    setCurrentConversationId(conversationId)
    setChatKey(prev => prev + 1)
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      // ✅ Stop streaming if deleting active conversation
      if (currentConversationId === conversationId && isStreaming && stopStreamingFn) {
        stopStreamingFn()
      }

      // ✅ CASCADE DELETE handles messages automatically - no need to manually delete
      await (supabase as any)
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
      await (supabase as any)
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

    // ✅ Fix race condition: get conversation ID directly instead of relying on state
    let conversationId = currentConversationId
    if (!conversationId) {
      conversationId = await createNewConversation()
      if (!conversationId) {
        console.error('Failed to create conversation')
        return
      }
    }

    // Sauvegarder le message
    try {
      await (supabase as any)
        .from('chat_messages')
        .insert([{
          project_id: project.id,
          role: 'user',
          content: userMessage,
          conversation_id: conversationId // ✅ Now guaranteed to be non-null
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
            {/* Removed back button - single project mode */}
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
        {/* Project Goal Header */}
        <ProjectGoalHeader projectId={projectId} />

        {/* Header avec boutons */}
        <div className="border-b border-[#E5E5E7] bg-[#FFFFFF] px-6 py-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-[#6E6E80]">AI Pentesting Session</p>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowTaskFunnel(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] text-[#202123] rounded-lg hover:bg-[#F7F7F8] border border-[#E5E5E7]"
              >
                <Target className="w-4 h-4" />
                Tasks
              </motion.button>

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
              promptStyle={promptStyle}
              customStyles={customStyles}
              onConversationCreated={(id) => {
                setCurrentConversationId(id)
                loadConversations()
              }}
              onStreamingChange={handleStreamingChange}
            />
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-[#FFFFFF] p-4 border-t border-[#E5E5E7]">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 items-end">
              {/* Settings Button */}
              <div className="pb-3">
                <QuickContextBar
                  currentStyle={promptStyle}
                  onStyleChange={async (style) => {
                    setPromptStyle(style as any)

                    // Sauvegarder le style dans les settings du projet
                    try {
                      const { error } = await supabase
                        .from('projects')
                        .update({
                          settings: {
                            ...(project.settings || {}),
                            promptStyle: style
                          }
                        })
                        .eq('id', projectId)

                      if (!error) {
                        console.log('✅ Prompt style sauvegardé:', style)
                        // Mettre à jour l'état local du project
                        setProject({
                          ...project,
                          settings: {
                            ...(project.settings || {}),
                            promptStyle: style
                          }
                        })
                      } else {
                        console.error('❌ Erreur sauvegarde style:', error)
                      }
                    } catch (err) {
                      console.error('❌ Erreur sauvegarde style:', err)
                    }
                  }}
                  onContextSelect={(context) => {
                    console.log('Context selected:', context)
                    // Optionnel: Ajouter le contexte au message automatiquement
                  }}
                  projectId={project.id}
                  onCustomStylesChange={(styles) => {
                    console.log('📝 Styles mis à jour depuis QuickContextBar:', styles)
                    setCustomStyles(styles)
                  }}
                />
              </div>

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

      {/* Task Manager */}
      <TaskManager
        projectId={project.id}
        open={showTaskFunnel}
        onOpenChange={setShowTaskFunnel}
      />

      {/* Unified Knowledge Management System */}
      <UnifiedBoard
        projectId={project.id}
        projectName={project.name}
        isOpen={showUnifiedBoard}
        onClose={() => setShowUnifiedBoard(false)}
      />

      {/* Floating AI Text Assistant */}
      <FloatingAIButton
        projectId={project.id}
        enabled={aiTextAssistantSettings.enabled}
        shortcut={aiTextAssistantSettings.shortcut}
        initialPosition={buttonPosition}
        onPositionChange={(pos) => {
          setButtonPosition(pos)
          localStorage.setItem(`ai-button-position-${projectId}`, JSON.stringify(pos))
        }}
      />
    </div>
  )
}
