'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Bot } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

interface StreamingMessageProps {
  content: string
  isComplete: boolean
}

const StreamingMessage = React.memo(({ content, isComplete }: StreamingMessageProps) => {
  const [displayedWords, setDisplayedWords] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const wordsRef = useRef<string[]>([])
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    // Parse content into words
    const words = content.split(' ').filter(w => w.length > 0)
    wordsRef.current = words

    if (isComplete) {
      // Show all content immediately when complete
      setDisplayedWords(words)
      setCurrentIndex(words.length)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }

    // Animate word by word
    if (currentIndex < words.length) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          const next = prev + 1
          if (next >= wordsRef.current.length) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            return wordsRef.current.length
          }
          return next
        })
      }, 30) // 30ms per word for smooth effect
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [content, isComplete])

  useEffect(() => {
    // Update displayed words when index changes
    setDisplayedWords(wordsRef.current.slice(0, currentIndex))
  }, [currentIndex])

  const displayText = displayedWords.join(' ')

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1]
      }}
      className="flex gap-4 justify-start"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1
        }}
        className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center flex-shrink-0"
      >
        <Bot className="w-4 h-4 text-background" />
      </motion.div>

      <motion.div
        layout="position"
        layoutId="streaming-message"
        transition={{
          layout: {
            type: "spring",
            stiffness: 500,
            damping: 50
          }
        }}
        className="max-w-[80%] px-4 py-3 rounded-xl bg-muted text-foreground"
      >
        <div className="prose prose-sm max-w-none relative">
          <ReactMarkdown>
            {displayText}
          </ReactMarkdown>
          <AnimatePresence>
            {!isComplete && displayText && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.2, 1, 0.2] }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }
                }}
                className="inline-block w-[3px] h-[1.2em] bg-current ml-[2px] align-text-bottom"
                style={{
                  background: 'linear-gradient(to bottom, transparent, currentColor 20%, currentColor 80%, transparent)'
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
})

StreamingMessage.displayName = 'StreamingMessage'

export default StreamingMessage