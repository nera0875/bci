'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import UnifiedSidebar from './UnifiedSidebar'
import MemorySection from './sections/MemoryUltra'
import RulesSection from './sections/RulesUltra'
import OptimizationSection from './sections/OptimizationSection'
import AnalyticsSection from './sections/AnalyticsSection'
import SettingsSection from './sections/SettingsUltra'

interface UnifiedBoardProps {
  projectId: string
  projectName?: string
  isOpen: boolean
  onClose: () => void
}

type Section = 'memory' | 'rules' | 'optimization' | 'analytics' | 'settings'

export default function UnifiedBoard({
  projectId,
  projectName = 'Project',
  isOpen,
  onClose
}: UnifiedBoardProps) {
  const [activeSection, setActiveSection] = useState<Section>('memory')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [pendingSuggestions, setPendingSuggestions] = useState(0)

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[95vw] h-[90vh] flex overflow-hidden"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-10">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Knowledge Management System
              </h1>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {projectName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={20} />
            </Button>
          </div>

          {/* Main Content */}
          <div className="flex w-full h-full pt-14">
            {/* Sidebar */}
            <UnifiedSidebar
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              pendingSuggestions={pendingSuggestions}
            />

            {/* Content Area */}
            <div className="flex-1 bg-gray-50 dark:bg-gray-950 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeSection === 'memory' && (
                  <motion.div
                    key="memory"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <MemorySection projectId={projectId} />
                  </motion.div>
                )}

                {activeSection === 'rules' && (
                  <motion.div
                    key="rules"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <RulesSection projectId={projectId} />
                  </motion.div>
                )}

                {activeSection === 'optimization' && (
                  <motion.div
                    key="optimization"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <OptimizationSection
                      projectId={projectId}
                      onSuggestionProcessed={() => loadPendingSuggestions()}
                    />
                  </motion.div>
                )}

                {activeSection === 'analytics' && (
                  <motion.div
                    key="analytics"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <AnalyticsSection projectId={projectId} />
                  </motion.div>
                )}

                {activeSection === 'settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <SettingsSection
                      projectId={projectId}
                      projectName={projectName}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}