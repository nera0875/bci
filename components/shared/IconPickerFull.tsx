'use client'

import { useState, useMemo } from 'react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface IconPickerFullProps {
  value?: string // Icon name (ex: "Folder", "Shield", "Brain")
  onChange: (iconName: string) => void
  trigger?: React.ReactNode
  color?: string // Couleur de l'icône affichée
}

// Extraire TOUS les noms d'icônes Phosphor (9000+)
const ALL_PHOSPHOR_ICONS = Object.keys(PhosphorIcons).filter(
  key => typeof PhosphorIcons[key as keyof typeof PhosphorIcons] === 'function'
    && !key.includes('Icon') // Exclure les variants "Icon"
    && key !== 'IconContext'
)

export default function IconPickerFull({ value, onChange, trigger, color = 'currentColor' }: IconPickerFullProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Filtrer les icônes par recherche
  const filteredIcons = useMemo(() => {
    if (!search) return ALL_PHOSPHOR_ICONS.slice(0, 200) // Limit initial display

    const searchLower = search.toLowerCase()
    return ALL_PHOSPHOR_ICONS
      .filter(name => name.toLowerCase().includes(searchLower))
      .slice(0, 200) // Limit results to 200 for performance
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhosphorIcons.Sparkle size={20} className="text-gray-700 dark:text-gray-400" />
              Choose Icon - {ALL_PHOSPHOR_ICONS.length.toLocaleString()} icons available
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons... (ex: folder, shield, brain)"
              className="pl-9 pr-9"
              autoFocus
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
          <ScrollArea className="h-[500px]">
            {filteredIcons.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <PhosphorIcons.MagnifyingGlass size={48} className="mb-2 opacity-20" />
                <p className="text-sm">No icons found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="grid grid-cols-10 gap-2 p-2">
                {filteredIcons.map((iconName) => {
                  const Icon = PhosphorIcons[iconName as keyof typeof PhosphorIcons] as any
                  const isSelected = value === iconName

                  // Protection: Si l'icône n'existe pas, on skip
                  if (!Icon) return null

                  return (
                    <button
                      key={iconName}
                      onClick={() => {
                        onChange(iconName)
                        setOpen(false)
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-lg transition-all",
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
                      <span className={cn(
                        "text-[9px] mt-1 truncate w-full text-center",
                        isSelected
                          ? "text-white dark:text-gray-900"
                          : "text-gray-500 dark:text-gray-500"
                      )}>
                        {iconName}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Stats */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            {search ? (
              <>
                Showing {filteredIcons.length} of {ALL_PHOSPHOR_ICONS.length.toLocaleString()} icons
                {filteredIcons.length === 200 && ' (limited to 200 for performance)'}
              </>
            ) : (
              <>
                Showing first 200 of {ALL_PHOSPHOR_ICONS.length.toLocaleString()} icons - use search to find more
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
