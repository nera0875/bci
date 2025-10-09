'use client'

import { NoteBlock as NoteBlockType } from '@/types/memory'
import { Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NoteBlockProps {
  block: NoteBlockType
  onEdit?: () => void
}

export function NoteBlock({ block, onEdit }: NoteBlockProps) {
  const variant = block.variant || 'info'

  const variantConfig = {
    info: {
      icon: Info,
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-blue-900 dark:text-blue-100'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
      border: 'border-yellow-200 dark:border-yellow-800',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      textColor: 'text-yellow-900 dark:text-yellow-100'
    },
    success: {
      icon: CheckCircle2,
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800',
      iconColor: 'text-green-600 dark:text-green-400',
      textColor: 'text-green-900 dark:text-green-100'
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-red-900 dark:text-red-100'
    }
  }

  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        config.bg,
        config.border,
        onEdit && 'cursor-pointer hover:shadow-sm transition-shadow'
      )}
      onClick={onEdit}
      onDoubleClick={onEdit}
    >
      <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.iconColor)} />
      <p className={cn('flex-1 text-sm leading-relaxed', config.textColor)}>
        {block.content}
      </p>
    </div>
  )
}
