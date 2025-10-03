'use client'

import { useState, useEffect } from 'react'
import { X, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import UnifiedSidebarUltra from './UnifiedSidebarUltra'
import MemorySection from './sections/MemoryPro'
import RulesSection from './sections/RulesCompact'
import OptimizationSection from './sections/OptimizationSection'
import AnalyticsSection from './sections/AnalyticsSection'
import CostsSection from './sections/CostsSection'
import SettingsSection from './sections/SettingsPro'

interface UnifiedBoardUltraProps {
  projectId: string
  projectName?: string
  isOpen: boolean
  onClose: () => void
}

type Section = 'memory' | 'rules' | 'optimization' | 'analytics' | 'costs' | 'settings'

export default function UnifiedBoardUltra({
  projectId,
  projectName = 'Project',
  isOpen,
  onClose
}: UnifiedBoardUltraProps) {
  const [activeSection, setActiveSection] = useState<Section>('memory')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [pendingSuggestions, setPendingSuggestions] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [quickAccessOpen, setQuickAccessOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadPendingSuggestions()
    }
  }, [isOpen, projectId])

  const loadPendingSuggestions = async () => {
    try {
      const response = await fetch(`/api/optimization/suggestions/count?projectId=${projectId}`)
      const data = await response.json()
      setPendingSuggestions(data.count || 0)
    } catch (error) {
      console.error('Error loading suggestions count:', error)
    }
  }

  if (!isOpen) return null

  const containerClass = isFullscreen
    ? "fixed inset-0 bg-white dark:bg-gray-900 z-50"
    : "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"

  const boardClass = isFullscreen
    ? "w-full h-full flex flex-col"
    : "bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-[1600px] h-[90vh] flex flex-col overflow-hidden"

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={containerClass}
      >
        <motion.div
          initial={isFullscreen ? {} : { scale: 0.95, opacity: 0 }}
          animate={isFullscreen ? {} : { scale: 1, opacity: 1 }}
          exit={isFullscreen ? {} : { scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className={boardClass}
        >
          {/* Enhanced Header - Softer Monochrome */}
          <div className="relative h-16 bg-[#2A2B32] flex items-center justify-between px-6 border-b border-[#40414F]">
            {/* Left section */}
            <div className="flex items-center gap-4">
              <div className="text-white">
                <h1 className="text-lg font-semibold flex items-center gap-2 text-[#ECECF1]">
                  Knowledge Management System
                  <span className="px-2 py-0.5 bg-[#40414F] rounded text-xs font-medium text-[#C5C5D2]">
                    v2.0
                  </span>
                </h1>
                <p className="text-xs text-[#9A9BAE]">{projectName}</p>
              </div>
            </div>

            {/* Center section - Quick Stats */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-[#9A9BAE]">Memory Items</p>
                <p className="text-sm font-semibold text-[#ECECF1]">128</p>
              </div>
              <div className="w-px h-8 bg-[#40414F]" />
              <div className="text-center">
                <p className="text-xs text-[#9A9BAE]">Active Rules</p>
                <p className="text-sm font-semibold text-[#ECECF1]">12</p>
              </div>
              <div className="w-px h-8 bg-[#40414F]" />
              <div className="text-center">
                <p className="text-xs text-[#9A9BAE]">Suggestions</p>
                <p className="text-sm font-semibold text-[#ECECF1]">{pendingSuggestions}</p>
              </div>
            </div>

            {/* Right section - Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-[#9A9BAE] hover:text-[#ECECF1] hover:bg-[#40414F]"
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-[#9A9BAE] hover:text-[#ECECF1] hover:bg-[#40414F]"
              >
                <X size={20} />
              </Button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Enhanced Sidebar */}
            <UnifiedSidebarUltra
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              pendingSuggestions={pendingSuggestions}
            />

            {/* Content Area - Optimized with persistent tabs */}
            <div className="flex-1 relative bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 overflow-hidden">
              {/* All sections mounted, only active one visible - instant switching */}
              <div className={cn("absolute inset-0 overflow-auto transition-opacity duration-200", activeSection === 'memory' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
                <MemorySection projectId={projectId} />
              </div>

              <div className={cn("absolute inset-0 overflow-auto transition-opacity duration-200", activeSection === 'rules' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
                <RulesSection projectId={projectId} />
              </div>

              <div className={cn("absolute inset-0 overflow-auto transition-opacity duration-200", activeSection === 'optimization' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
                <OptimizationSection
                  projectId={projectId}
                  onSuggestionProcessed={() => loadPendingSuggestions()}
                />
              </div>

              <div className={cn("absolute inset-0 overflow-auto transition-opacity duration-200", activeSection === 'analytics' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
                <AnalyticsSection projectId={projectId} />
              </div>

              <div className={cn("absolute inset-0 overflow-auto transition-opacity duration-200", activeSection === 'costs' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
                <CostsSection projectId={projectId} />
              </div>

              <div className={cn("absolute inset-0 overflow-auto transition-opacity duration-200", activeSection === 'settings' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')}>
                <SettingsSection
                  projectId={projectId}
                  projectName={projectName}
                />
              </div>
            </div>
          </div>

          {/* Footer Status Bar */}
          <div className="h-8 bg-gray-900 dark:bg-black flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-400">Connected</span>
              </div>
              <div className="text-xs text-gray-500">
                Last sync: Just now
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Remove shimmer animation as it's no longer needed