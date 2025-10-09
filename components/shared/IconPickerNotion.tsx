'use client'

import { useState, useMemo } from 'react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { Search, X, Upload, Sparkle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import DynamicIcon from './DynamicIcon'

interface IconPickerNotionProps {
  value?: string // Icon name or emoji
  color?: string
  onChange: (icon: string) => void
  onColorChange?: (color: string) => void
  trigger?: React.ReactNode
}

// Comprehensive list of Phosphor icons (validated to exist in @phosphor-icons/react)
const PHOSPHOR_ICONS_LIST = [
  // Common
  'House', 'Folder', 'FolderOpen', 'File', 'FileText', 'Files', 'Shield', 'Lock', 'LockOpen', 'Key',
  'User', 'Users', 'UserCircle', 'UserPlus', 'Settings', 'Gear', 'Database', 'Cloud', 'CloudArrowDown', 'CloudArrowUp',

  // Communication
  'Bell', 'BellRinging', 'Chat', 'ChatCircle', 'Envelope', 'EnvelopeOpen', 'Phone', 'PhoneCall',

  // Time & Calendar
  'Calendar', 'CalendarBlank', 'Clock', 'Timer', 'Hourglass',

  // Actions
  'Target', 'Check', 'CheckCircle', 'X', 'XCircle', 'Plus', 'PlusCircle', 'Minus', 'MinusCircle',
  'Search', 'MagnifyingGlass', 'Filter', 'Funnel', 'Edit', 'Pencil', 'PencilSimple', 'Trash', 'TrashSimple',

  // Arrows & Navigation
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowsClockwise', 'CaretUp', 'CaretDown', 'CaretLeft', 'CaretRight',

  // Media & Files
  'Download', 'DownloadSimple', 'Upload', 'UploadSimple', 'Share', 'ShareNetwork', 'Link', 'LinkSimple',
  'Image', 'ImageSquare', 'Video', 'VideoCamera', 'Music', 'MusicNote', 'File', 'FilePdf', 'FileDoc',

  // Symbols & Icons
  'Heart', 'HeartStraight', 'Star', 'StarFour', 'Flag', 'FlagBanner', 'Tag', 'TagSimple', 'Bookmark', 'BookmarkSimple',

  // Objects & Tools
  'Book', 'BookOpen', 'Map', 'MapPin', 'Globe', 'GlobeHemisphereWest', 'Compass', 'CompassTool',
  'Brain', 'Lightning', 'Fire', 'Flame', 'Rocket', 'Trophy', 'Crown', 'Diamond',
  'Coin', 'Money', 'CreditCard', 'Wallet',

  // Charts & Data
  'ChartLine', 'ChartBar', 'ChartPie', 'TrendUp', 'TrendDown', 'Graph', 'Table',

  // Code & Tech
  'Code', 'CodeBlock', 'Terminal', 'TerminalWindow', 'Cpu', 'HardDrive', 'HardDrives',
  'Desktop', 'Monitor', 'Laptop', 'DeviceMobile', 'Devices',

  // Security & Warning
  'Warning', 'WarningCircle', 'Info', 'Question', 'ShieldCheck', 'ShieldWarning',

  // Business & Office
  'Briefcase', 'BriefcaseMetal', 'Package', 'Box', 'Archive', 'Folder', 'FolderNotch',

  // Social & Misc
  'ThumbsUp', 'ThumbsDown', 'Smiley', 'SmileyXEyes', 'EyeSlash', 'Eye',
  'GithubLogo', 'GoogleLogo', 'TwitterLogo', 'LinkedinLogo', 'FacebookLogo',

  // Layout & Design
  'Layout', 'Rows', 'Columns', 'GridFour', 'Sidebar', 'ListBullets', 'ListNumbers',

  // More common icons
  'Notebook', 'Note', 'StickyNote', 'Article', 'Newspaper', 'Certificate', 'Scroll',
  'Bug', 'GitBranch', 'GitCommit', 'GitPullRequest', 'GitMerge',
  'PaintBrush', 'Palette', 'CircleHalf', 'Moon', 'Sun', 'SunDim',
  'Play', 'Pause', 'Stop', 'Record', 'FastForward', 'Rewind',
  'SpeakerHigh', 'SpeakerLow', 'SpeakerSlash', 'Microphone', 'MicrophoneSlash',
  'Camera', 'CameraSlash', 'Screenshot', 'FilmSlate',
  'Wrench', 'Hammer', 'Screwdriver', 'Toolbox',
  'ShoppingCart', 'ShoppingBag', 'Storefront',
  'MapTrifold', 'Navigation', 'Airplane', 'Car', 'Bicycle', 'Train',
  'Atom', 'Molecule', 'TestTube', 'FlaskRound', 'Microscope',
  'GraduationCap', 'Student', 'Chalkboard', 'Exam',
  'Leaf', 'Tree', 'Plant', 'Flower',
  'Pizza', 'Coffee', 'Cookie', 'ForkKnife',
  'GameController', 'Dice', 'PuzzlePiece', 'Strategy'
]

