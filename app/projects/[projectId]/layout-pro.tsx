'use client'

import React, { useState } from 'react'
import { MessageSquare, FolderOpen, Settings, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import ChatInterface from '@/components/chat/ChatInterface'
import SimpleBoard from '@/components/board/SimpleBoard'

interface ProjectLayoutProProps {
  projectId: string
  projectName: string
}

export default function ProjectLayoutPro({ projectId, projectName }: ProjectLayoutProProps) {
  const [activeView, setActiveView] = useState<'chat' | 'board'>('chat')
  const [showBoard, setShowBoard] = useState(false)

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header projet style Manus */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center text-sm font-semibold">
              {projectName.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{projectName}</h1>
              <p className="text-sm text-gray-500">Pentesting assisté par IA</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={activeView === 'chat' ? 'default' : 'outline'}
              onClick={() => {
                setActiveView('chat')
                setShowBoard(false)
              }}
              className="flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </Button>
            
            <Button
              variant={activeView === 'board' ? 'default' : 'outline'}
              onClick={() => {
                setActiveView('board')
                setShowBoard(true)
              }}
              className="flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Memory Board
            </Button>
          </div>
        </div>
      </div>

      {/* Zone principale */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === 'chat' && (
          <div className="flex-1 flex flex-col">
            <ChatInterface />
            
            {/* Boutons d'action post-conversation */}
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveView('board')
                    setShowBoard(true)
                  }}
                  className="flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  Voir Memory Board
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    // TODO: Fonction pour forcer rangement manuel
                    console.log('Force organize current conversation')
                  }}
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Organiser maintenant
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {activeView === 'board' && (
          <div className="flex-1 relative">
            <SimpleBoard
              projectId={projectId}
              isOpen={true}
              onClose={() => {
                setActiveView('chat')
                setShowBoard(false)
              }}
            />
          </div>
        )}
      </div>

      {/* Notifications pour actions IA */}
      <div className="absolute bottom-4 right-4 z-50">
        {/* TODO: Afficher notifications quand IA range automatiquement */}
      </div>
    </div>
  )
}
