'use client'

import { useState } from 'react'
import {
  Brain, FileText, Sparkles, BarChart3, Settings,
  ChevronLeft, ChevronRight, Folder, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface UnifiedSidebarProps {
  activeSection: string
  onSectionChange: (section: any) => void
  collapsed: boolean
  onToggleCollapse: () => void
  pendingSuggestions: number
}

const menuItems = [
  {
    id: 'memory',
    label: 'Memory',
    icon: Brain,
    description: 'Knowledge organization'
  },
  {
    id: 'rules',
    label: 'Rules',
    icon: FileText,
    description: 'AI instructions'
  },
  {
    id: 'optimization',
    label: 'Optimization',
    icon: Sparkles,
    description: 'Auto improvements',
    badge: true
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Learning metrics'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Configuration'
  }
]

export default function UnifiedSidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onToggleCollapse,
  pendingSuggestions
}: UnifiedSidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  return (
    <motion.div
      initial={{ width: 240 }}
      animate={{ width: collapsed ? 60 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col"
    >
      {/* Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 z-20 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {collapsed ? (
          <ChevronRight size={14} className="text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronLeft size={14} className="text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* Menu Items */}
      <div className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          const isHovered = hoveredItem === item.id
          const showBadge = item.badge && pendingSuggestions > 0

          return (
            <div
              key={item.id}
              className="relative px-2 mb-1"
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <button
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-white dark:hover:bg-gray-800",
                  isActive && "bg-white dark:bg-gray-800 shadow-sm",
                  !isActive && "hover:shadow-sm"
                )}
              >
                <div className="relative">
                  <Icon
                    size={20}
                    className={cn(
                      "transition-colors",
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-400"
                    )}
                  />
                  {showBadge && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>

                {!collapsed && (
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-sm font-medium transition-colors",
                          isActive
                            ? "text-gray-900 dark:text-gray-100"
                            : "text-gray-700 dark:text-gray-300"
                        )}
                      >
                        {item.label}
                      </span>
                      {showBadge && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                          {pendingSuggestions}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.description}
                    </span>
                  </div>
                )}
              </button>

              {/* Tooltip for collapsed state */}
              {collapsed && isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-full ml-2 top-0 z-30 bg-gray-900 dark:bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.label}</span>
                    {showBadge && (
                      <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {pendingSuggestions}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-300">{item.description}</span>
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom Section */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1 mb-1">
              <Zap size={12} />
              <span>AI-Powered</span>
            </div>
            <div>Auto-learning enabled</div>
          </div>
        </div>
      )}
    </motion.div>
  )
}