// Use the comprehensive manually-curated list
const ICON_LIST = PHOSPHOR_ICONS_LIST.sort() // Alphabetical order

// Quick colors (style Notion)
const QUICK_COLORS = [
  { name: 'Gray', value: '#6b7280' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#10b981' }
]

// Emoji categories
const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙'],
  'Gestures': ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚'],
  'Objects': ['💼', '📁', '📂', '🗂️', '📅', '📆', '🗒️', '📝', '📊', '📈', '📉', '🔍', '🔎', '🔐', '🔒', '🔓', '🔑', '🗝️', '🔨', '⚙️'],
  'Symbols': ['✅', '❌', '⭐', '🎯', '🏆', '🎖️', '🏅', '🥇', '🥈', '🥉', '💎', '💰', '🔔', '🔕', '📢', '📣', '💡', '🔥', '⚡', '✨']
}

export default function IconPickerNotion({
  value,
  color = '#6b7280',
  onChange,
  onColorChange,
  trigger
}: IconPickerNotionProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedColor, setSelectedColor] = useState(color)
  const [recentIcons, setRecentIcons] = useState<string[]>([])

  // Detect if value is emoji or icon name
  const isEmoji = value && /\p{Emoji}/u.test(value) && value.length <= 4

  // Filter icons
  const filteredIcons = useMemo(() => {
    if (!search) {
      return ICON_LIST.slice(0, 200)
    }

    const searchLower = search.toLowerCase()
    return ICON_LIST
      .filter(name => name.toLowerCase().includes(searchLower))
      .slice(0, 200)
  }, [search])

  // Filter emojis
  const filteredEmojis = useMemo(() => {
    if (!search) return EMOJI_CATEGORIES

    const searchLower = search.toLowerCase()
    const filtered: Record<string, string[]> = {}

    Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
      const matches = emojis.filter(() => category.toLowerCase().includes(searchLower))
      if (matches.length > 0) {
        filtered[category] = matches
      }
    })

    return filtered
  }, [search])

  const handleIconSelect = (icon: string) => {
    onChange(icon)

    // Update recent icons
    setRecentIcons(prev => {
      const updated = [icon, ...prev.filter(i => i !== icon)]
      return updated.slice(0, 12) // Keep only 12 recent
    })

    setOpen(false)
  }

  const handleColorSelect = (newColor: string) => {
    setSelectedColor(newColor)
    if (onColorChange) {
      onColorChange(newColor)
    }
  }

  // Current icon component
  const CurrentIcon = () => {
    if (isEmoji) {
      return <span className="text-2xl">{value}</span>
    }

    if (value) {
      return <DynamicIcon name={value} size={24} color={selectedColor} />
    }

    return <Sparkle size={24} className="text-gray-400" />
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-700",
          "hover:border-gray-300 dark:hover:border-gray-600 transition-all hover:shadow-sm",
          "bg-white dark:bg-gray-800"
        )}
      >
        {trigger || <CurrentIcon />}
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0" aria-describedby="icon-picker-description">
          {/* Header with color picker */}
          <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CurrentIcon />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {isEmoji ? 'Emoji' : 'Icon'}
                  </h3>
                  <p id="icon-picker-description" className="text-xs text-gray-500">
                    {ICON_LIST.length.toLocaleString()} icons • {Object.values(EMOJI_CATEGORIES).flat().length} emojis
                  </p>
                </div>
              </div>

              {/* Quick Colors */}
              <div className="flex items-center gap-1.5">
                {QUICK_COLORS.map(({ name, value: colorValue }) => (
                  <button
                    key={colorValue}
                    onClick={() => handleColorSelect(colorValue)}
                    className={cn(
                      "w-7 h-7 rounded-md border-2 transition-all hover:scale-110",
                      selectedColor === colorValue
                        ? "border-gray-900 dark:border-gray-100 ring-2 ring-offset-1 ring-gray-400"
                        : "border-transparent hover:border-gray-300"
                    )}
                    style={{ backgroundColor: colorValue }}
                    title={name}
                  />
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrer..."
                className="pl-9 pr-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="icons" className="flex-1">
            <TabsList className="w-full justify-start rounded-none border-b border-gray-200 dark:border-gray-800 bg-transparent px-6">
              <TabsTrigger value="icons" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 dark:data-[state=active]:border-gray-100">
                Icônes
              </TabsTrigger>
              <TabsTrigger value="emoji" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 dark:data-[state=active]:border-gray-100">
                Emoji
              </TabsTrigger>
              <TabsTrigger value="upload" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 dark:data-[state=active]:border-gray-100">
                Charger
              </TabsTrigger>
            </TabsList>

            {/* Emoji Tab */}
            <TabsContent value="emoji" className="p-0 m-0">
              <ScrollArea className="h-[400px] px-6">
                <div className="py-4 space-y-6">
                  {Object.entries(filteredEmojis).map(([category, emojis]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        {category}
                      </h4>
                      <div className="grid grid-cols-10 gap-2">
                        {emojis.map((emoji, idx) => (
                          <button
                            key={`${emoji}-${idx}`}
                            onClick={() => handleIconSelect(emoji)}
                            className={cn(
                              "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
                              "hover:bg-gray-100 dark:hover:bg-gray-800",
                              value === emoji && "bg-gray-900 dark:bg-gray-100"
                            )}
                          >
                            <span className="text-2xl">{emoji}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Icons Tab */}
            <TabsContent value="icons" className="p-0 m-0">
              <ScrollArea className="h-[400px] px-6">
                <div className="py-4 space-y-6">
                  {/* Recent Icons */}
                  {recentIcons.length > 0 && !search && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Récentes
                      </h4>
                      <div className="grid grid-cols-10 gap-2">
                        {recentIcons.slice(0, 10).map((iconName) => (
                          <button
                            key={iconName}
                            onClick={() => handleIconSelect(iconName)}
                            className={cn(
                              "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
                              "hover:bg-gray-100 dark:hover:bg-gray-800",
                              value === iconName && "bg-gray-900 dark:bg-gray-100 ring-2 ring-gray-400"
                            )}
                            title={iconName}
                          >
                            <DynamicIcon
                              name={iconName}
                              size={20}
                              color={value === iconName ? '#fff' : selectedColor}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Icons */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                      {search ? `Résultats (${filteredIcons.length})` : 'Toutes les icônes'}
                    </h4>
                    {filteredIcons.length === 0 ? (
                      <p className="text-sm text-gray-400 py-8 text-center">
                        🔍 Aucune icône trouvée
                      </p>
                    ) : (
                      <div className="grid grid-cols-10 gap-2">
                        {filteredIcons.map((iconName) => {
                          const isSelected = value === iconName
                          return (
                            <button
                              key={iconName}
                              onClick={() => handleIconSelect(iconName)}
                              className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-lg transition-all",
                                "hover:bg-gray-100 dark:hover:bg-gray-800",
                                isSelected && "bg-gray-900 dark:bg-gray-100 ring-2 ring-gray-400"
                              )}
                              title={iconName}
                            >
                              <DynamicIcon
                                name={iconName}
                                size={20}
                                color={isSelected ? (document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff') : selectedColor}
                              />
                              <span className={cn(
                                "text-[8px] mt-0.5 truncate w-full text-center",
                                isSelected
                                  ? "text-white dark:text-gray-900 font-medium"
                                  : "text-gray-400"
                              )}>
                                {iconName}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Upload Tab */}
            <TabsContent value="upload" className="p-0 m-0">
              <div className="h-[400px] flex flex-col items-center justify-center px-6 text-center">
                <Upload size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Upload custom icon
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Supported formats: SVG, PNG, JPG (max 2MB)
                </p>
                <button className="px-4 py-2 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity">
                  Choose File
                </button>
                <p className="text-xs text-gray-400 mt-4">
                  Coming soon...
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <div>
              {search && (
                <span>Showing {filteredIcons.length} results</span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium"
            >
              Fermer
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
