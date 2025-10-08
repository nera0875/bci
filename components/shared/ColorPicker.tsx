'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  value?: string // Hex color
  onChange: (color: string) => void
  trigger?: React.ReactNode
}

// Palette professionnelle (gray-scale + accent colors)
const COLORS = [
  // Grays
  { name: 'Slate', value: '#64748b' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Zinc', value: '#71717a' },
  { name: 'Stone', value: '#78716c' },

  // Reds
  { name: 'Red', value: '#ef4444' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Pink', value: '#ec4899' },

  // Oranges
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },

  // Greens
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },

  // Blues
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },

  // Purples
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' }
]

export default function ColorPicker({ value = '#6b7280', onChange, trigger }: ColorPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600",
          "hover:border-gray-400 dark:hover:border-gray-500 transition-colors",
          "bg-white dark:bg-gray-800"
        )}
      >
        {trigger || (
          <div
            className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-700"
            style={{ backgroundColor: value }}
          />
        )}
      </button>

      {/* Color Picker Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: value }} />
              Choose Color
            </DialogTitle>
          </DialogHeader>

          {/* Colors Grid */}
          <div className="grid grid-cols-7 gap-3 p-4">
            {COLORS.map((color) => {
              const isSelected = value === color.value

              return (
                <button
                  key={color.value}
                  onClick={() => {
                    onChange(color.value)
                    setOpen(false)
                  }}
                  className={cn(
                    "relative w-10 h-10 rounded-lg transition-all",
                    "hover:scale-110 active:scale-95",
                    isSelected && "ring-2 ring-offset-2 ring-gray-900 dark:ring-gray-100"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check size={16} className="text-white drop-shadow-lg" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected Color Info */}
          <div className="flex items-center justify-between px-4 pb-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {COLORS.find(c => c.value === value)?.name || 'Custom'}
            </span>
            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
              {value}
            </code>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
