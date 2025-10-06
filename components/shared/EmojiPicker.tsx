'use client'

import { useState } from 'react'

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
  suggestions?: string[]
  size?: 'sm' | 'md' | 'lg'
  allowCustom?: boolean
  className?: string
}

const DEFAULT_EMOJIS = [
  '🔐', '🔌', '🧠', '📢', '⚙️', '🐛', '🔥', '⚡', '🎯', '✨',
  '🚀', '🛡️', '🔍', '💡', '🔧', '📌', '⚠️', '✅', '❌', '📝',
  '📊', '🎨', '🏆', '💎', '🎭', '🎪', '🎬', '🎮', '🎲', '🎰',
  '📱', '💻', '⌨️', '🖥️', '🖨️', '📡'
]

export function EmojiPicker({
  value,
  onChange,
  suggestions = DEFAULT_EMOJIS,
  size = 'md',
  allowCustom = true,
  className = ''
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customEmoji, setCustomEmoji] = useState('')

  const sizeClasses = {
    sm: 'text-2xl p-2',
    md: 'text-4xl p-3',
    lg: 'text-5xl p-4'
  }

  const gridCols = suggestions.length > 16 ? 'grid-cols-8' : 'grid-cols-6'

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji)
    setIsOpen(false)
    setCustomEmoji('')
  }

  const handleCustomSubmit = () => {
    if (customEmoji.trim()) {
      onChange(customEmoji.trim())
      setIsOpen(false)
      setCustomEmoji('')
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Current Emoji Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${sizeClasses[size]} bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:scale-110 hover:border-blue-400 dark:hover:border-blue-500 transition-all`}
        title="Change icon"
      >
        {value}
      </button>

      {/* Dropdown Picker */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Picker Panel */}
          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 min-w-[280px]">
            {/* Emoji Grid */}
            <div className={`grid ${gridCols} gap-2 mb-3`}>
              {suggestions.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className={`text-2xl hover:scale-125 transition-transform p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                    emoji === value ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Custom Emoji Input */}
            {allowCustom && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customEmoji}
                    onChange={(e) => setCustomEmoji(e.target.value)}
                    placeholder="Coller emoji..."
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCustomSubmit()
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCustomSubmit}
                    disabled={!customEmoji.trim()}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
