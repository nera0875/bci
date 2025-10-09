'use client'

import { useState, useMemo } from 'react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface IconPickerProps {
  value?: string // Icon name (ex: "Folder", "Shield", "Brain")
  onChange: (iconName: string) => void
  trigger?: React.ReactNode
  color?: string // Couleur de l'icône affichée
}

// Liste des icônes populaires Phosphor (triées par catégorie)
const POPULAR_ICONS = [
  // Files & Folders
  'Folder', 'FolderOpen', 'File', 'FileText', 'Files', 'Archive',
  // Security
  'Shield', 'ShieldCheck', 'ShieldWarning', 'Lock', 'LockKey', 'Key',
  // Tech & Code
  'Code', 'Terminal', 'Database', 'HardDrive', 'Cloud', 'CloudCheck',
  // Communication
  'ChatCircle', 'Envelope', 'Bell', 'Phone', 'VideoCamera', 'Broadcast',
  // UI Elements
  'Square', 'Circle', 'Triangle', 'Star', 'Heart', 'Flag',
  // Actions
  'Check', 'X', 'Plus', 'Minus', 'Gear', 'Wrench',
  // Navigation
  'ArrowRight', 'ArrowLeft', 'CaretRight', 'House', 'Compass', 'Target',
  // Business
  'Briefcase', 'Money', 'ChartLine', 'TrendUp', 'Percent', 'Receipt',
  // Objects
  'Lightbulb', 'Rocket', 'Crown', 'Fire', 'Lightning', 'Sparkle',
  // Nature
  'Tree', 'Plant', 'Sun', 'Moon', 'CloudRain', 'Snowflake',
  // People
  'User', 'Users', 'UserCircle', 'IdentificationCard', 'Skull', 'Smiley',
  // Media
  'Image', 'Camera', 'MusicNote', 'FilmReel', 'Play', 'Pause'
]

export default function IconPicker({ value, onChange, trigger, color = 'currentColor' }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Filtrer les icônes par recherche
  const filteredIcons = useMemo(() => {
    if (!search) return POPULAR_ICONS
    return POPULAR_ICONS.filter(name =>
      name.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  // Icône actuellement sélectionnée
  const SelectedIcon = value && PhosphorIcons[value as keyof typeof PhosphorIcons]
    ? PhosphorIcons[value as keyof typeof PhosphorIcons]
    : PhosphorIcons.Circle

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
        {trigger || <SelectedIcon size={20} color={color} weight="regular" />}
      </button>

      {/* Icon Picker Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhosphorIcons.Sparkle size={20} className="text-gray-700 dark:text-gray-400" />
              Choose Icon
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons..."
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Icons Grid */}
          <ScrollArea className="h-96">
            {filteredIcons.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <PhosphorIcons.MagnifyingGlass size={48} className="mb-2 opacity-20" />
                <p className="text-sm">No icons found</p>
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-2 p-2">
                {filteredIcons.map((iconName) => {
                  const Icon = PhosphorIcons[iconName as keyof typeof PhosphorIcons] as any
                  const isSelected = value === iconName

                  // Protection: Si l'icône n'existe pas, on skip
                  if (!Icon) {
                    console.warn(`IconPicker: Icon "${iconName}" not found in Phosphor Icons`)
                    return null
                  }

                  return (
                    <button
                      key={iconName}
                      onClick={() => {
                        onChange(iconName)
                        setOpen(false)
                      }}
                      className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-lg transition-all",
                        "hover:bg-gray-100 dark:hover:bg-gray-800",
                        isSelected && "bg-gray-900 dark:bg-gray-100"
                      )}
                      title={iconName}
                    >
                      <Icon
                        size={24}
                        weight="regular"
                        className={cn(
                          isSelected
                            ? "text-white dark:text-gray-900"
                            : "text-gray-700 dark:text-gray-400"
                        )}
                      />
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Stats */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            {filteredIcons.length} icons {search && `matching "${search}"`}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
