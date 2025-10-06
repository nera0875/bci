'use client'

import { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Edit2, Trash2, Copy, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DraggableItemProps {
  id: string
  icon?: string
  title: string
  subtitle?: string
  enabled?: boolean
  showToggle?: boolean
  showActions?: boolean
  customContent?: ReactNode
  className?: string

  // Callbacks
  onToggle?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
  onPreview?: (id: string) => void
}

export function DraggableItem({
  id,
  icon,
  title,
  subtitle,
  enabled = true,
  showToggle = false,
  showActions = true,
  customContent,
  className = '',
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  onPreview
}: DraggableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-gray-800",
        "hover:border-blue-300 dark:hover:border-blue-600 transition-all",
        enabled
          ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/20"
          : "border-gray-200 dark:border-gray-700",
        className
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex-shrink-0"
      >
        <GripVertical size={16} className="text-gray-400" />
      </div>

      {/* Toggle Checkbox */}
      {showToggle && onToggle && (
        <button
          onClick={() => onToggle(id)}
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
            enabled
              ? "border-blue-500 bg-blue-500"
              : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
          )}
        >
          {enabled && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      )}

      {/* Icon */}
      {icon && (
        <span className="text-xl flex-shrink-0">{icon}</span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {customContent || (
          <>
            <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {title}
            </div>
            {subtitle && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {subtitle}
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onPreview && (
            <button
              onClick={() => onPreview(id)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Preview"
            >
              <Eye size={14} />
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => onEdit(id)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Edit"
            >
              <Edit2 size={14} />
            </button>
          )}

          {onDuplicate && (
            <button
              onClick={() => onDuplicate(id)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Duplicate"
            >
              <Copy size={14} />
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
