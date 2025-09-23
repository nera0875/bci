'use client'

import { useState, useEffect } from 'react'
import { Plus, MessageSquare, Trash2, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Conversation {
  id: string
  title: string
  message_count: number
  created_at: string
  updated_at: string
  is_active: boolean
}

interface ConversationManagerProps {
  projectId: string
  currentConversationId: string | null
  onConversationChange: (conversationId: string) => void
  onNewConversation: () => void
}

export default function ConversationManagerUI({
  projectId,
  currentConversationId,
  onConversationChange,
  onNewConversation
}: ConversationManagerProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showList, setShowList] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [projectId, currentConversationId]) // Recharger quand on change de conversation

  const loadConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .gt('message_count', 0) // Ne montrer que les conversations avec des messages
      .order('updated_at', { ascending: false })
      .limit(10)

    if (data) {
      // Filtrer les conversations bugguées avec des dates incorrectes
      const validConversations = data.filter(conv => {
        const convDate = new Date(conv.created_at)
        const now = new Date()
        return convDate <= now // Éliminer les dates futures
      })
      setConversations(validConversations)
    }
  }

  const deleteConversation = async (id: string) => {
    await supabase
      .from('conversations')
      .update({ is_active: false })
      .eq('id', id)

    loadConversations()
    if (id === currentConversationId) {
      onNewConversation()
    }
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return "Aujourd'hui"
    if (days === 1) return "Hier"
    if (days < 7) return `Il y a ${days} jours`
    return d.toLocaleDateString('fr-FR')
  }

  return (
    <div className="relative">
      {/* Bouton toggle */}
      <button
        onClick={() => setShowList(!showList)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-[#202123]/20 rounded-lg hover:bg-[#F7F7F8] transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="text-sm">Conversations</span>
        {conversations.length > 0 && (
          <span className="bg-[#202123] text-white text-xs px-2 py-0.5 rounded-full">
            {conversations.length}
          </span>
        )}
      </button>

      {/* Liste des conversations */}
      {showList && (
        <div className="absolute top-12 left-0 z-50 w-80 bg-white border border-[#202123]/20 rounded-lg shadow-lg">
          <div className="p-3 border-b border-[#202123]/10">
            <button
              onClick={() => {
                onNewConversation()
                setShowList(false)
                // Forcer le rechargement des conversations après un court délai
                setTimeout(() => {
                  loadConversations()
                }, 500)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 bg-[#202123] text-white rounded-lg hover:bg-[#2A2B2F] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Chat</span>
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-[#6E6E80] text-sm">
                Aucune conversation
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`p-3 border-b border-[#202123]/5 hover:bg-[#F7F7F8] cursor-pointer transition-colors ${
                    conv.id === currentConversationId ? 'bg-[#F7F7F8]' : ''
                  }`}
                  onClick={() => {
                    onConversationChange(conv.id)
                    setShowList(false)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-[#202123] truncate">
                        {conv.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-[#6E6E80]" />
                        <span className="text-xs text-[#6E6E80]">
                          {formatDate(conv.updated_at)}
                        </span>
                        <span className="text-xs text-[#6E6E80]">
                          • {conv.message_count} messages
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(conv.id)
                      }}
                      className="p-1 text-[#6E6E80] hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {conversations.length > 0 && (
            <div className="p-3 border-t border-[#202123]/10">
              <div className="text-xs text-[#6E6E80] text-center">
                💡 Les conversations sont sauvegardées avec cache intelligent
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}