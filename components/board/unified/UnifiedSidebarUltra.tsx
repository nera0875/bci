'use client'

import { useState } from 'react'
import {
  Brain, FileText, Zap, BarChart3, Settings,
  ChevronLeft, ChevronRight, Menu, Search,
  Bell, Sparkles, Database, Shield, TrendingUp,
  Layers, GitBranch, Activity, Target, Lightbulb,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

type Section = 'memory' | 'rules' | 'optimization' | 'analytics' | 'costs' | 'settings' | 'learning'

interface UnifiedSidebarUltraProps {
  activeSection: Section
  onSectionChange: (section: Section) => void
  collapsed: boolean
  onToggleCollapse: () => void
  pendingSuggestions: number
}

const sections = [
  {
    id: 'memory' as Section,
    name: 'Memory',
    shortName: 'Mem',
    icon: Brain,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500',
    description: 'Knowledge storage & organization',
    stats: { label: 'Items', value: 128 },
    subItems: [
      { name: 'Success', icon: Target, count: 42 },
      { name: 'Failed', icon: Activity, count: 18 },
      { name: 'Templates', icon: Layers, count: 68 }
    ]
  },
  {
    id: 'rules' as Section,
    name: 'Rules',
    shortName: 'Rules',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    description: 'AI behavior configuration',
    stats: { label: 'Active', value: 12 },
    subItems: [
      { name: 'Global', icon: Shield, count: 3 },
      { name: 'Folder', icon: GitBranch, count: 9 }
    ]
  },
  {
    id: 'optimization' as Section,
    name: 'Optimization',
    shortName: 'Opt',
    icon: Zap,
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500',
    description: 'AI-powered improvements',
    stats: { label: 'Pending', value: 0 },
    badge: 0,
    pulse: true,
    subItems: [
      { name: 'Suggestions', icon: Lightbulb, count: 0 },
      { name: 'Applied', icon: Sparkles, count: 0 }
    ]
  },
  {
    id: 'analytics' as Section,
    name: 'Analytics',
    shortName: 'Stats',
    icon: BarChart3,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500',
    description: 'Performance insights',
    stats: { label: 'Success Rate', value: '87%' },
    subItems: [
      { name: 'Patterns', icon: TrendingUp, count: 24 },
      { name: 'Reports', icon: Database, count: 6 }
    ]
  },
  {
    id: 'costs' as Section,
    name: 'Costs',
    shortName: 'Cost',
    icon: DollarSign,
    color: 'from-emerald-500 to-green-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500',
    description: 'API costs & savings',
    stats: { label: 'Saved', value: '$0' },
    subItems: []
  },
  {
    id: 'learning' as Section,
    name: 'Learning',
    shortName: 'Learn',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500',
    description: 'AI auto-reinforcement',
    stats: { label: 'Patterns', value: 0 },
    badge: 0,
    pulse: true,
    subItems: [
      { name: 'Suggestions', icon: Lightbulb, count: 0 },
      { name: 'Patterns', icon: TrendingUp, count: 0 }
    ]
  },
  {
    id: 'settings' as Section,
    name: 'Settings',
    shortName: 'Set',
    icon: Settings,
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500',
    description: 'Configuration & API keys',
    stats: { label: 'API', value: 'OK' },
    subItems: []
  }
]

export default function UnifiedSidebarUltra({
  activeSection,
  onSectionChange,
  collapsed,
  onToggleCollapse,
  pendingSuggestions
}: UnifiedSidebarUltraProps) {
  const [hoveredSection, setHoveredSection] = useState<Section | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Update optimization badge
  const sectionsWithBadge = sections.map(section => ({
    ...section,
    badge: section.id === 'optimization' ? pendingSuggestions : section.badge,
    stats: section.id === 'optimization'
      ? { ...section.stats, value: pendingSuggestions }
      : section.stats,
    subItems: section.id === 'optimization'
      ? section.subItems.map((item, idx) => ({
          ...item,
          count: idx === 0 ? pendingSuggestions : item.count
        }))
      : section.subItems
  }))

  const sidebarWidth = collapsed ? 'w-20' : 'w-80'

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 80 : 320 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col relative overflow-hidden",
        sidebarWidth
      )}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500 via-blue-500 to-cyan-500 animate-pulse" />
      </div>

      {/* Header */}
      <div className="relative p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Database size={16} className="text-white" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Navigation
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Quick search..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sectionsWithBadge.map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          const isHovered = hoveredSection === section.id

          return (
            <div key={section.id}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSectionChange(section.id)}
                onMouseEnter={() => setHoveredSection(section.id)}
                onMouseLeave={() => setHoveredSection(null)}
                className={cn(
                  "w-full relative rounded-xl transition-all duration-200",
                  isActive
                    ? `${section.bgColor} ${section.borderColor} border-2`
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-transparent",
                  collapsed ? "p-3" : "p-4"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Icon with gradient background when active */}
                    <div className={cn(
                      "relative rounded-lg p-2.5 transition-all",
                      isActive
                        ? `bg-gradient-to-br ${section.color} shadow-lg`
                        : "bg-gray-100 dark:bg-gray-800"
                    )}>
                      <Icon
                        size={20}
                        className={isActive ? "text-white" : "text-gray-600 dark:text-gray-400"}
                      />
                      {section.pulse && section.badge > 0 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </div>

                    {/* Text content */}
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="text-left"
                        >
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "font-semibold text-sm",
                              isActive
                                ? "text-gray-900 dark:text-gray-100"
                                : "text-gray-700 dark:text-gray-300"
                            )}>
                              {section.name}
                            </p>
                            {section.badge > 0 && (
                              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-medium">
                                {section.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {section.description}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Stats */}
                  <AnimatePresence>
                    {!collapsed && section.stats && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="text-right"
                      >
                        <p className="text-xs text-gray-500">{section.stats.label}</p>
                        <p className={cn(
                          "font-bold text-sm",
                          isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"
                        )}>
                          {section.stats.value}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className={cn(
                      "absolute left-0 top-0 bottom-0 w-1 rounded-full",
                      `bg-gradient-to-b ${section.color}`
                    )}
                  />
                )}

                {/* Hover effect */}
                {isHovered && !isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100/50 to-transparent dark:via-gray-800/50 rounded-xl pointer-events-none"
                  />
                )}
              </motion.button>

              {/* Sub-items */}
              <AnimatePresence>
                {!collapsed && isActive && section.subItems.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-12 mt-2 space-y-1"
                  >
                    {section.subItems.map((item) => {
                      const SubIcon = item.icon
                      return (
                        <div
                          key={item.name}
                          className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <SubIcon size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {item.count}
                          </span>
                        </div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <AnimatePresence mode="wait">
          {collapsed ? (
            <motion.button
              key="collapsed-menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mx-auto block"
            >
              <Menu size={20} className="text-gray-600 dark:text-gray-400" />
            </motion.button>
          ) : (
            <motion.div
              key="expanded-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <Bell size={16} />
                Notifications
                <span className="ml-auto px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-xs rounded">
                  3
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}