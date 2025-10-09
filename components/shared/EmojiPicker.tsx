'use client'

/**
 * EmojiPicker - DEPRECATED, remplacé par IconPicker professionnel
 *
 * Ce composant est gardé pour compatibilité backward mais utilise
 * maintenant IconColorPicker (Phosphor icons) au lieu d'emojis
 */

import IconColorPicker from './IconColorPicker'

interface EmojiPickerProps {
  value: string // Maintenant: icon_name au lieu d'emoji
  onChange: (iconName: string) => void
  suggestions?: string[] // Ignoré (Phosphor a 9,000 icônes)
  size?: 'sm' | 'md' | 'lg'
  allowCustom?: boolean // Toujours true avec IconPicker
  className?: string
  // Nouveaux props pour couleur
  color?: string
  onColorChange?: (color: string) => void
}

/**
 * Composant de transition: ancien API emoji → nouveau système IconPicker
 *
 * AVANT: <EmojiPicker value="📁" onChange={setEmoji} />
 * APRÈS: <EmojiPicker value="Folder" onChange={setIcon} color="#6b7280" onColorChange={setColor} />
 */
export function EmojiPicker({
  value,
  onChange,
  size = 'md',
  className = '',
  color = '#6b7280',
  onColorChange
}: EmojiPickerProps) {

  // Si c'est un emoji (backward compat), convertir en icon_name
  const iconName = value.match(/[\u{1F300}-\u{1F9FF}]/u)
    ? 'Folder' // emoji détecté → default Folder
    : value    // déjà un icon_name

  return (
    <div className={className}>
      <IconColorPicker
        icon={iconName}
        color={color}
        onIconChange={onChange}
        onColorChange={onColorChange || (() => {})}
        size={size}
      />
    </div>
  )
}

// Export default pour compatibilité
export default EmojiPicker
