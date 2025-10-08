'use client'

import { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

interface StreamingTextProps {
  content: string
  isComplete: boolean
}

export default function StreamingText({ content, isComplete }: StreamingTextProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const wordsRef = useRef<string[]>([])
  const animationFrameRef = useRef<number | undefined>(undefined)
  const lastUpdateRef = useRef<number>(0)

  useEffect(() => {
    // Split content into words for smooth word-by-word animation
    const newWords = content.split(' ')
    wordsRef.current = newWords

    // If content is complete, show all immediately
    if (isComplete) {
      setDisplayedContent(content)
      setCurrentWordIndex(newWords.length)
      return
    }

    // Animate word by word with smooth timing
    const animateWords = (timestamp: number) => {
      // Control animation speed (ms per word)
      const WORD_DELAY = 30 // Adjust for speed

      if (timestamp - lastUpdateRef.current >= WORD_DELAY) {
        setCurrentWordIndex(prev => {
          const nextIndex = Math.min(prev + 1, wordsRef.current.length)

          // Build displayed content from words
          const wordsToShow = wordsRef.current.slice(0, nextIndex)
          setDisplayedContent(wordsToShow.join(' '))

          return nextIndex
        })

        lastUpdateRef.current = timestamp
      }

      // Continue animation if not complete
      if (currentWordIndex < wordsRef.current.length) {
        animationFrameRef.current = requestAnimationFrame(animateWords)
      }
    }

    // Start animation
    if (wordsRef.current.length > 0 && currentWordIndex < wordsRef.current.length) {
      animationFrameRef.current = requestAnimationFrame(animateWords)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [content, isComplete, currentWordIndex])

  return (
    <div className="streaming-text-container">
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown>
          {displayedContent}
        </ReactMarkdown>
      </div>
      {!isComplete && displayedContent && (
        <span className="typing-cursor-smooth" />
      )}
    </div>
  )
}