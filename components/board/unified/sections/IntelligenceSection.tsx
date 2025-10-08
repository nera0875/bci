'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Brain, Shield, Sparkles, Lightbulb, BarChart3 } from 'lucide-react'
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
        <div className="px-6 pt-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <TabsList className="grid w-full max-w-4xl grid-cols-5">
            <TabsTrigger value="memory" className="text-sm flex items-center gap-2">
              <Brain size={16} />
              Memory
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-sm flex items-center gap-2">
              <Shield size={16} />
              Rules
            </TabsTrigger>
            <TabsTrigger value="prompts" className="text-sm flex items-center gap-2">
              <Sparkles size={16} />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="text-sm flex items-center gap-2">
              <Lightbulb size={16} />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-sm flex items-center gap-2">
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
