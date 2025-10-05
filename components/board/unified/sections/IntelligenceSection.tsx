'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import SuggestionsPanel from './intelligence/SuggestionsPanel'
import PatternsPanel from './intelligence/PatternsPanel'
import StatsPanel from './intelligence/StatsPanel'

interface IntelligenceSectionProps {
  projectId: string
}

export default function IntelligenceSection({ projectId }: IntelligenceSectionProps) {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'patterns' | 'stats'>('suggestions')

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              🧠 Intelligence System
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Suggestions automatiques, patterns détectés et métriques d'apprentissage
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
        <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-800 bg-white/30 dark:bg-gray-900/30">
          <TabsList className="bg-gray-100 dark:bg-gray-800">
            <TabsTrigger value="suggestions" className="gap-2">
              📋 Suggestions
            </TabsTrigger>
            <TabsTrigger value="patterns" className="gap-2">
              🎯 Patterns
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              📈 Stats
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="suggestions" className="h-full m-0">
            <SuggestionsPanel projectId={projectId} />
          </TabsContent>

          <TabsContent value="patterns" className="h-full m-0">
            <PatternsPanel projectId={projectId} />
          </TabsContent>

          <TabsContent value="stats" className="h-full m-0">
            <StatsPanel projectId={projectId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
