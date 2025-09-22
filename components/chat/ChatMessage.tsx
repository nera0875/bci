'use client'

import React from 'react'
import { User, Bot } from 'lucide-react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Database } from '@/lib/supabase/database.types'

type ChatMessage = Database['public']['Tables']['chat_messages']['Row']

interface ChatMessageProps {
  message: ChatMessage
  index: number
}

const ChatMessageComponent = React.memo(({ message, index }: ChatMessageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0.0, 0.2, 1],
        delay: index * 0.05
      }}
      className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {message.role === 'assistant' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.05 + 0.1, type: "spring", stiffness: 300 }}
          className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center flex-shrink-0"
        >
          <Bot className="w-4 h-4 text-background" />
        </motion.div>
      )}

      <motion.div
        layout
        className={`
          max-w-[80%] px-4 py-3 rounded-xl
          ${message.role === 'user'
            ? 'bg-foreground text-background'
            : 'bg-muted text-foreground'
          }
        `}
      >
        {message.role === 'assistant' ? (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{message.content}</div>
        )}
      </motion.div>

      {message.role === 'user' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.05 + 0.1, type: "spring", stiffness: 300 }}
          className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0"
        >
          <User className="w-4 h-4 text-foreground" />
        </motion.div>
      )}
    </motion.div>
  )
})

ChatMessageComponent.displayName = 'ChatMessage'

export default ChatMessageComponent