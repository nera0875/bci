'use client'

import { useEffect, useRef, useState } from 'react'
import StreamingMarkdownBatched from './StreamingMarkdownBatched'

interface SmoothTypewriterProps {
  content: string
  isComplete: boolean
  speed?: number
}

export default function SmoothTypewriter({
  content,
  isComplete,
  speed = 100
}: SmoothTypewriterProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const rafRef = useRef<number>()
  const indexRef = useRef(0)
  const lastTimeRef = useRef(0)

  useEffect(() => {
    // Si complete, tout afficher
    if (isComplete) {
      setDisplayedContent(content)
      indexRef.current = content.length
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    // Reset si nouveau message
    if (content !== displayedContent && content.length < displayedContent.length) {
      setDisplayedContent('')
      indexRef.current = 0
    }

    // Animation caractère par caractère
    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp

      const elapsed = timestamp - lastTimeRef.current
      const msPerChar = 1000 / speed

      if (elapsed >= msPerChar && indexRef.current < content.length) {
        indexRef.current++
        setDisplayedContent(content.slice(0, indexRef.current))
        lastTimeRef.current = timestamp
      }

      // Continuer si pas fini
      if (indexRef.current < content.length) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    // Démarrer animation
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [content, isComplete, speed, displayedContent])

  return (
    <div style={{ transition: 'opacity 0.1s ease-in-out' }}>
      <StreamingMarkdownBatched
        content={displayedContent}
        isComplete={isComplete}
      />
    </div>
  )
}
