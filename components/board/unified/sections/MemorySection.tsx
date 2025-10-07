'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FactsMemoryViewPro from '@/components/memory/FactsMemoryViewPro'
import PatternsPanel from './intelligence/PatternsPanel'

interface MemorySectionProps {
  projectId: string
}

export default function MemorySectionNew({ projectId }: MemorySectionProps) {
  const [activeTab, setActiveTab] = useState('facts')

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        {/* Tabs navigation */}
        <div className="px-6 pt-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <TabsList className="grid w-full max-w-2xl grid-cols-2">
            <TabsTrigger value="facts" className="text-sm">
              📄 Facts
            </TabsTrigger>
            <TabsTrigger value="patterns" className="text-sm">
              🔍 Patterns
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="facts" className="h-full m-0 p-0">
            <FactsMemoryViewPro projectId={projectId} />
          </TabsContent>

          <TabsContent value="patterns" className="h-full m-0 p-0">
            <PatternsPanel projectId={projectId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
