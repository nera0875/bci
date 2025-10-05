'use client'

import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

interface ChatScrollAnchorProps {
  trackVisibility: boolean
  isAtBottom: boolean
  scrollAreaRef: React.RefObject<HTMLDivElement>
}

export function ChatScrollAnchor({
  trackVisibility,
  isAtBottom,
  scrollAreaRef,
}: ChatScrollAnchorProps) {
  const { ref, inView } = useInView({
    trackVisibility,
    delay: 100,
    threshold: 0,
  })

  useEffect(() => {
    // Auto-scroll SEULEMENT si:
    // 1. User est déjà en bas (isAtBottom)
    // 2. Nouveau contenu arrive (trackVisibility)
    // 3. Anchor pas visible (inView = false)
    if (isAtBottom && trackVisibility && !inView && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop =
        scrollAreaRef.current.scrollHeight - scrollAreaRef.current.clientHeight
    }
  }, [inView, isAtBottom, trackVisibility, scrollAreaRef])

  return <div ref={ref} className="h-px w-full" />
}
