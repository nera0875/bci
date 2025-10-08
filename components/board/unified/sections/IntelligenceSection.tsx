'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Brain, Shield, Sparkles, Lightbulb, BarChart3, FileCode } from 'lucide-react'
import MemorySection from './MemorySection'
import RulesCompactV3 from './RulesCompactV3'
import SystemPromptsSection from './SystemPromptsSection'
import SuggestionsPanelV2 from './intelligence/SuggestionsPanelV2'
import StatsPanel from './intelligence/StatsPanel'

interface IntelligenceSectionProps {
  projectId: string
}

export default function IntelligenceSection({ projectId }: IntelligenceSectionProps) {
  const [activeTab, setActiveTab] = useState('memory')

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        {/* Tabs navigation */}
        <div className="px-6 pt-6 pb-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Brain className="text-gray-700 dark:text-gray-400" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Intelligence Hub</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Memory, rules, prompts & insights</p>
            </div>
          </div>
          <TabsList className="grid w-full max-w-4xl grid-cols-5 shadow-sm">
            <TabsTrigger value="memory" className="text-sm flex items-center gap-2 data-[state=active]:shadow-sm">
              <Brain size={16} />
              Memory
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-sm flex items-center gap-2 data-[state=active]:shadow-sm">
              <Shield size={16} />
              Rules
            </TabsTrigger>
            <TabsTrigger value="prompts" className="text-sm flex items-center gap-2 data-[state=active]:shadow-sm">
              <FileCode size={16} />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="text-sm flex items-center gap-2 data-[state=active]:shadow-sm">
              <Lightbulb size={16} />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-sm flex items-center gap-2 data-[state=active]:shadow-sm">
              <BarChart3 size={16} />
              Stats
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="memory" className="h-full m-0 p-0">
            <MemorySection projectId={projectId} />
          </TabsContent>

          <TabsContent value="rules" className="h-full m-0 p-0">
            <RulesCompactV3 projectId={projectId} />
          </TabsContent>

          <TabsContent value="prompts" className="h-full m-0 p-0">
            <SystemPromptsSection projectId={projectId} />
          </TabsContent>

          <TabsContent value="suggestions" className="h-full m-0 p-0">
            <SuggestionsPanelV2 projectId={projectId} />
          </TabsContent>

          <TabsContent value="stats" className="h-full m-0 p-0">
            <StatsPanel projectId={projectId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
