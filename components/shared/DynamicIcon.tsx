'use client'

import * as PhosphorIcons from '@phosphor-icons/react'
import { Circle } from '@phosphor-icons/react'

interface DynamicIconProps {
  name: string // Icon name from Phosphor (ex: "Folder", "Shield")
  size?: number
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
  color?: string
  className?: string
}

export default function DynamicIcon({
  name,
  size = 20,
  weight = 'regular',
  color,
  className
}: DynamicIconProps) {
  // Récupérer l'icône dynamiquement depuis Phosphor
  const Icon = PhosphorIcons[name as keyof typeof PhosphorIcons] as any || Circle

  return (
    <Icon
      size={size}
      weight={weight}
      color={color}
      className={className}
    />
  )
}
