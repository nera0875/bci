'use client'

import IconPickerFull from './IconPickerFull'
import ColorPicker from './ColorPicker'
import DynamicIcon from './DynamicIcon'
import { cn } from '@/lib/utils'

interface IconColorPickerProps {
  icon: string // Icon name (ex: "Folder")
  color: string // Hex color (ex: "#6b7280")
  onIconChange: (icon: string) => void
  onColorChange: (color: string) => void
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

export default function IconColorPicker({
  icon,
  color,
  onIconChange,
  onColorChange,
  size = 'md',
  label,
  className
}: IconColorPickerProps) {
  const sizeMap = {
    sm: { icon: 16, container: 'gap-2' },
    md: { icon: 20, container: 'gap-3' },
    lg: { icon: 24, container: 'gap-4' }
  }

  return (
    <div className={cn('flex items-center', sizeMap[size].container, className)}>
      {label && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}

      <div className="flex items-center gap-2">
        {/* Icon Picker */}
        <IconPickerFull
          value={icon}
          onChange={onIconChange}
          color={color}
          trigger={
            <DynamicIcon
              name={icon}
              size={sizeMap[size].icon}
              color={color}
            />
          }
        />

        {/* Color Picker */}
        <ColorPicker
          value={color}
          onChange={onColorChange}
        />
      </div>

      {/* Preview */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <DynamicIcon name={icon} size={sizeMap[size].icon} color={color} />
        <span className="text-sm text-gray-600 dark:text-gray-400">{icon}</span>
      </div>
    </div>
  )
}
