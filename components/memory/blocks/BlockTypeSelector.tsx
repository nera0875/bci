'use client'

import { useState } from 'react'
import { BlockType, BLOCK_TYPE_CONFIG } from '@/types/memory'
import { Plus, ChevronDown } from 'lucide-react'
import DynamicIcon from '@/components/shared/DynamicIcon'
import { cn } from '@/lib/utils'

interface BlockTypeSelectorProps {
  onSelect: (type: BlockType) => void
  className?: string
}

/**
 * BlockTypeSelector - Dropdown to select a block type to add
 *
 * Displays all available block types with icons and descriptions
 */
export function BlockTypeSelector({ onSelect, className }: BlockTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (type: BlockType) => {
    onSelect(type)
    setIsOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>Add Block</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
            <div className="p-2 space-y-1">
              {(Object.keys(BLOCK_TYPE_CONFIG) as BlockType[]).map((type) => {
                const config = BLOCK_TYPE_CONFIG[type]
                return (
                  <button
                    key={type}
                    onClick={() => handleSelect(type)}
                    className="w-full flex items-start gap-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <DynamicIcon
                      name={config.icon}
                      size={20}
                      className="flex-shrink-0 mt-0.5 text-gray-600 dark:text-gray-400"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {config.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {config.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
