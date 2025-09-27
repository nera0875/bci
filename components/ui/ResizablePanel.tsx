'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface ResizablePanelProps {
  children: React.ReactNode
  defaultWidth: number
  minWidth: number
  maxWidth?: number
  side: 'left' | 'right'
  className?: string
}

export default function ResizablePanel({
  children,
  defaultWidth,
  minWidth,
  maxWidth = window.innerWidth * 0.8, // 80% de la largeur d'écran par défaut
  side,
  className = ''
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const deltaX = side === 'left' 
        ? e.clientX - startXRef.current
        : startXRef.current - e.clientX

      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, startWidthRef.current + deltaX)
      )

      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, minWidth, maxWidth, side])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
  }

  return (
    <div
      ref={panelRef}
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: `${width}px` }}
    >
      {children}
      
      {/* Resize Handle */}
      <div
        className={`absolute top-0 bottom-0 w-1 cursor-col-resize group hover:bg-blue-500/20 transition-colors ${
          side === 'left' ? 'right-0' : 'left-0'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className={`absolute top-1/2 -translate-y-1/2 w-1 h-12 bg-[#E5E5E7] group-hover:bg-blue-500 transition-colors rounded-full ${
          side === 'left' ? 'right-0' : 'left-0'
        }`} />
        
        {/* Resize Indicator */}
        {isResizing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`absolute top-0 bottom-0 w-0.5 bg-blue-500 ${
              side === 'left' ? 'right-0' : 'left-0'
            }`}
          />
        )}
      </div>
    </div>
  )
}
